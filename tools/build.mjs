import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const inputs = ['index.html', 'manifest.webmanifest', '_headers', 'robots.txt', 'src', 'public', 'THIRD_PARTY_NOTICES.md'];

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

async function fingerprintFiles(outputDir, files) {
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(toUrl(outputDir, file));
    hash.update(await readFile(file));
  }
  return hash.digest('hex');
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

  let files = (await collectFiles(outputDir)).sort((left, right) => left.localeCompare(right));
  const buildId = (await fingerprintFiles(outputDir, files)).slice(0, 12);
  const versionPath = resolve(outputDir, 'src/app/version.js');
  const versionSource = await readFile(versionPath, 'utf8');
  await writeFile(versionPath, versionSource.replace("APP_BUILD = 'development'", `APP_BUILD = '${buildId}'`), 'utf8');

  files = (await collectFiles(outputDir)).sort((left, right) => left.localeCompare(right));
  const cacheVersion = `cyber-divination-${(await fingerprintFiles(outputDir, files)).slice(0, 12)}`;
  const precache = files
    .filter((file) => toUrl(outputDir, file) !== '/_headers')
    .map((file) => toUrl(outputDir, file));
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
