import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const inputs = ['index.html', 'manifest.webmanifest', 'src', 'public', 'THIRD_PARTY_NOTICES.md'];

async function exists(path) {
  try { await stat(path); return true; } catch { return false; }
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(path));
    else if (entry.name !== 'sw.js') files.push(path);
  }
  return files;
}

function toUrl(outputDir, path) {
  return `/${relative(outputDir, path).split(sep).join('/')}`;
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

  const files = (await collectFiles(outputDir)).sort((left, right) => left.localeCompare(right));
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(toUrl(outputDir, file));
    hash.update(await readFile(file));
  }
  const cacheVersion = `cyber-divination-${hash.digest('hex').slice(0, 12)}`;
  const precache = files.map((file) => toUrl(outputDir, file));
  const template = await readFile(resolve(projectRoot, 'src/pwa/sw-template.js'), 'utf8');
  const worker = template
    .replace('__CACHE_VERSION__', cacheVersion)
    .replace('__PRECACHE__', JSON.stringify(precache, null, 2));
  await writeFile(resolve(outputDir, 'sw.js'), worker, 'utf8');

  return outputDir;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await buildProject();
}
