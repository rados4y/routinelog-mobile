import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, renameSync } from 'node:fs';

if (!process.env.EXPO_TOKEN)
  throw new Error('EXPO_TOKEN is required. Never commit the token.');
const project = JSON.parse(readFileSync('eas-project.json', 'utf8'));
if (project.projectId) {
  console.log('The project is already linked.');
} else {
  // EAS init can write a static app.json. Restore the dynamic config byte-for-byte afterwards.
  const original = readFileSync('app.json', 'utf8');
  renameSync('app.config.ts', 'app.config.ts.setup-backup');
  try {
    execFileSync('eas', ['init', '--force', '--non-interactive'], {
      stdio: 'inherit',
    });
    const configured = JSON.parse(readFileSync('app.json', 'utf8'));
    const projectId = configured.expo.extra?.eas?.projectId;
    if (!projectId)
      throw new Error('EAS init did not return a project identifier.');
    writeFileSync(
      'eas-project.json',
      `${JSON.stringify({ projectId }, null, 2)}\n`,
    );
  } finally {
    writeFileSync('app.json', original);
    renameSync('app.config.ts.setup-backup', 'app.config.ts');
  }
}
for (const channel of ['development', 'preview', 'production']) {
  // channel:view distinguishes an existing link; channel:create links to its namesake branch.
  try {
    execFileSync(
      'eas',
      ['channel:view', channel, '--json', '--non-interactive'],
      { stdio: 'pipe' },
    );
  } catch {
    execFileSync('eas', ['channel:create', channel, '--non-interactive'], {
      stdio: 'inherit',
    });
  }
}
