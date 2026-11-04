import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

// Verify Metro's actual Android output, rather than the TypeScript resolution or
// a mocked import. Metro checks source extensions before platform variants: a
// bridge.ts would shadow bridge.android.tsx and silently disable native widgets.
const directory = process.argv[2] ?? 'dist/_expo/static/js/android';
const sources = readdirSync(directory)
  .filter((file) => file.endsWith('.map'))
  .flatMap(
    (file) => JSON.parse(readFileSync(join(directory, file), 'utf8')).sources,
  );
for (const name of [
  'register.android.ts',
  'bridge.android.tsx',
  'TodayWidget.tsx',
]) {
  if (!sources.some((source) => source.endsWith(`/src/widgets/${name}`)))
    throw new Error(
      `Android export is missing the native widget module: ${name}`,
    );
}
for (const name of ['bridge.ts', 'bridge.tsx', 'register.ts']) {
  if (sources.some((source) => source.endsWith(`/src/widgets/${name}`)))
    throw new Error(
      `Android export incorrectly contains the widget fallback: ${name}`,
    );
}
console.log(
  'Android widget registration, bridge and renderer are bundled correctly.',
);
