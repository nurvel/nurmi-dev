import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

// Decode the checked-in 8-bit RGBA PNG without adding an image dependency.
function readPortrait() {
  const png = readFileSync("public/portrait-cutout.png");
  expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  expect([...png.subarray(24, 29)]).toEqual([8, 6, 0, 0, 0]);
  const chunks: Buffer[] = [];
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset);
    if (png.toString("ascii", offset + 4, offset + 8) === "IDAT") {
      chunks.push(png.subarray(offset + 8, offset + 8 + length));
    }
    offset += length + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks));
  const stride = width * 4;
  expect(raw.length).toBe(height * (stride + 1));
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    expect(filter).toBeLessThanOrEqual(4);
    for (let x = 0; x < stride; x++) {
      const index = y * stride + x;
      const left = x >= 4 ? pixels[index - 4] : 0;
      const up = y > 0 ? pixels[index - stride] : 0;
      const upperLeft = y > 0 && x >= 4 ? pixels[index - stride - 4] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      if (filter === 2) predictor = up;
      if (filter === 3) predictor = Math.floor((left + up) / 2);
      if (filter === 4) {
        const p = left + up - upperLeft;
        const dl = Math.abs(p - left);
        const du = Math.abs(p - up);
        const dul = Math.abs(p - upperLeft);
        predictor = dl <= du && dl <= dul ? left : du <= dul ? up : upperLeft;
      }
      pixels[index] = (raw[y * (stride + 1) + 1 + x] + predictor) & 255;
    }
  }
  return {
    width, height, pixels,
    rgba: (x: number, y: number) => [...pixels.subarray((y * width + x) * 4, (y * width + x + 1) * 4)],
  };
}

const portrait = readPortrait();

it("keeps facial highlights opaque and preserves their original photographic tones", () => {
  // Highlights previously had alpha 0, 34 or 117 and darkened with the page.
  for (const [x, y, grey] of [[850, 200, 254], [850, 250, 227], [850, 300, 237], [800, 300, 215]]) {
    expect(portrait.rgba(x, y), `face pixel ${x},${y}`).toEqual([grey, grey, grey, 255]);
  }
  for (const [x, y] of [[990, 610], [670, 730], [766, 994]]) {
    expect(portrait.rgba(x, y)[3], `body pixel ${x},${y}`).toBe(255);
  }
});

it("removes white-background contamination from the soft outer hair edge", () => {
  // This outer curl was RGB 207 with alpha 179: a bright halo on dark backgrounds.
  const [red, green, blue, alpha] = portrait.rgba(860, 20);
  const onDark = red * alpha / 255 + 36 * (1 - alpha / 255);
  expect(onDark).toBeLessThan(90);
  expect(red).toBeLessThan(140);
  expect([red, green, blue]).toEqual([red, red, red]);
  expect(alpha).toBeGreaterThan(0);
  expect(alpha).toBeLessThan(255);
});

it("removes enclosed studio-background pockets below the ear and along the right hair edge", () => {
  // These are background openings in the original photograph, not bright skin.
  // A previous interior-fill repair incorrectly made them fully opaque white.
  for (const [x, y] of [[739, 371], [751, 377], [1025, 101], [1031, 101]]) {
    expect(portrait.rgba(x, y)[3], `studio background ${x},${y}`).toBe(0);
  }
  // A fine mixed curl on the right remains, without a bright white matte.
  const [red, , , alpha] = portrait.rgba(1045, 185);
  expect(alpha).toBeGreaterThan(0);
  expect(alpha).toBeLessThan(255);
  expect(red * alpha / 255 + 36 * (1 - alpha / 255)).toBeLessThan(70);
});

it("preserves the bright forehead rather than colour-keying subject highlights", () => {
  expect(portrait.rgba(850, 100)).toEqual([242, 242, 242, 255]);
  expect(portrait.rgba(850, 120)).toEqual([250, 250, 250, 255]);
});

it("softens residual white hair highlights without making opaque curls transparent", () => {
  // A bright photographic hair strand was grey 237 before local highlight retouch.
  const [red, green, blue, alpha] = portrait.rgba(664, 274);
  expect(red).toBeLessThan(160);
  expect(red).toBeGreaterThan(80);
  expect([green, blue]).toEqual([red, red]);
  expect(alpha).toBe(255);
});

it("fades the two owner-marked lower hair highlights without removing opaque curls", () => {
  for (const [x, y] of [[755, 366], [996, 300]]) {
    const [red, green, blue, alpha] = portrait.rgba(x, y);
    expect(red, `marked hair ${x},${y}`).toBeLessThan(90);
    expect(red).toBeGreaterThan(40);
    expect([green, blue]).toEqual([red, red]);
    expect(alpha).toBe(255);
  }
});

it("retains the transparent background, soft hair edges and existing crop", () => {
  expect([portrait.width, portrait.height]).toEqual([1252, 1100]);
  expect(portrait.rgba(100, 500)[3]).toBe(0);
  expect(portrait.rgba(1000, 350)[3]).toBe(0);
  // Actual outer hair/silhouette pixels, not interior highlights.
  expect(portrait.rgba(860, 20)[3]).toBeGreaterThan(0);
  expect(portrait.rgba(860, 20)[3]).toBeLessThan(255);
});
