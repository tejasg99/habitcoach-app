/**
 * app.config.js
 *
 * Adds the one app.json value that cannot be written down there: where the
 * Firebase config file is. Everything else stays in app.json.
 *
 *  - On EAS, GOOGLE_SERVICES_JSON is a file variable: EAS writes the file and
 *    puts its path in the variable.
 *  - Locally, it is the gitignored google-services.json next to this file.
 *  - With neither (CI, a fresh clone), the key is left out and the app still
 *    runs, only without Android push.
 */

const fs = require('fs');
const path = require('path');

const LOCAL_FILE = './google-services.json';

module.exports = ({ config }) => {
  const googleServicesFile =
    process.env.GOOGLE_SERVICES_JSON || (fs.existsSync(path.join(__dirname, LOCAL_FILE)) ? LOCAL_FILE : undefined);
  if (!googleServicesFile) return config;
  return { ...config, android: { ...config.android, googleServicesFile } };
};
