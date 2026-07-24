import { createHash } from 'node:crypto';
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const vendorDir = join(projectRoot, 'src', 'vendor');
const packages = [
  {
    name: 'lunar-javascript',
    version: '1.7.7',
    url: 'https://registry.npmjs.org/lunar-javascript/-/lunar-javascript-1.7.7.tgz',
    sha512: 'u/KYiwPIBo/0bT+WWfU7qO1d+aqeB90Tuy4ErXenr2Gam0QcWeezUvtiOIyXR7HbVnW2I1DKfU0NBvzMZhbVQw=='
  },
  {
    name: '@freizl/yijing',
    version: '2.1.0',
    url: 'https://registry.npmjs.org/@freizl/yijing/-/yijing-2.1.0.tgz',
    sha512: 'Gn6lveP8MeYkBNZ/6LYRn83sQPSB04iYUBe9vtMqCA8tWSFjDMGJnRNwb2WivhMWWqwXw2OTMvIPMQ+FsimI6A=='
  }
];

async function downloadAndVerify(definition, directory) {
  const response = await fetch(definition.url);
  if (!response.ok) throw new Error(`${definition.name} download failed: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const digest = createHash('sha512').update(bytes).digest('base64');
  if (digest !== definition.sha512) throw new Error(`${definition.name} SHA-512 mismatch`);
  const archive = join(directory, `${definition.name.replace(/[^a-z0-9]+/gi, '-')}.tgz`);
  await writeFile(archive, bytes);
  return archive;
}

function extract(archive, directory) {
  const result = spawnSync('tar.exe', ['-xf', archive, '-C', directory], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || `tar failed for ${basename(archive)}`);
}

export async function vendorAssets() {
  const workspace = await mkdtemp(join(tmpdir(), 'cyber-vendor-'));
  const staging = join(workspace, 'staging');
  await mkdir(staging, { recursive: true });
  try {
    const lunarDir = join(workspace, 'lunar');
    const yijingDir = join(workspace, 'yijing');
    await mkdir(lunarDir); await mkdir(yijingDir);
    const lunarArchive = await downloadAndVerify(packages[0], workspace);
    const yijingArchive = await downloadAndVerify(packages[1], workspace);
    extract(lunarArchive, lunarDir);
    extract(yijingArchive, yijingDir);

    await cp(join(lunarDir, 'package', 'lunar.js'), join(staging, 'lunar.global.js'));
    await cp(join(lunarDir, 'package', 'lunar.js'), join(staging, 'lunar.cjs'));
    await cp(join(lunarDir, 'package', 'LICENSE'), join(staging, 'LICENSE-lunar-javascript'));
    await cp(join(yijingDir, 'package', 'zh-CN', '64gua.json'), join(staging, '64gua.json'));
    await cp(join(yijingDir, 'package', 'LICENSE'), join(staging, 'LICENSE-yijing'));

    const records = JSON.parse(await readFile(join(staging, '64gua.json'), 'utf8'));
    if (records.length !== 64 || new Set(records.map((record) => record.id)).size !== 64) {
      throw new Error('Yijing data integrity check failed');
    }

    await mkdir(vendorDir, { recursive: true });
    for (const file of ['lunar.global.js', 'lunar.cjs', 'LICENSE-lunar-javascript', '64gua.json', 'LICENSE-yijing']) {
      const destination = join(vendorDir, file);
      await rm(destination, { force: true });
      await cp(join(staging, file), destination, { force: true });
    }
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

if (process.argv[1] && process.argv[1].endsWith('vendor-assets.mjs')) await vendorAssets();
