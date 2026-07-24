import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildProject } from '../../tools/build.mjs';

test('buildProject copies the application shell', async () => {
  const outputDir = await mkdtemp(join(tmpdir(), 'cyber-divination-'));

  try {
    await buildProject({ outputDir });
    const rootFiles = await readdir(outputDir);
    assert.match(await readFile(join(outputDir, 'index.html'), 'utf8'), /赛博天师/);
    assert.match(await readFile(join(outputDir, 'manifest.webmanifest'), 'utf8'), /standalone/);
    assert.ok(rootFiles.includes('_headers'), '构建产物应包含 Cloudflare Pages 安全响应头');
    assert.ok(rootFiles.includes('robots.txt'), '构建产物应包含 robots.txt');

    const headers = await readFile(join(outputDir, '_headers'), 'utf8');
    assert.match(headers, /Content-Security-Policy:/);
    assert.match(headers, /frame-ancestors 'none'/);
    assert.match(headers, /style-src 'self'/);
    assert.doesNotMatch(headers, /unsafe-inline/);
    assert.match(headers, /Permissions-Policy:.*geolocation=\(self\)/);
    assert.match(await readFile(join(outputDir, 'robots.txt'), 'utf8'), /User-agent:\s*\*/);

    const version = await readFile(join(outputDir, 'src/app/version.js'), 'utf8');
    assert.match(version, /APP_VERSION = '1\.0\.0'/);
    assert.match(version, /APP_BUILD = '[a-f0-9]{12}'/);
    assert.doesNotMatch(version, /APP_BUILD = 'development'/);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});
