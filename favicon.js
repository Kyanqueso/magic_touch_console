// Builds an original fairy-wing favicon: white wings on the app's brand purple.
// No dependencies - PNG is encoded with the built-in zlib, then the PNGs are
// packed into a multi-size .ico.
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const OUT = process.argv[2] || '.';
const PURPLE = [0x81, 0x22, 0xE0];
const WHITE = [0xFF, 0xFF, 0xFF];

// --- shape definitions, in a 0..100 square -------------------------------

// The wand: a rectangle of half-width r along the segment x1,y1 -> x2,y2.
// Square ends, not rounded - t outside [0,1] is simply outside the shape.
const wand = (x1, y1, x2, y2, r) => ({ kind: 'wand', x1, y1, x2, y2, r });

function inWand(w, x, y) {
  const vx = w.x2 - w.x1;
  const vy = w.y2 - w.y1;
  const len2 = vx * vx + vy * vy;
  const t = ((x - w.x1) * vx + (y - w.y1) * vy) / len2;
  if (t < 0 || t > 1) return false;
  const dx = x - (w.x1 + t * vx);
  const dy = y - (w.y1 + t * vy);
  return dx * dx + dy * dy <= w.r * w.r;
}

// A four-point sparkle. |u|^p + |v|^p <= 1 with p below 1 bows the edges
// inward; smaller p means sharper points. Separate rx/ry stretch it along one
// axis and deg tilts it - equal radii, axis-aligned, gives the generic
// clip-art star, so each sparkle here is elongated and set at its own angle.
const star = (cx, cy, rx, ry, p, deg = 0) =>
  ({ kind: 'star', cx, cy, rx, ry, p, rad: (deg * Math.PI) / 180 });

function inStar(s, x, y) {
  const dx = x - s.cx;
  const dy = y - s.cy;
  const c = Math.cos(-s.rad);
  const sn = Math.sin(-s.rad);
  const u = Math.abs(dx * c - dy * sn) / s.rx;
  const v = Math.abs(dx * sn + dy * c) / s.ry;
  return Math.pow(u, s.p) + Math.pow(v, s.p) <= 1;
}

const inside = (sh, x, y) => (sh.kind === 'wand' ? inWand(sh, x, y) : inStar(sh, x, y));

// The wand is two bars with a gap, so a band of purple separates the tip from
// the shaft. It starts past the icon edge at 2,98 so the rounded-corner clip
// cuts it flush with the corner rather than leaving a sliver of background.
const FULL = [
  wand(2, 98, 39, 61, 7.5),   // shaft, clipped by the corner
  wand(42, 58, 49, 51, 7.5),  // tip, just off the shaft
  // Tall, sharp, each tilted differently so they scatter rather than repeat.
  star(66, 31, 16, 29, 0.42, 0),
  star(27, 31, 8, 14, 0.42, -18),
  star(77, 67, 6.5, 12, 0.42, 14),
];

// At 16px the small sparkles become stray dots, and a sparkle touching the
// wand tip just reads as a bulge on a stick. So: shorter wand, clear gap, and
// a fatter-armed sparkle (higher p) that survives being 5 pixels across.
// 32-48px: the tip gap is barely a pixel and smudges into a blob, and 0.42
// points thin out to nothing. Solid wand, chunkier sparkles.
const MID = [
  wand(2, 98, 48, 52, 8),
  star(66, 31, 18, 28, 0.56, 0),
  star(27, 31, 9.5, 15, 0.56, -18),
  star(77, 67, 8, 12.5, 0.56, 14),
];

// 16px: only the wand and one sparkle survive at all.
const SMALL = [
  wand(2, 98, 42, 58, 9),
  star(68, 31, 20, 30, 0.6),
];

function shapesFor(size) {
  if (size <= 20) return { shapes: SMALL, radius: 20 };
  if (size <= 64) return { shapes: MID, radius: 21 };
  return { shapes: FULL, radius: 22 };
}

function inRoundedSquare(x, y, r) {
  const nx = Math.min(x, 100 - x);
  const ny = Math.min(y, 100 - y);
  if (nx >= r || ny >= r) return nx >= 0 && ny >= 0;
  const dx = r - nx;
  const dy = r - ny;
  return dx * dx + dy * dy <= r * r;
}

function sample(x, y, shp) {
  if (!inRoundedSquare(x, y, shp.radius)) return null; // transparent
  return shp.shapes.some((sh) => inside(sh, x, y)) ? WHITE : PURPLE;
}

// --- rasterise with supersampling ---------------------------------------

function render(size) {
  const shp = shapesFor(size);
  const SS = 4;
  const px = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let pxi = 0; pxi < size; pxi++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = ((pxi + (sx + 0.5) / SS) / size) * 100;
          const y = ((py + (sy + 0.5) / SS) / size) * 100;
          const c = sample(x, y, shp);
          if (c) { r += c[0]; g += c[1]; b += c[2]; a += 255; }
        }
      }
      const n = SS * SS;
      const i = (py * size + pxi) * 4;
      // Un-premultiply so edge pixels keep their colour.
      const cov = a / n;
      px[i] = cov ? Math.round(r / (a / 255)) : 0;
      px[i + 1] = cov ? Math.round(g / (a / 255)) : 0;
      px[i + 2] = cov ? Math.round(b / (a / 255)) : 0;
      px[i + 3] = Math.round(cov);
    }
  }
  return px;
}

// --- PNG encoding --------------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function toPng(size, px) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- ICO packing ---------------------------------------------------------

function toIco(entries) {
  const dir = Buffer.alloc(6 + entries.length * 16);
  dir.writeUInt16LE(0, 0);
  dir.writeUInt16LE(1, 2); // type: icon
  dir.writeUInt16LE(entries.length, 4);
  let offset = dir.length;
  entries.forEach((e, i) => {
    const o = 6 + i * 16;
    dir[o] = e.size >= 256 ? 0 : e.size;
    dir[o + 1] = e.size >= 256 ? 0 : e.size;
    dir[o + 2] = 0;
    dir[o + 3] = 0;
    dir.writeUInt16LE(1, o + 4);   // planes
    dir.writeUInt16LE(32, o + 6);  // bpp
    dir.writeUInt32LE(e.png.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += e.png.length;
  });
  return Buffer.concat([dir, ...entries.map((e) => e.png)]);
}

// --- build ---------------------------------------------------------------

const sizes = [16, 32, 48, 256];
const entries = sizes.map((size) => ({ size, png: toPng(size, render(size)) }));

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'favicon.ico'), toIco(entries));
for (const e of entries) {
  fs.writeFileSync(path.join(OUT, `preview-${e.size}.png`), e.png);
}
// A big one purely to eyeball the shape.
fs.writeFileSync(path.join(OUT, 'preview-512.png'), toPng(512, render(512)));

console.log('favicon.ico  ', fs.statSync(path.join(OUT, 'favicon.ico')).size, 'bytes');
console.log('sizes        ', sizes.join(', '));
