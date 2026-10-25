import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

const channel = process.env.EAS_CHANNEL;
if (!['development', 'preview', 'production'].includes(channel))
  throw new Error('Invalid channel');
const runtime = JSON.parse(
  execFileSync(
    'npx',
    [
      '--no-install',
      'expo-updates',
      'runtimeversion:resolve',
      '--platform',
      'android',
    ],
    { encoding: 'utf8' },
  ),
).runtimeVersion;
const builds = JSON.parse(
  execFileSync(
    'eas',
    [
      'build:list',
      '--platform',
      'android',
      '--status',
      'finished',
      '--build-profile',
      channel,
      '--limit',
      '50',
      '--json',
      '--non-interactive',
    ],
    { encoding: 'utf8' },
  ),
);
const compatible = Boolean(
  runtime && builds.some((build) => build.runtimeVersion === runtime),
);
const message = compatible
  ? `Compatible Android runtime: ${runtime}. Publishing OTA.`
  : `OTA skipped: no finished ${channel} Android build matches runtime ${runtime}. Run Android native build for this profile; no APK is built automatically.`;
if (process.env.GITHUB_OUTPUT)
  appendFileSync(process.env.GITHUB_OUTPUT, `compatible=${compatible}\n`);
if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${message}\n`);
console.log(message);
