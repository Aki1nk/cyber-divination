import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const inputs = ['index.html', 'manifest.webmanifest', 'src', 'public', 'THIRD_PARTY_NOTICES.md'];

async function exists(path) {
  try { await stat(path); return true; } catch { return false; }
}

export async function buildProject({ outputDir = resolve(projectRoot, 'dist') } = {}) {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  for (const input of inputs) {
    const source = resolve(projectRoot, input);
    if (await exists(source)) {
      await cp(source, resolve(outputDir, input), { recursive: true, force: true });
    }
  }

  return outputDir;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await buildProject();
}
