/*
 * One-off icon generator — no external deps. Rasterizes a white heart on the
 * CoupleCare brand gradient and writes opaque PNGs used by the manifest +
 * apple-touch-icon. Run: `node scripts/generate-icons.cjs`
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const OUT = path.join(__dirname, "..", "public");

// CRC32 (PNG chunks)
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
};

// Encode RGB (opaque, color type 2) pixel buffer to PNG
const encodePng = (width, height, rgb) => {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  // raw scanlines with filter byte 0
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
};

// Implicit heart: inside when (x^2 + y^2 - 1)^3 - x^2 y^3 <= 0
const insideHeart = (x, y) => {
  const a = x * x + y * y - 1;
  return a * a * a - x * x * y * y * y <= 0;
};

const lerp = (a, b, t) => a + (b - a) * t;

// Brand gradient endpoints (top -> bottom)
const TOP = [255, 122, 163]; // #ff7aa3
const BOT = [227, 74, 120]; // #e34a78

const render = (N, heartRadiusFactor) => {
  const rgb = Buffer.alloc(N * N * 3);
  const S = 4; // supersampling per axis
  const cx = N / 2;
  const cy = N * 0.44; // nudge up so the heart reads as centered
  const R = N * heartRadiusFactor;

  for (let py = 0; py < N; py++) {
    for (let px = 0; px < N; px++) {
      let inside = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const fx = px + (sx + 0.5) / S;
          const fy = py + (sy + 0.5) / S;
          const nx = (fx - cx) / R;
          const ny = (cy - fy) / R + 0.25; // shift heart body to center
          if (insideHeart(nx, ny)) inside++;
        }
      }
      const t = py / (N - 1);
      const bg = [
        Math.round(lerp(TOP[0], BOT[0], t)),
        Math.round(lerp(TOP[1], BOT[1], t)),
        Math.round(lerp(TOP[2], BOT[2], t)),
      ];
      const frac = inside / (S * S);
      const idx = (py * N + px) * 3;
      // blend white heart over gradient by coverage
      rgb[idx] = Math.round(lerp(bg[0], 255, frac));
      rgb[idx + 1] = Math.round(lerp(bg[1], 255, frac));
      rgb[idx + 2] = Math.round(lerp(bg[2], 255, frac));
    }
  }
  return encodePng(N, N, rgb);
};

const targets = [
  { file: "icon-192.png", size: 192, r: 0.30 },
  { file: "icon-512.png", size: 512, r: 0.30 },
  { file: "apple-touch-icon.png", size: 180, r: 0.30 },
  // maskable: smaller heart so it survives the OS safe-zone crop
  { file: "icon-maskable-512.png", size: 512, r: 0.24 },
];

for (const t of targets) {
  const png = render(t.size, t.r);
  fs.writeFileSync(path.join(OUT, t.file), png);
  console.log(`wrote ${t.file} (${png.length} bytes)`);
}
