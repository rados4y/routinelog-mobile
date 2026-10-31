import { readFileSync, appendFileSync } from 'node:fs';
const { projectId } = JSON.parse(readFileSync('eas-project.json', 'utf8'));
const message = `Expo project: https://expo.dev/projects/${projectId}\n`;
console.log(message);
if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, message);
