/**
 * src/components/layout/CopyDebugInfo.tsx
 *
 * "Copy debug info" action (brief: "Debugging support"). Copies the latest
 * failed request's X-Request-ID, method, path, status and time, plus app
 * version and platform, so a bug report can be matched to the server logs.
 * Used on unexpected-error screens and in Settings.
 *
 * After a tap the label reads "Copied" for two seconds, so the user gets
 * feedback without a toast. The label lives inside the button, so a screen
 * reader announces the change too.
 */

import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { Copy } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { getLastFailedRequest } from '@/api/status';
import { Button, type ButtonProps } from '@/components/ui';
import { formatDebugInfo } from '@/lib/debugInfo';

/** How long "Copied" stays before the label goes back. */
const COPIED_MS = 2000;

type CopyDebugInfoProps = Pick<ButtonProps, 'variant' | 'size' | 'fullWidth' | 'style'>;

export function CopyDebugInfo({ variant = 'ghost', size = 'sm', ...rest }: CopyDebugInfoProps) {
  const [copied, setCopied] = useState(false);

  // Put the label back after a short moment; cleared if the screen unmounts.
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    const text = formatDebugInfo(getLastFailedRequest(), {
      appVersion: Constants.expoConfig?.version ?? null,
      platform: `${Platform.OS} ${String(Platform.Version)}`,
    });
    await Clipboard.setStringAsync(text);
    setCopied(true);
  };

  return (
    <Button
      label={copied ? 'Copied' : 'Copy debug info'}
      icon={Copy}
      variant={variant}
      size={size}
      onPress={() => void copy()}
      {...rest}
    />
  );
}
