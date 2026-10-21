/**
 * Generates the PWA icons.
 *
 *   npm run icons
 *
 * The icons are drawn in code so the repository needs no binary assets and the
 * mark always matches the "Y" monogram used in the interface.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(projectRoot, "public", "icons");

/* ── PNG encoding ─────────────────────────────────────────────────────────── */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([length, typeAndData, crc]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);

  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA
  header[10] = 0; // compression
  header[11] = 0; // filter
  header[12] = 0; // interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ── Drawing ─────────────────────────────────────────────────────────────── */

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(px - ax, py - ay);
  }

  let t = ((px - ax) * dx + (py - ay) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));

  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Is the normalised point inside the "Y" glyph? */
function insideGlyph(x, y) {
  const halfWidth = 0.085;

  const leftArm = distanceToSegment(x, y, 0.3, 0.24, 0.5, 0.55);
  const rightArm = distanceToSegment(x, y, 0.7, 0.24, 0.5, 0.55);
  const stem = distanceToSegment(x, y, 0.5, 0.52, 0.5, 0.79);

  return (
    leftArm <= halfWidth || rightArm <= halfWidth || stem <= halfWidth * 0.92
  );
}

function mix(a, b, t) {
  return Math.round(a + (b - a) * t);
}

/**
 * Draws the icon.
 *
 * `inset` shrinks the glyph so a maskable icon keeps its safe zone.
 */
function drawIcon(size, { inset = 0, rounded = true } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const samples = 3; // supersampling grid

  const scale = 1 - inset;
  const offset = inset / 2;

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let glyphHits = 0;
      let shapeHits = 0;

      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const ux = (px + (sx + 0.5) / samples) / size;
          const uy = (py + (sy + 0.5) / samples) / size;

          // Rounded square background.
          let inShape = true;
          if (rounded) {
            const radius = 0.22;
            const cx = Math.min(Math.max(ux, radius), 1 - radius);
            const cy = Math.min(Math.max(uy, radius), 1 - radius);
            inShape = Math.hypot(ux - cx, uy - cy) <= radius;
          }

          if (inShape) shapeHits += 1;

          const gx = (ux - offset) / scale;
          const gy = (uy - offset) / scale;

          if (gx >= 0 && gx <= 1 && gy >= 0 && gy <= 1 && insideGlyph(gx, gy)) {
            glyphHits += 1;
          }
        }
      }

      const total = samples * samples;
      const shapeAlpha = shapeHits / total;
      const glyphAlpha = glyphHits / total;

      // Background: a subtle diagonal gradient in near-black.
      const t = (px + py) / (2 * size);
      const bgR = mix(24, 63, t);
      const bgG = mix(24, 63, t);
      const bgB = mix(27, 70, t);

      let r = bgR;
      let g = bgG;
      let b = bgB;

      if (glyphAlpha > 0) {
        r = mix(r, 250, glyphAlpha);
        g = mix(g, 250, glyphAlpha);
        b = mix(b, 250, glyphAlpha);
      }

      const offsetIndex = (py * size + px) * 4;
      rgba[offsetIndex] = r;
      rgba[offsetIndex + 1] = g;
      rgba[offsetIndex + 2] = b;
      rgba[offsetIndex + 3] = Math.round(shapeAlpha * 255);
    }
  }

  return encodePng(size, size, rgba);
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  const icons = [
    { name: "icon-192.png", size: 192, options: {} },
    { name: "icon-512.png", size: 512, options: {} },
    { name: "icon-maskable-512.png", size: 512, options: { inset: 0.2 } },
    { name: "apple-touch-icon.png", size: 180, options: { rounded: false } },
  ];

  for (const icon of icons) {
    const png = drawIcon(icon.size, icon.options);
    await writeFile(path.join(outputDir, icon.name), png);
    console.log(`  wrote public/icons/${icon.name} (${icon.size}x${icon.size})`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
