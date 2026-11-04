import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';

let build;
try {
  const builds = JSON.parse(
    execFileSync(
      'eas',
      [
        'build:list',
        '--platform',
        'android',
        '--build-profile',
        'preview',
        '--status',
        'finished',
        '--limit',
        '1',
        '--json',
        '--non-interactive',
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    ),
  );
  build = builds[0];
} catch {
  throw new Error('Could not find a finished preview APK.');
}
const url = build?.artifacts?.buildUrl;
if (
  typeof url !== 'string' ||
  !/^https:\/\/expo\.dev\/artifacts\/eas\/[\w.-]+\.apk$/.test(url)
)
  throw new Error('No preview APK is available.');
const response = await fetch(url);
if (!response.ok) throw new Error(`APK download failed (${response.status}).`);
writeFileSync(
  '/tmp/routinelog-preview.apk',
  Buffer.from(await response.arrayBuffer()),
);
console.log(
  `Downloaded preview APK ${build.id}, app ${build.appVersion}, runtime ${build.runtime?.version}.`,
);
