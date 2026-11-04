import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

const profile = process.env.EAS_PROFILE || 'preview';
if (!['preview', 'development', 'production'].includes(profile))
  throw new Error('Invalid EAS profile');
let builds;
try {
  builds = JSON.parse(
    execFileSync(
      'eas',
      [
        'build:list',
        '--platform',
        'android',
        '--build-profile',
        profile,
        '--limit',
        '5',
        '--json',
        '--non-interactive',
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    ),
  );
} catch {
  throw new Error(
    'Could not read Expo build status. Check the Actions Expo connection and try again.',
  );
}
// Never emit raw API data, credentials, environment values, or signed log URLs.
const result = builds.map((build) => ({
  id: build.id,
  status: build.status,
  profile,
  commit: build.gitCommitHash ?? null,
  createdAt: build.createdAt,
  updatedAt: build.updatedAt,
  completedAt: build.completedAt ?? null,
  queueTime: build.metrics?.buildQueueTime ?? null,
  duration: build.metrics?.buildDuration ?? null,
  errorCode: build.error?.errorCode ?? null,
  runtimeVersion: build.runtime?.version ?? null,
  appVersion: build.appVersion ?? null,
  appBuildVersion: build.appBuildVersion ?? null,
  artifact: /^https:\/\/expo\.dev\/artifacts\/eas\/[\w.-]+\.apk$/.test(
    build.artifacts?.buildUrl ?? '',
  )
    ? build.artifacts.buildUrl
    : null,
}));
const report = JSON.stringify(result, null, 2);
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `## Expo Android build status\n\n\`\`\`json\n${report}\n\`\`\`\n`,
  );
