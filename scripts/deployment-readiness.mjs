import { readFileSync, appendFileSync } from 'node:fs';

const { projectId } = JSON.parse(readFileSync('eas-project.json', 'utf8'));
const channel =
  process.env.EVENT_NAME === 'pull_request'
    ? 'preview'
    : process.env.REF_NAME === 'main'
      ? 'production'
      : 'development';
const reason =
  process.env.IS_FORK === 'true'
    ? 'Fork PR: deployment skipped.'
    : !process.env.EXPO_TOKEN
      ? 'Deployment skipped: EXPO_TOKEN is not configured. All quality checks passed.'
      : !projectId
        ? 'Deployment skipped: run Link Expo project to create/link the EAS project.'
        : '';
if (process.env.GITHUB_OUTPUT)
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `enabled=${!reason}\nchannel=${channel}\n`,
  );
if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `${reason || `EAS channel: ${channel}`}\n`,
  );
console.log(reason || `Deployment configured for ${channel}.`);
