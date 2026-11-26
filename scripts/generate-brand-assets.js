/**
 * scripts/generate-brand-assets.js
 *
 * Draws the "HC" monogram and writes every icon and splash PNG the app uses.
 * Run it again after changing the colours or the shape:
 *
 *   node scripts/generate-brand-assets.js
 *
 * No dependencies: the letters are simple geometric strokes (capsules and an
 * arc with round ends, like the app's pill shapes), drawn with a signed
 * distance function so the edges are smoothly anti-aliased at any size, and
 * the PNG files are encoded with Node's built-in zlib.
 *
 * Colours come from src/theme/tokens.ts (the default Sage accent):
 *   light bg     #F7F5F2   neutral `bg`, light mode
 *   sage         #2F7D5B   `accent`, light mode (letters on the light icon)
 *   sage (dark)  #6CC49A   `accent`, dark mode (letters on the dark splash)
 *   white        #FFFFFF   monochrome and notification icons (Android tints them)
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'assets', 'images');

const COLORS = {
  bg: [0xf7, 0xf5, 0xf2],
  sage: [0x2f, 0x7d, 0x5b],
  sageDark: [0x6c, 0xc4, 0x9a],
  white: [0xff, 0xff, 0xff],
};

// ---------------------------------------------------------------------------
// The monogram, in its own units: cap height 100, stroke 22 (round ends).
// Its bounding box is 0..192 wide and 0..100 tall.
// ---------------------------------------------------------------------------

const STROKE = 22;
const R = STROKE / 2; // half the stroke: how far the shape reaches from its centre line
const MONO_W = 192;
const MONO_H = 100;

// H: two upright strokes and a crossbar, drawn along their centre lines.
const H_SEGMENTS = [
  [11, 11, 11, 89], // left upright
  [65, 11, 65, 89], // right upright
  [11, 50, 65, 50], // crossbar
];

// C: a ring open on the right, centred 16 units after the H.
const C_CENTER = [142, 50];
const C_RADIUS = 50 - R; // centre-line radius, so the outside edge is 50 (same height as the H)
const C_GAP = (44 * Math.PI) / 180; // half the opening angle, measured from the 3 o'clock direction

/** Distance from point p to segment ab. */
function segmentDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Signed distance to the monogram, in monogram units (negative = inside). */
function monogramDistance(x, y) {
  let d = Infinity;
  for (const [ax, ay, bx, by] of H_SEGMENTS) d = Math.min(d, segmentDistance(x, y, ax, ay, bx, by) - R);

  const [cx, cy] = C_CENTER;
  const angle = Math.atan2(y - cy, x - cx); // 0 = right, positive = down
  if (Math.abs(angle) >= C_GAP) {
    // On the drawn part of the ring: distance to the circle line.
    d = Math.min(d, Math.abs(Math.hypot(x - cx, y - cy) - C_RADIUS) - R);
  } else {
    // In the opening: distance to the nearer round end.
    for (const sign of [-1, 1]) {
      const ex = cx + C_RADIUS * Math.cos(sign * C_GAP);
      const ey = cy + C_RADIUS * Math.sin(sign * C_GAP);
      d = Math.min(d, Math.hypot(x - ex, y - ey) - R);
    }
  }
  return d;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/**
 * Renders the monogram into a size x size image.
 *  width:      how wide the monogram is drawn, in pixels (centred)
 *  ink:        letter colour [r, g, b]
 *  background: [r, g, b] for an opaque image, or null for transparent
 */
function render({ size, width, ink, background }) {
  const scale = width / MONO_W; // pixels per monogram unit
  const left = (size - MONO_W * scale) / 2;
  const top = (size - MONO_H * scale) / 2;
  const channels = background ? 3 : 4;
  const pixels = Buffer.alloc(size * size * channels);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      // Sample at the pixel centre; distance converted to pixels.
      const d = monogramDistance((px + 0.5 - left) / scale, (py + 0.5 - top) / scale) * scale;
      const coverage = Math.max(0, Math.min(1, 0.5 - d)); // 1 inside, 0 outside, smooth across the edge
      const i = (py * size + px) * channels;
      if (background) {
        for (let c = 0; c < 3; c++) pixels[i + c] = Math.round(background[c] + (ink[c] - background[c]) * coverage);
      } else {
        pixels[i] = ink[0];
        pixels[i + 1] = ink[1];
        pixels[i + 2] = ink[2];
        pixels[i + 3] = Math.round(255 * coverage);
      }
    }
  }
  return { size, channels, pixels };
}

// ---------------------------------------------------------------------------
// Minimal PNG encoder (8-bit RGB or RGBA, no interlacing)
// ---------------------------------------------------------------------------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng({ size, channels, pixels }) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0); // width
  header.writeUInt32BE(size, 4); // height
  header[8] = 8; // bits per channel
  header[9] = channels === 4 ? 6 : 2; // colour type: 6 = RGBA, 2 = RGB
  // compression, filter and interlace stay 0

  // Each row starts with filter type 0 (none).
  const rowLength = size * channels;
  const raw = Buffer.alloc((rowLength + 1) * size);
  for (let y = 0; y < size; y++) pixels.copy(raw, y * (rowLength + 1) + 1, y * rowLength, (y + 1) * rowLength);

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// The files
// ---------------------------------------------------------------------------

// Adaptive icons: Android masks the 1024 canvas to a shape and only promises the
// central 66% circle (676 px). The monogram's diagonal must fit inside it:
// at 520 px wide it is 520 x 271, diagonal about 586 px.
const ADAPTIVE_WIDTH = 520;

const ASSETS = [
  // App icon (iOS, older Androids, stores): opaque, light background, Sage letters.
  { file: 'icon.png', size: 1024, width: 600, ink: COLORS.sage, background: COLORS.bg },
  // Adaptive icon layers. The background is the `backgroundColor` in app.json (#F7F5F2).
  { file: 'android-icon-foreground.png', size: 1024, width: ADAPTIVE_WIDTH, ink: COLORS.sage, background: null },
  // Android 13 themed icon: one colour on transparent, the system recolours it.
  { file: 'android-icon-monochrome.png', size: 1024, width: ADAPTIVE_WIDTH, ink: COLORS.white, background: null },
  // Splash marks, light and dark, on transparent (the splash colour comes from app.json).
  { file: 'splash-icon.png', size: 1024, width: 960, ink: COLORS.sage, background: null },
  { file: 'splash-icon-dark.png', size: 1024, width: 960, ink: COLORS.sageDark, background: null },
  // Notification icon: Android needs a white shape on transparent; 96 px is the
  // xxxhdpi size of the 24 dp status bar icon.
  { file: 'notification-icon.png', size: 96, width: 84, ink: COLORS.white, background: null },
];

for (const asset of ASSETS) {
  const png = encodePng(render(asset));
  fs.writeFileSync(path.join(OUT, asset.file), png);
  console.log(`wrote assets/images/${asset.file} (${asset.size} px, ${Math.round(png.length / 1024)} KB)`);
}
