// "THE WORLD IN ONE DAY" — a newspaper front page summing up the world's
// news of Tuesday 24 November 2026, drawn as one 1024x1024 PNG.
//
// The program writes /output/entry.png (or $MAKEFUN_OUTPUT_DIR/entry.png).
// Node 22 standard library only: no network, no dependencies, no clock,
// no randomness. The same run always produces the same bytes.
//
// Final build, written in this session: the day's news re-checked at
// ~07:45 UTC (Reuters, AP, Arab News, ApexWire, Daily Summary). The lead
// is still Nvidia/Huang; the panels now carry the ICJ's first genocide
// ruling against a state, Kyiv's ship strikes and call for talks, NATO's
// space warning, Australia's tech fines, the two states suing SpaceX
// over Grok, and the US-drone-aided capture of El Chapo Isidro.

import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

// ------------------------------------------------------------ the canvas

const W = 1024;
const H = 1024;

type RGB = [number, number, number];

const PAPER: RGB = [248, 243, 232];
const INK: RGB = [22, 22, 22];
const GREY: RGB = [112, 107, 96];
const RED: RGB = [164, 24, 34];
const NAVY: RGB = [28, 74, 132];
const TEAL: RGB = [13, 108, 103];
const GOLD: RGB = [178, 126, 24];
const GREEN: RGB = [45, 108, 57];
const DARK: RGB = [40, 40, 46];
const SKY: RGB = [213, 230, 241];
const CREAM: RGB = [233, 221, 197];
const WHITE: RGB = [255, 255, 255];

const px = new Uint8Array(W * H * 3);

// Scenes are clipped to their own band, so no drawing can ever bleed
// into the text below the picture.
let clipX0 = 0;
let clipY0 = 0;
let clipX1 = W;
let clipY1 = H;

function setClip(x0: number, y0: number, x1: number, y1: number): void {
  clipX0 = x0;
  clipY0 = y0;
  clipX1 = x1;
  clipY1 = y1;
}

function clearClip(): void {
  clipX0 = 0;
  clipY0 = 0;
  clipX1 = W;
  clipY1 = H;
}

function fill(c: RGB): void {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = c[0];
    px[i * 3 + 1] = c[1];
    px[i * 3 + 2] = c[2];
  }
}

function put(x: number, y: number, c: RGB): void {
  if (x < clipX0 || y < clipY0 || x >= clipX1 || y >= clipY1) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}

function box(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w);
  const y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) put(xx, yy, c);
  }
}

function border(x: number, y: number, w: number, h: number, c: RGB, t = 1): void {
  box(x, y, w, t, c);
  box(x, y + h - t, w, t, c);
  box(x, y, t, h, c);
  box(x + w - t, y, t, h, c);
}

function rule(x: number, y: number, w: number, c: RGB, t = 1): void {
  box(x, y, w, t, c);
}

function circle(cx: number, cy: number, r: number, c: RGB): void {
  for (let yy = cy - r; yy <= cy + r; yy++) {
    for (let xx = cx - r; xx <= cx + r; xx++) {
      const dx = xx - cx;
      const dy = yy - cy;
      if (dx * dx + dy * dy <= r * r) put(xx, yy, c);
    }
  }
}

// Filled triangle, scanline by scanline.
function triangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
  const top = Math.max(0, Math.min(y0, y1, y2));
  const bot = Math.min(H - 1, Math.max(y0, y1, y2));
  const edges: [number, number, number, number][] = [
    [x0, y0, x1, y1],
    [x1, y1, x2, y2],
    [x2, y2, x0, y0],
  ];
  for (let y = top; y <= bot; y++) {
    const xs: number[] = [];
    for (const [ax, ay, bx, by] of edges) {
      if ((ay <= y && by > y) || (by <= y && ay > y)) {
        xs.push(ax + ((y - ay) * (bx - ax)) / (by - ay));
      }
    }
    if (xs.length < 2) continue;
    const lo = Math.max(0, Math.ceil(Math.min(...xs)));
    const hi = Math.min(W - 1, Math.floor(Math.max(...xs)));
    for (let x = lo; x <= hi; x++) put(x, y, c);
  }
}

// Bresenham line, thickness t.
function seg(x0: number, y0: number, x1: number, y1: number, c: RGB, t = 1): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    box(x - Math.floor(t / 2), y - Math.floor(t / 2), t, t, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

// ------------------------------------------------------------ PNG writer

const CRC = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}

function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // 8-bit
  ihdr[9] = 2; // truecolour
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------ 5x7 bitmap type
//
// Standard 5x7 bitmap font: each glyph is seven rows of five bits, most
// significant bit leftmost. Lowercase folds to capitals, as a newspaper
// front page is set. Punctuation needed by the stories is included.

const FONT: Record<string, number[]> = {
  A: [14, 17, 17, 31, 17, 17, 17],
  B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14],
  D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31],
  F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15],
  H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14],
  J: [7, 2, 2, 2, 2, 18, 12],
  K: [17, 18, 20, 24, 20, 18, 17],
  L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17],
  N: [17, 25, 21, 19, 17, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13],
  R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30],
  T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 21, 10],
  X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4],
  Z: [31, 1, 2, 4, 8, 16, 31],
  "0": [14, 17, 19, 21, 25, 17, 14],
  "1": [4, 12, 4, 4, 4, 4, 14],
  "2": [14, 17, 1, 6, 8, 16, 31],
  "3": [31, 2, 4, 2, 1, 17, 14],
  "4": [2, 6, 10, 18, 31, 2, 2],
  "5": [31, 16, 30, 1, 1, 17, 14],
  "6": [14, 16, 16, 30, 17, 17, 14],
  "7": [31, 1, 2, 4, 8, 8, 8],
  "8": [14, 17, 17, 14, 17, 17, 14],
  "9": [14, 17, 17, 15, 1, 1, 14],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 12, 12],
  ",": [0, 0, 0, 0, 12, 4, 8],
  ":": [0, 12, 12, 0, 12, 12, 0],
  ";": [0, 12, 12, 0, 12, 4, 8],
  "!": [4, 4, 4, 4, 4, 0, 4],
  "?": [14, 17, 1, 2, 4, 0, 4],
  "'": [4, 4, 8, 0, 0, 0, 0],
  '"': [10, 10, 10, 0, 0, 0, 0],
  "-": [0, 0, 0, 31, 0, 0, 0],
  "\u2013": [0, 0, 0, 31, 0, 0, 0],
  "\u2014": [0, 0, 0, 31, 0, 0, 0],
  "(": [2, 4, 8, 8, 8, 4, 2],
  ")": [8, 4, 2, 2, 2, 4, 8],
  "/": [1, 1, 2, 4, 8, 16, 16],
  "&": [12, 18, 20, 8, 21, 18, 13],
  "%": [25, 25, 2, 4, 8, 19, 19],
  $: [4, 15, 20, 14, 5, 30, 4],
  "#": [10, 10, 31, 10, 31, 10, 10],
  "*": [4, 21, 14, 21, 4, 0, 0],
  "+": [0, 4, 4, 31, 4, 4, 0],
  "=": [0, 0, 31, 0, 31, 0, 0],
  "<": [2, 4, 8, 16, 8, 4, 2],
  ">": [8, 4, 2, 1, 2, 4, 8],
  "@": [14, 17, 23, 21, 23, 16, 14],
  _: [0, 0, 0, 0, 0, 0, 31],
  "[": [14, 8, 8, 8, 8, 8, 14],
  "]": [14, 2, 2, 2, 2, 2, 14],
  "\u2022": [0, 4, 14, 14, 14, 4, 0],
  "\u2018": [4, 4, 8, 0, 0, 0, 0],
  "\u2019": [4, 4, 8, 0, 0, 0, 0],
};

const GW = 5;
const GH = 7;

function glyph(ch: string): number[] {
  return FONT[ch.toUpperCase()] ?? FONT["?"];
}

function textW(text: string, s: number): number {
  return text.length * (GW + 1) * s - s;
}

function drawText(text: string, x: number, y: number, s: number, c: RGB): void {
  let cx = x;
  for (const ch of text) {
    const g = glyph(ch);
    for (let r = 0; r < GH; r++) {
      const row = g[r];
      for (let col = 0; col < GW; col++) {
        if (row & (1 << (GW - 1 - col))) box(cx + col * s, y + r * s, s, s, c);
      }
    }
    cx += (GW + 1) * s;
  }
}

function drawCentred(text: string, y: number, s: number, c: RGB, x0 = 0, x1 = W): void {
  drawText(text, x0 + Math.floor((x1 - x0 - textW(text, s)) / 2), y, s, c);
}

// Greedy word wrap to a maximum character count per line.
function wrap(text: string, maxChars: number): string[] {
  const out: string[] = [];
  let cur = "";
  for (const w of text.split(" ")) {
    if (cur === "") cur = w;
    else if (cur.length + 1 + w.length <= maxChars) cur += " " + w;
    else {
      out.push(cur);
      cur = w;
    }
  }
  if (cur !== "") out.push(cur);
  return out;
}

function drawWrapped(text: string, x: number, y: number, s: number, c: RGB, maxChars: number, maxLines: number, leading: number): number {
  const lines = wrap(text, maxChars).slice(0, maxLines);
  lines.forEach((ln, i) => drawText(ln, x, y + i * leading, s, c));
  return lines.length;
}

// ------------------------------------------------------------ illustrations
//
// One small flat scene per story, drawn into a band of (w x h) at (x, y).
// Each scene is drawn from scratch for this day's stories.

function sceneChip(x: number, y: number, w: number, h: number): void {
  // A chip on a board, with a rising market line above it.
  box(x, y, w, h, [232, 238, 228]);
  // rising bars, left to right
  const bars = [14, 22, 18, 30, 26, 40];
  bars.forEach((bh, i) => {
    box(x + 14 + i * 22, y + h - 16 - bh, 14, bh, i === bars.length - 1 ? GREEN : [110, 160, 120]);
  });
  // arrow over the bars
  seg(x + 16, y + h - 34, x + w - 22, y + 14, GREEN, 3);
  triangle(x + w - 34, y + 10, x + w - 14, y + 16, x + w - 26, y + 28, GREEN);
  // the chip itself, bottom right
  const cx = x + w - 96;
  const cy = y + h - 62;
  for (let i = 0; i < 5; i++) {
    box(cx - 8, cy + 6 + i * 8, 8, 3, GOLD);
    box(cx + 62, cy + 6 + i * 8, 8, 3, GOLD);
  }
  box(cx, cy, 62, 44, DARK);
  border(cx, cy, 62, 44, GOLD, 2);
  box(cx + 14, cy + 12, 34, 20, [70, 130, 90]);
  drawText("AI", cx + 22, cy + 16, 2, WHITE);
}

function sceneSeaDrone(x: number, y: number, w: number, h: number): void {
  // Night sea: a low drone boat speeds toward a warship on the horizon.
  box(x, y, w, h, [24, 44, 66]);
  circle(x + w - 28, y + 14, 8, [240, 228, 180]);
  // distant warship silhouette
  const sx = x + Math.floor(w * 0.52);
  const sy = y + Math.floor(h * 0.42);
  box(sx, sy, 74, 12, [12, 18, 28]);
  box(sx + 22, sy - 14, 8, 14, [12, 18, 28]);
  box(sx + 40, sy - 8, 6, 8, [12, 18, 28]);
  // fire on the ship
  triangle(sx + 10, sy, sx + 18, sy - 18, sx + 26, sy, [232, 122, 30]);
  triangle(sx + 14, sy, sx + 18, sy - 9, sx + 22, sy, [242, 202, 60]);
  circle(sx + 30, sy - 22, 7, [210, 210, 210]);
  circle(sx + 42, sy - 30, 9, [225, 225, 225]);
  // sea lines
  for (let i = 0; i < 4; i++) box(x + 10 + i * 30, y + h - 26 + (i % 2) * 8, 20, 2, [90, 130, 170]);
  // the drone boat, low and fast, with a wake
  const dx = x + 18;
  const dy = y + h - 34;
  triangle(dx, dy, dx + 44, dy, dx + 36, dy + 10, [200, 210, 220]);
  box(dx + 12, dy - 8, 10, 8, [200, 210, 220]);
  seg(dx - 12, dy + 12, dx - 2, dy + 6, WHITE, 2);
  seg(dx - 16, dy + 16, dx - 4, dy + 10, WHITE, 2);
}

function sceneScales(x: number, y: number, w: number, h: number): void {
  // A courthouse front with the scales of justice in its pediment.
  box(x, y, w, h, CREAM);
  const cx = x + Math.floor(w * 0.5);
  const top = y + 8;
  triangle(cx - 52, top + 22, cx + 52, top + 22, cx, top, [120, 40, 44]);
  box(cx - 52, top + 22, 104, 6, [120, 40, 44]);
  // the scales, hanging in the pediment
  seg(cx, top + 4, cx, top + 18, INK, 2);
  seg(cx - 20, top + 8, cx + 20, top + 8, INK, 2);
  seg(cx - 20, top + 8, cx - 26, top + 18, INK, 1);
  seg(cx - 20, top + 8, cx - 14, top + 18, INK, 1);
  seg(cx + 20, top + 8, cx + 14, top + 18, INK, 1);
  seg(cx + 20, top + 8, cx + 26, top + 18, INK, 1);
  triangle(cx - 30, top + 18, cx - 10, top + 18, cx - 20, top + 26, GOLD);
  triangle(cx + 10, top + 18, cx + 30, top + 18, cx + 20, top + 26, GOLD);
  // columns
  for (let i = 0; i < 4; i++) {
    const colx = cx - 48 + i * 32;
    box(colx, top + 32, 8, Math.floor(h * 0.42), [248, 244, 232]);
  }
  box(cx - 56, top + 32 + Math.floor(h * 0.42), 112, 6, [120, 40, 44]);
  // steps
  box(x + 16, y + h - 12, w - 32, 4, [120, 40, 44]);
  box(x + 24, y + h - 18, w - 48, 4, [150, 60, 60]);
}

function sceneSatellite(x: number, y: number, w: number, h: number): void {
  // Night sky over the curve of the Earth, a satellite crossing it.
  box(x, y, w, h, [16, 32, 56]);
  // stars
  const stars: [number, number][] = [
    [0.08, 0.16], [0.22, 0.08], [0.38, 0.2], [0.55, 0.1], [0.7, 0.22],
    [0.86, 0.12], [0.94, 0.3], [0.3, 0.34], [0.62, 0.36], [0.12, 0.44],
  ];
  for (const [fx, fy] of stars) circle(x + Math.floor(w * fx), y + Math.floor(h * fy), 2, WHITE);
  // the Earth's curve, rising from the bottom of the band
  circle(x + Math.floor(w * 0.5), y + h + 34, 48, [52, 120, 190]);
  // green landmass on the curve
  circle(x + Math.floor(w * 0.3), y + h - 4, 7, [70, 150, 90]);
  circle(x + Math.floor(w * 0.68), y + h - 2, 6, [70, 150, 90]);
  // orbit line, thin and pale
  seg(x + 10, y + h - 22, x + w - 10, y + 12, [120, 150, 190], 1);
  // the satellite: body with two solar panels, riding the orbit line
  const sx = x + Math.floor(w * 0.58);
  const sy = y + Math.floor(h * 0.3);
  box(sx - 34, sy - 3, 22, 6, [120, 150, 200]);
  box(sx - 10, sy - 6, 22, 12, [200, 210, 220]);
  border(sx - 10, sy - 6, 22, 12, [120, 130, 140], 1);
  box(sx + 12, sy - 3, 22, 6, [120, 150, 200]);
  seg(sx + 1, sy - 6, sx + 1, sy - 12, [200, 210, 220], 2);
  circle(sx + 1, sy - 13, 2, RED);
  // a small red warning dot on the far side of the orbit
  circle(x + Math.floor(w * 0.2), y + Math.floor(h * 0.62), 4, RED);
}

function scenePhone(x: number, y: number, w: number, h: number): void {
  // A phone with a shield on its screen: the regulator's fine.
  box(x, y, w, h, SKY);
  const px0 = x + Math.floor(w * 0.5) - 30;
  const py0 = y + 6;
  box(px0, py0, 60, h - 14, DARK);
  border(px0, py0, 60, h - 14, INK, 2);
  box(px0 + 4, py0 + 8, 52, h - 26, [240, 244, 248]);
  // shield
  const sx = px0 + 30;
  const sy = py0 + Math.floor((h - 26) * 0.42);
  triangle(sx - 16, sy - 10, sx + 16, sy - 10, sx, sy + 18, NAVY);
  box(sx - 16, sy - 14, 32, 8, NAVY);
  seg(sx - 7, sy - 2, sx - 2, sy + 4, WHITE, 2);
  seg(sx - 2, sy + 4, sx + 8, sy - 8, WHITE, 2);
  // fine bars under the shield
  box(px0 + 12, py0 + h - 30, 36, 5, RED);
  box(px0 + 12, py0 + h - 22, 24, 5, RED);
  // warning triangles at the sides
  triangle(x + 8, y + h - 20, x + 20, y + h - 20, x + 14, y + h - 38, GOLD);
  drawText("!", x + 12, y + h - 34, 2, INK);
  triangle(x + w - 20, y + h - 20, x + w - 8, y + h - 20, x + w - 14, y + h - 38, GOLD);
  drawText("!", x + w - 16, y + h - 34, 2, INK);
}

function sceneGrok(x: number, y: number, w: number, h: number): void {
  // A phone showing a portrait, crossed out in red: the images the
  // lawsuits say Grok made. A gavel rests below it.
  box(x, y, w, h, [238, 236, 228]);
  const px0 = x + Math.floor(w * 0.5) - 52;
  const py0 = y + 4;
  box(px0, py0, 56, h - 20, DARK);
  border(px0, py0, 56, h - 20, INK, 2);
  box(px0 + 4, py0 + 6, 48, h - 32, [240, 244, 248]);
  // red prohibition ring over the screen, then the portrait inside it
  const cx = px0 + 28;
  const cy = py0 + Math.floor((h - 20) * 0.5);
  circle(cx, cy, 30, RED);
  circle(cx, cy, 24, [240, 244, 248]);
  // portrait silhouette on the screen: head and shoulders
  const hx = px0 + 28;
  const hy = py0 + Math.floor((h - 32) * 0.36);
  circle(hx, hy, 9, [90, 110, 140]);
  triangle(hx - 14, py0 + h - 30, hx + 14, py0 + h - 30, hx, hy + 8, [90, 110, 140]);
  // the slash over the portrait
  seg(cx - 21, cy + 21, cx + 21, cy - 21, RED, 5);
  // the gavel, bottom right
  const gx = x + w - 66;
  const gy = y + h - 22;
  seg(gx, gy + 2, gx + 30, gy - 12, [120, 82, 40], 4);
  box(gx + 26, gy - 20, 18, 10, [90, 60, 30]);
  border(gx + 26, gy - 20, 18, 10, [60, 40, 20], 1);
  box(gx - 4, gy + 4, 42, 4, [90, 60, 30]);
}

function sceneDrone(x: number, y: number, w: number, h: number): void {
  // Desert dusk: a surveillance drone over the Sinaloa hills.
  box(x, y, w, h, [232, 222, 196]);
  circle(x + 26, y + 14, 9, [232, 170, 60]);
  // far hills
  triangle(x, y + h, x + Math.floor(w * 0.42), y + h - 26, x + Math.floor(w * 0.7), y + h, [190, 160, 120]);
  triangle(x + Math.floor(w * 0.5), y + h, x + Math.floor(w * 0.82), y + h - 20, x + w, y + h, [170, 140, 100]);
  box(x, y + h - 8, w, 8, [150, 120, 85]);
  // a cactus, left
  const kx = x + 22;
  const ky = y + h - 30;
  box(kx, ky - 14, 6, 22, GREEN);
  box(kx - 8, ky - 8, 6, 10, GREEN);
  box(kx - 8, ky - 10, 14, 4, GREEN);
  box(kx + 6, ky - 4, 6, 8, GREEN);
  box(kx + 6, ky - 6, 12, 4, GREEN);
  // the quadcopter drone, centre
  const dx = x + Math.floor(w * 0.58);
  const dy = y + Math.floor(h * 0.38);
  box(dx - 12, dy - 5, 24, 10, DARK);
  circle(dx, dy + 1, 3, RED);
  seg(dx - 12, dy - 2, dx - 26, dy - 10, DARK, 2);
  seg(dx + 12, dy - 2, dx + 26, dy - 10, DARK, 2);
  seg(dx - 12, dy + 2, dx - 26, dy + 10, DARK, 2);
  seg(dx + 12, dy + 2, dx + 26, dy + 10, DARK, 2);
  box(dx - 32, dy - 12, 12, 2, GREY);
  box(dx + 20, dy - 12, 12, 2, GREY);
  box(dx - 32, dy + 10, 12, 2, GREY);
  box(dx + 20, dy + 10, 12, 2, GREY);
  // its search beam down to the hills
  triangle(dx - 4, dy + 6, dx + 4, dy + 6, dx + 14, y + h - 10, [240, 220, 140]);
  triangle(dx - 4, dy + 6, dx + 4, dy + 6, dx - 6, y + h - 10, [240, 220, 140]);
}

// ------------------------------------------------------------ the stories
//
// Final selection, all first reported on Tuesday 24 November 2026
// (Reuters, AP, Arab News, ApexWire, Daily Summary — read 24 Nov 2026,
// ~07:45 UTC). The morning scaffold's lead (Nvidia) and three of its
// panels survive; NATO's space warning, the SpaceX/Grok lawsuits and the
// El Chapo Isidro capture replace the Poland jets, Gaza and Megaspeed
// panels, which move to the ticker. Nothing here is invented.

type Story = {
  kicker: string;
  headline: string;
  body: string;
  band: RGB;
  bandText: RGB;
  scene: (x: number, y: number, w: number, h: number) => void;
};

const LEAD: Story = {
  kicker: "UNITED STATES — MARKETS",
  headline: "HUANG IS BACK",
  body: "Nvidia reinstates Jensen Huang as CEO; shares close up 31% and the S&P 500 posts its best day since April 2025.",
  band: GREEN,
  bandText: PAPER,
  scene: sceneChip,
};

const STORIES: Story[] = [
  {
    kicker: "THE HAGUE — WORLD COURT",
    headline: "GENOCIDE, THE COURT RULES",
    body: "World court rules 9-6 that Myanmar committed genocide against the Rohingya — a first.",
    band: RED,
    bandText: PAPER,
    scene: sceneScales,
  },
  {
    kicker: "UKRAINE — KYIV",
    headline: "KYIV URGES TALKS",
    body: "Kyiv's drones hit two Russian ships off Libya; Zelensky urges four-party talks soon.",
    band: NAVY,
    bandText: PAPER,
    scene: sceneSeaDrone,
  },
  {
    kicker: "NATO — BRUSSELS",
    headline: "NATO VOWS TO DEFEND SPACE",
    body: "NATO vows to defend space as Russia may launch a nuclear-armed satellite in 60 days.",
    band: GOLD,
    bandText: INK,
    scene: sceneSatellite,
  },
  {
    kicker: "AUSTRALIA — SYDNEY",
    headline: "5% FINES FOR BIG TECH",
    body: "Tech firms face fines up to 5% of global revenue under Australia's internet safety bill.",
    band: TEAL,
    bandText: PAPER,
    scene: scenePhone,
  },
  {
    kicker: "USA — WASHINGTON",
    headline: "STATES SUE OVER GROK",
    body: "Two states sue SpaceX, alleging Grok made sexual images of minors.",
    band: DARK,
    bandText: PAPER,
    scene: sceneGrok,
  },
  {
    kicker: "MEXICO — SINALOA",
    headline: "DRUG LORD CAUGHT",
    body: "A US drone helped Mexico catch cartel boss El Chapo Isidro; 20 died in the firefight.",
    band: [120, 40, 44],
    bandText: PAPER,
    scene: sceneDrone,
  },
];

const TICKER =
  "ALSO TODAY \u2022 Megaspeed blacklisted \u2022 China sentences spy official to death \u2022 Russian jets enter Korean zone \u2022 Pentagon rebukes Canada \u2022 Congo bans cobalt \u2022 Medicare cuts drug prices 45%";

const SOURCES =
  "SOURCES: REUTERS, AP, ARAB NEWS, APEXWIRE, DAILY SUMMARY — 24 NOV 2026";

// ------------------------------------------------------------ the page

function drawMasthead(): void {
  drawCentred("TUESDAY, 24 NOVEMBER 2026 \u2022 THE WORLD IN ONE IMAGE", 28, 2, GREY);
  drawCentred("THE WORLD IN ONE DAY", 50, 7, INK);
  rule(28, 104, W - 56, INK, 3);
  rule(28, 110, W - 56, INK, 1);
  drawCentred("SEVEN STORIES THAT DEFINED TUESDAY", 120, 2, RED);
}

function drawLead(s: Story, x: number, y: number, w: number, h: number): void {
  box(x, y, w, h, PAPER);
  border(x, y, w, h, INK, 2);
  box(x + 2, y + 2, w - 4, 24, s.band);
  drawText(s.kicker, x + 14, y + 9, 2, s.bandText);
  // headline, two lines, left; illustration on the right
  drawWrapped(s.headline, x + 14, y + 38, 4, INK, 24, 2, 30);
  drawWrapped("SHARES SOAR 31%", x + 14, y + 98, 4, GREEN, 24, 1, 30);
  border(x + 640, y + 36, 314, 144, INK, 1);
  setClip(x + 641, y + 37, x + 641 + 312, y + 37 + 142);
  s.scene(x + 641, y + 37, 312, 142);
  clearClip();
  drawWrapped(s.body, x + 14, y + 140, 2, INK, 48, 3, 17);
}

function drawPanel(s: Story, x: number, y: number, w: number, h: number): void {
  box(x, y, w, h, PAPER);
  border(x, y, w, h, INK, 2);
  box(x + 2, y + 2, w - 4, 24, s.band);
  drawText(s.kicker, x + 12, y + 9, 2, s.bandText);
  drawWrapped(s.headline, x + 12, y + 36, 3, INK, 16, 2, 22);
  const sy = y + 88;
  border(x + 12, sy, w - 24, 72, INK, 1);
  setClip(x + 13, sy + 1, x + 13 + (w - 26), sy + 1 + 70);
  s.scene(x + 13, sy + 1, w - 26, 70);
  clearClip();
  drawWrapped(s.body, x + 12, sy + 82, 2, INK, 24, 4, 17);
}

function drawTicker(): void {
  const y = 916;
  box(28, y, W - 56, 62, INK);
  drawWrapped(TICKER, 40, y + 8, 2, PAPER, 78, 3, 17);
}

function drawFooter(): void {
  drawCentred(SOURCES, 994, 2, GREY);
}

function main(): void {
  fill(PAPER);
  drawMasthead();
  drawLead(LEAD, 28, 144, 968, 192);
  const pw = 314;
  const ph = 272;
  const xs = [28, 355, 682];
  const ys = [348, 632];
  for (let i = 0; i < 6; i++) {
    drawPanel(STORIES[i], xs[i % 3], ys[Math.floor(i / 3)], pw, ph);
  }
  drawTicker();
  drawFooter();

  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "entry.png");
  const png = encodePNG();
  fs.writeFileSync(outFile, png);
  console.log(`wrote ${outFile} (${png.length} bytes, ${W}x${H})`);
}

main();
