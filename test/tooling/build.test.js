import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildProject } from '../../tools/build.mjs';

test('buildProject copies the application shell', async () => {
  const outputDir = await mkdtemp(join(tmpdir(), 'cyber-divination-'));

  try {
    await buildProject({ outputDir });
    assert.match(await readFile(join(outputDir, 'index.html'), 'utf8'), /赛博天师/);
    assert.match(await readFile(join(outputDir, 'manifest.webmanifest'), 'utf8'), /standalone/);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});
