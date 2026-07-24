import { mkdir, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';

const COLORS = {
  ink: [7, 19, 17, 255],
  jade: [37, 74, 66, 255],
  gold: [230, 206, 139, 255],
  cinnabar: [169, 69, 55, 255]
};

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let current = value;
  for (let bit = 0; bit < 8; bit += 1) current = (current & 1) ? 0xedb88320 ^ (current >>> 1) : current >>> 1;
  return current >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function mix(start, end, ratio) {
  return start.map((value, index) => Math.round(value + (end[index] - value) * ratio));
}

function createIcon(size, safeScale = 1) {
  const pixels = Buffer.alloc(size * size * 4);
  const center = size / 2;
  const iconRadius = size * .34 * safeScale;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const distance = Math.hypot(x - size * .34, y - size * .24) / (size * .9);
      const color = mix(COLORS.jade, COLORS.ink, Math.min(1, distance));
      const offset = (y * size + x) * 4;
      pixels.set(color, offset);
    }
  }

  function setPixel(x, y, color) {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    pixels.set(color, (Math.floor(y) * size + Math.floor(x)) * 4);
  }

  function rect(left, top, width, height, color) {
    for (let y = Math.floor(top); y < Math.ceil(top + height); y += 1) {
      for (let x = Math.floor(left); x < Math.ceil(left + width); x += 1) setPixel(x, y, color);
    }
  }

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const radius = Math.hypot(x - center, y - center);
      if (Math.abs(radius - iconRadius) < Math.max(1, size * .008)) setPixel(x, y, COLORS.gold);
    }
  }

  const lineWidth = size * .36 * safeScale;
  const lineHeight = Math.max(3, size * .028 * safeScale);
  const startX = center - lineWidth / 2;
  const splitWidth = lineWidth * .42;
  const gap = lineWidth - splitWidth * 2;
  const positions = [-.22, -.13, -.04, .07, .16, .25];
  positions.forEach((offset, index) => {
    const top = center + size * offset * safeScale;
    if ([1, 3, 5].includes(index)) {
      rect(startX, top, splitWidth, lineHeight, COLORS.gold);
      rect(startX + splitWidth + gap, top, splitWidth, lineHeight, COLORS.gold);
    } else {
      rect(startX, top, lineWidth, lineHeight, COLORS.gold);
    }
  });
  const sealSize = size * .075 * safeScale;
  rect(center - sealSize / 2, center - sealSize / 2, sealSize, sealSize, COLORS.ink);
  rect(center - sealSize * .36, center - size * .008, sealSize * .72, size * .016, COLORS.gold);
  rect(center - size * .008, center - sealSize * .36, size * .016, sealSize * .72, COLORS.gold);
  const dotSize = size * .048 * safeScale;
  rect(center + iconRadius * .62, center + iconRadius * .62, dotSize, dotSize, COLORS.cinnabar);

  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const rowOffset = y * (size * 4 + 1);
    raw[rowOffset] = 0;
    pixels.copy(raw, rowOffset + 1, y * size * 4, (y + 1) * size * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

await mkdir('public/icons', { recursive: true });
await Promise.all([
  writeFile('public/icons/icon-192.png', createIcon(192)),
  writeFile('public/icons/icon-512.png', createIcon(512)),
  writeFile('public/icons/maskable-512.png', createIcon(512, .72))
]);
