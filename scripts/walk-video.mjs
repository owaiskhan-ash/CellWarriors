#!/usr/bin/env node
// Walk-on-stairs video: 2.5D animation, no video model involved.
//
//   stills  → walk-a/walk-b (chroma green) + canopy (black bg) keyed to RGBA
//   scene   → procedural perspective staircase projected from a real ground plane
//   motion  → stairs scroll exactly N steps per loop, so the loop is frame-perfect
//   encode  → libx264 mp4 + gif preview
//
// Requires `sharp` and an ffmpeg binary. They are resolved from SHARP_MODULE and
// FFMPEG_PATH so the repo does not have to carry either as a dependency:
//
//   SHARP_MODULE=/path/to/node_modules/sharp \
//   FFMPEG_PATH=/path/to/ffmpeg \
//   node scripts/walk-video.mjs
//
// Output: images/design/video/hotaru-walks-the-stairs.mp4 (+ .gif), frames in TMP.

import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_MODULE || 'sharp');
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
const SRC = join(ROOT, 'images/design/video');
const OUT = join(ROOT, 'images/design/video');
const TMP = process.env.FRAME_DIR || '/tmp/walkframes';

// ---------------------------------------------------------------- config ----
const W = 1920, H = 1080, FPS = 24, SECONDS = 8;
const FRAMES = FPS * SECONDS;                 // 192
const PREVIEW = process.env.PREVIEW === '1';   // render a few frames, skip encode
const PREVIEW_SET = [0, 6, 12, 18];
const CYCLE = 16;                             // walk cycle in frames; divides FRAMES so the loop closes
const STEPS_PER_LOOP = 16;                    // stairs scroll 16 steps per 8 s

const FEET_Y = 1006;                          // where her feet sit on screen
const BODY_PX = 800;                          // target on-screen body height
const HORIZON = 430;                          // eye level = the staircase's vanishing line
const K = 2200;                               // focal length in px
const CAM_H = 1.55;                           // camera height above the stair surface (m)
const RISER_H = 0.155;                        // riser height (m)
const DZ = 0.42;                              // going, i.e. tread depth (m)
const Z_BASE = 3.0;                           // distance to step n=0 (m)
const STAIR_HALF = 1.35;                      // stair half-width at the foot (m)
const N_TOP = 54;                             // last drawn step index
const LANTERN_EVERY = 2.0;                    // world z between lantern posts

const PAL = {
  skyTop: '#07050F', skyLow: '#2A1140', moon: '#EAF7FF',
  hill: '#140E22', fog: '#4A2E5C',
  stoneBack: '#241C33', stoneFront: '#4A3D63',
  nosing: '#C6AEEA', moss: '#3E7A5E',
  wall: '#141020', wallLit: '#2E2342',
  lantern: '#FFB45E', ember: '#FF7A2B', petal: '#FF7BD5', petal2: '#B76BFF',
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
// project world z (distance along the stair) to screen y on the tread surface
const yOf = (z) => HORIZON + K / z;

// ------------------------------------------------------------- keyed art ----
function keyGreen(buf, info) {
  const { width, height, channels } = info;
  const out = Buffer.alloc(width * height * 4);
  let minX = width, minY = height, maxX = 0, maxY = 0;
  for (let i = 0, p = 0; i < width * height; i++, p += channels) {
    const r = buf[p], g = buf[p + 1], b = buf[p + 2];
    const greenness = g - Math.max(r, b);
    let a = 255;
    if (greenness > 26) a = 0;
    else if (greenness > 4) a = Math.round(255 * (1 - (greenness - 4) / 22));
    // kill the green fringe on semi-transparent edge pixels
    const spill = clamp(greenness / 60, 0, 1);
    const rr = Math.round(r + 40 * spill), bb = Math.round(b + 20 * spill), gg = Math.round(g - 55 * spill);
    const o = i * 4;
    out[o] = clamp(rr, 0, 255); out[o + 1] = clamp(gg, 0, 255); out[o + 2] = clamp(bb, 0, 255); out[o + 3] = a;
    if (a > 24) {
      const x = i % width, y = (i / width) | 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  return { data: out, width, height, bbox: { l: minX, t: minY, r: maxX, b: maxY } };
}

function keyLuma(buf, info, lo = 10, hi = 64) {
  const { width, height, channels } = info;
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0, p = 0; i < width * height; i++, p += channels) {
    const r = buf[p], g = buf[p + 1], b = buf[p + 2];
    const l = Math.max(r, g, b);
    const a = clamp(Math.round(255 * (l - lo) / (hi - lo)), 0, 255);
    const o = i * 4;
    out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = a;
  }
  return { data: out, width, height };
}

async function prepSprites() {
  const sprites = {};
  for (const [key, file] of [['a', 'walk-a-raw.png'], ['b', 'walk-b-raw.png'], ['d', 'walk-d-raw.png']]) {
    const { data, info } = await sharp(join(SRC, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const k = keyGreen(data, info);
    const bw = k.bbox.r - k.bbox.l + 1, bh = k.bbox.b - k.bbox.t + 1;
    const cropped = await sharp(k.data, { raw: { width: k.width, height: k.height, channels: 4 } })
      .extract({ left: k.bbox.l, top: k.bbox.t, width: bw, height: bh })
      .png().toBuffer();
    // scale so the body is BODY_PX tall on screen
    const scale = BODY_PX / bh;
    const sw = Math.round(bw * scale), sh = Math.round(bh * scale);
    const scaled = await sharp(cropped).resize(sw, sh, { fit: 'fill', kernel: 'lanczos3' }).png().toBuffer();
    sprites[key] = { buf: scaled, w: sw, h: sh };
    console.log(`  sprite ${key}: ${bw}x${bh} -> ${sw}x${sh}`);
  }
  return sprites;
}

async function prepCanopy() {
  const { data, info } = await sharp(join(SRC, 'canopy-raw.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const k = keyLuma(data, info);
  // fade the centre-bottom of the canopy so it frames the character instead of covering her
  const d = k.data;
  for (let y = 0; y < k.height; y++) {
    for (let x = 0; x < k.width; x++) {
      const o = (y * k.width + x) * 4;
      const u = x / k.width, v = y / k.height;
      const dx = Math.abs(u - 0.5) * 2;                       // 0 centre, 1 edge
      const edge = Math.min(1, Math.max(0, (dx - 0.42) / 0.45));
      const depth = Math.min(1, Math.max(0, (v - 0.35) / 0.5));
      const keep = Math.min(edge, 1 - depth * 0.85);
      d[o + 3] = Math.round(d[o + 3] * Math.max(0, keep));
    }
  }
  const scaled = await sharp(d, { raw: { width: k.width, height: k.height, channels: 4 } })
    .resize(W, Math.round(W * k.height / k.width), { fit: 'fill' })
    .png().toBuffer();
  const meta = await sharp(scaled).metadata();
  console.log(`  canopy keyed ${meta.width}x${meta.height}`);
  return { buf: scaled, w: meta.width, h: meta.height };
}

// ------------------------------------------------------------ static sky ----
function skySVG() {
  let s = `<defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${PAL.skyTop}"/><stop offset="1" stop-color="${PAL.skyLow}"/>
    </linearGradient>
    <radialGradient id="moonGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${PAL.moon}" stop-opacity="0.55"/>
      <stop offset="0.35" stop-color="#9FD8FF" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#9FD8FF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fog" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${PAL.fog}" stop-opacity="0"/>
      <stop offset="0.55" stop-color="${PAL.fog}" stop-opacity="0.42"/>
      <stop offset="1" stop-color="${PAL.fog}" stop-opacity="0"/>
    </linearGradient>
  </defs>`;
  s += `<rect width="${W}" height="${H}" fill="url(#sky)"/>`;
  // stars
  for (let i = 0; i < 190; i++) {
    const x = rnd(i * 3.1) * W;
    const y = rnd(i * 7.7) * (HORIZON + 60);
    const r = 0.6 + rnd(i * 2.3) * 1.5;
    const o = 0.25 + rnd(i * 5.9) * 0.7;
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="#DCE8FF" opacity="${o.toFixed(2)}"/>`;
  }
  // crescent moon
  s += `<circle cx="1470" cy="150" r="150" fill="url(#moonGlow)"/>`;
  s += `<circle cx="1470" cy="150" r="34" fill="${PAL.moon}"/>`;
  s += `<circle cx="1486" cy="140" r="31" fill="${PAL.skyTop}"/>`;
  // far ridge
  s += `<path d="M0 ${HORIZON + 26} L120 ${HORIZON - 42} L250 ${HORIZON + 4} L360 ${HORIZON - 86} L470 ${HORIZON - 6}
        L590 ${HORIZON - 120} L700 ${HORIZON - 30} L820 ${HORIZON - 150} L960 ${HORIZON - 60} L1080 ${HORIZON - 128}
        L1200 ${HORIZON - 34} L1330 ${HORIZON - 104} L1460 ${HORIZON - 20} L1600 ${HORIZON - 74} L1760 ${HORIZON - 8}
        L1920 ${HORIZON - 46} L1920 ${HORIZON + 40} L0 ${HORIZON + 40} Z" fill="${PAL.hill}" opacity="0.95"/>`;
  // dead cedar trunks on the ridge
  for (let i = 0; i < 26; i++) {
    const x = rnd(i * 11.3) * W;
    const h = 30 + rnd(i * 4.7) * 90;
    const base = HORIZON - 10 - rnd(i * 8.1) * 60;
    s += `<path d="M${x} ${base} L${x + 2} ${base - h}" stroke="#0A0712" stroke-width="${1.4 + rnd(i) * 1.6}" opacity="0.8"/>`;
  }
  s += `<rect x="0" y="${HORIZON - 150}" width="${W}" height="300" fill="url(#fog)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${s}</svg>`;
}

// --------------------------------------------------------------- stairs -----
// True staircase projection.
//   eye level is at CAM_H above the stair surface, so a step whose top sits h
//   metres above that surface projects to  y = HORIZON + K*(CAM_H - h)/z.
//   Steps therefore rise toward the horizon and then above it — which is what
//   makes them read as stairs instead of stripes on a floor.
function stairsSVG(frame) {
  const phase = (frame / FRAMES) * STEPS_PER_LOOP;
  const vx = W / 2;
  const halfW = (z) => STAIR_HALF * K / z;
  const yOf = (z, h) => HORIZON + K * (CAM_H - h) / z;
  const seedOf = (k) => ((k % STEPS_PER_LOOP) + STEPS_PER_LOOP) % STEPS_PER_LOOP;

  // ---- collect the steps that are actually on screen -----------------------
  const drawn = [];
  for (let k = Math.ceil(phase - 1.2); k <= phase + N_TOP; k++) {
    const n = k - phase;
    const z = Z_BASE + n * DZ;
    if (z < 1.1) continue;
    const h = n * RISER_H;
    drawn.push({ k, n, z, h, seed: seedOf(k) });
  }
  drawn.sort((a, b) => b.n - a.n);            // far → near

  let s = '';

  // ---- rock either side of the corridor (even-odd: frame minus stair) ------
  const near = drawn[drawn.length - 1];
  const far = drawn[0];
  if (near && far) {
    const pts = [];
    pts.push([vx - halfW(near.z), yOf(near.z, near.h)]);
    pts.push([vx + halfW(near.z), yOf(near.z, near.h)]);
    for (let i = drawn.length - 1; i >= 0; i--) {
      const d = drawn[i];
      pts.push([vx + halfW(d.z + DZ), yOf(d.z + DZ, d.h)]);
    }
    for (let i = 0; i < drawn.length; i++) {
      const d = drawn[i];
      pts.push([vx - halfW(d.z + DZ), yOf(d.z + DZ, d.h)]);
    }
    const path = 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L') + ' Z';
    s += `<defs>
      <linearGradient id="rock" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0B0814"/><stop offset="0.55" stop-color="#181128"/>
        <stop offset="1" stop-color="#241A36"/>
      </linearGradient>
    </defs>`;
    s += `<path fill-rule="evenodd" d="M0 0 L${W} 0 L${W} ${H} L0 ${H} Z ${path}" fill="url(#rock)"/>`;
    // strata + cracks on the rock, keyed off step seeds so they scroll with it
    for (let i = 0; i < 90; i++) {
      const side = i % 2 ? 1 : -1;
      const d = drawn[Math.floor(rnd(i * 3.7) * drawn.length)] || near;
      if (!d) continue;
      const y = yOf(d.z, d.h) + (rnd(i * 2.3) - 0.5) * 90;
      const x0 = vx + side * halfW(d.z);
      const len = 60 + rnd(i * 5.1) * 320;
      s += `<path d="M${x0.toFixed(0)} ${y.toFixed(0)} L${(x0 + side * len).toFixed(0)} ${(y + (rnd(i) - 0.5) * 40).toFixed(0)}" stroke="#2A2042" stroke-width="${(1.5 + rnd(i * 7) * 6).toFixed(1)}" opacity="${(0.25 + rnd(i * 1.9) * 0.35).toFixed(2)}"/>`;
    }
  }

  // ---- the steps themselves ------------------------------------------------
  for (const d of drawn) {
    const { z, h } = d;
    const zB = z + DZ;
    const wF = halfW(z), wB = halfW(zB);
    const xF0 = vx - wF, xF1 = vx + wF;
    const xB0 = vx - wB, xB1 = vx + wB;
    const yF = yOf(z, h), yB = yOf(zB, h);
    const yTop = yOf(z, h);                    // top of this step's riser
    const yBot = yOf(z, h - RISER_H);          // bottom of this step's riser
    if (yTop > H + 40) continue;               // entirely below the frame
    if (yBot < -40) continue;                  // entirely above the frame
    const dist = clamp(1 - (z - Z_BASE) / (Z_BASE + N_TOP * DZ), 0, 1);
    const fog = 1 - dist;                      // 0 near … 1 far
    const op = (0.94 - 0.25 * fog).toFixed(2);

    // tread: only visible while we are above it
    if (h < CAM_H - 0.001) {
      s += `<linearGradient id="td${d.seed}${Math.floor(d.n)}" x1="0" y1="${yB.toFixed(1)}" x2="0" y2="${yF.toFixed(1)}" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#56466F"/>
        <stop offset="0.55" stop-color="#3B3055"/>
        <stop offset="1" stop-color="#2A2140"/></linearGradient>`;
      s += `<path d="M${xB0.toFixed(1)} ${yB.toFixed(1)} L${xB1.toFixed(1)} ${yB.toFixed(1)} L${xF1.toFixed(1)} ${yF.toFixed(1)} L${xF0.toFixed(1)} ${yF.toFixed(1)} Z" fill="url(#td${d.seed}${Math.floor(d.n)})" opacity="${op}"/>`;
      // wet sheen
      s += `<path d="M${(vx - wF * 0.8).toFixed(1)} ${(yF - (yF - yB) * 0.55).toFixed(1)} Q${vx} ${(yF - (yF - yB) * 0.95).toFixed(1)} ${(vx + wF * 0.8).toFixed(1)} ${(yF - (yF - yB) * 0.55).toFixed(1)}" stroke="#A98AE0" stroke-width="${clamp((yF - yB) * 0.10, 0.3, 2.4).toFixed(2)}" fill="none" opacity="${(0.16 - 0.10 * fog).toFixed(2)}"/>`;
    }

    // riser: the vertical face, always facing us
    const riserH = yBot - yTop;
    if (riserH > 0.25) {
      s += `<path d="M${xF0.toFixed(1)} ${yTop.toFixed(1)} L${xF1.toFixed(1)} ${yTop.toFixed(1)} L${xF1.toFixed(1)} ${yBot.toFixed(1)} L${xF0.toFixed(1)} ${yBot.toFixed(1)} Z" fill="#1B1529" opacity="${op}"/>`;
      // stone block joints
      const blocks = 3 + (d.seed % 3);
      for (let b = 1; b < blocks; b++) {
        const bx = xF0 + (xF1 - xF0) * (b / blocks) + (rnd(d.seed * 3.1 + b) - 0.5) * 6;
        s += `<path d="M${bx.toFixed(1)} ${yTop.toFixed(1)} L${bx.toFixed(1)} ${yBot.toFixed(1)}" stroke="#0D0A16" stroke-width="${clamp(riserH * 0.09, 0.3, 2)}" opacity="${(0.5 - 0.3 * fog).toFixed(2)}"/>`;
      }
      // lit upper lip of the riser, the strongest read on the whole staircase
      s += `<path d="M${xF0.toFixed(1)} ${yTop.toFixed(1)} L${xF1.toFixed(1)} ${yTop.toFixed(1)}" stroke="${PAL.nosing}" stroke-width="${clamp(riserH * 0.13, 0.6, 3.8).toFixed(2)}" opacity="${(0.72 - 0.40 * fog).toFixed(2)}"/>`;
      // cold light pooling at the base of the riser
      s += `<path d="M${xF0.toFixed(1)} ${yBot.toFixed(1)} L${xF1.toFixed(1)} ${yBot.toFixed(1)}" stroke="#5B4A80" stroke-width="${clamp(riserH * 0.08, 0.3, 1.8).toFixed(2)}" opacity="${(0.22 - 0.14 * fog).toFixed(2)}"/>`;
      // moss creeping on a few of them
      if (d.seed % 5 === 1 && riserH > 6) {
        s += `<ellipse cx="${(xF0 + (xF1 - xF0) * (0.2 + rnd(d.seed) * 0.6)).toFixed(1)}" cy="${(yBot - riserH * 0.18).toFixed(1)}" rx="${((xF1 - xF0) * 0.16).toFixed(1)}" ry="${(riserH * 0.18).toFixed(1)}" fill="${PAL.moss}" opacity="0.35"/>`;
      }
    }
  }

  // ---- mist filling the top of the stair --------------------------------
  s += `<rect x="0" y="-40" width="${W}" height="${HORIZON + 60}" fill="url(#fog2)"/>`;
  // ---- torii at the vanishing point -------------------------------------
  // The stair climbs ~20°, so a correctly-projected 4 m gate lands above the top
  // of frame. Draw it in screen space at the point where the stair dissolves into
  // mist instead: it still reads as a gate at the head of the stairs.
  {
    const cx = vx;
    const baseY = HORIZON - 26;
    const postH = 250, span = 400, thick = 26;
    const top = baseY - postH;
    const g = (o) => `<g opacity="${o}">
      <rect x="${(cx - span / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${thick}" height="${postH.toFixed(1)}" fill="#0A0712"/>
      <rect x="${(cx + span / 2 - thick).toFixed(1)}" y="${top.toFixed(1)}" width="${thick}" height="${postH.toFixed(1)}" fill="#0A0712"/>
      <path d="M${(cx - span / 2 - 54).toFixed(1)} ${(top - 16).toFixed(1)} L${(cx + span / 2 + 54).toFixed(1)} ${(top - 16).toFixed(1)} L${(cx + span / 2 + 30).toFixed(1)} ${(top + 30).toFixed(1)} L${(cx - span / 2 - 30).toFixed(1)} ${(top + 30).toFixed(1)} Z" fill="#0C0816"/>
      <rect x="${(cx - span / 2 - 14).toFixed(1)}" y="${(top + postH * 0.30).toFixed(1)}" width="${(span + 28).toFixed(1)}" height="20" fill="#0E0A1A"/>
    </g>`;
    // soft halo behind the gate so it separates from the mist
    s += `<ellipse cx="${cx}" cy="${(top + postH * 0.4).toFixed(1)}" rx="${span * 0.95}" ry="${postH * 0.85}" fill="url(#gateGlow)"/>`;
    s += g('0.92');
  }

  // ---- stone lanterns standing on the step edges ------------------------
  for (const d of drawn) {
    if (d.n > 9) continue;                      // near steps only, so they stay inside frame
    if (d.seed % 4 !== 3) continue;
    const side = d.seed % 2 ? 1 : -1;
    const z = d.z, h = d.h;
    const yB = yOf(z, h);
    const ppm = K / z;
    const H1 = 0.95 * ppm, W1 = 0.26 * ppm;
    const px = vx + side * halfW(z) * 0.88;
    if (px < -100 || px > W + 100) continue;
    const fog = clamp(1 - (z - Z_BASE) / (Z_BASE + N_TOP * DZ), 0, 1);
    const vis = 1 - fog;
    const o = (0.35 + 0.65 * vis).toFixed(2);
    const yTop = yB - H1;
    // warm bloom
    s += `<circle cx="${px.toFixed(1)}" cy="${(yTop + H1 * 0.30).toFixed(1)}" r="${(H1 * 1.15).toFixed(1)}" fill="url(#lampGlow)" opacity="${(0.85 * vis).toFixed(2)}"/>`;
    // base plinth
    s += `<rect x="${(px - W1 * 0.80).toFixed(1)}" y="${(yB - H1 * 0.14).toFixed(1)}" width="${(W1 * 1.60).toFixed(1)}" height="${(H1 * 0.14).toFixed(1)}" fill="#120C1E" opacity="${o}"/>`;
    // shaft
    s += `<rect x="${(px - W1 * 0.20).toFixed(1)}" y="${(yTop + H1 * 0.52).toFixed(1)}" width="${(W1 * 0.40).toFixed(1)}" height="${(H1 * 0.34).toFixed(1)}" fill="#1A1228" opacity="${o}"/>`;
    // light box with a lit pane
    s += `<rect x="${(px - W1 * 0.46).toFixed(1)}" y="${(yTop + H1 * 0.28).toFixed(1)}" width="${(W1 * 0.92).toFixed(1)}" height="${(H1 * 0.24).toFixed(1)}" fill="#191024" opacity="${o}"/>`;
    s += `<rect x="${(px - W1 * 0.30).toFixed(1)}" y="${(yTop + H1 * 0.313).toFixed(1)}" width="${(W1 * 0.60).toFixed(1)}" height="${(H1 * 0.165).toFixed(1)}" fill="${PAL.lantern}" opacity="${(0.95 * vis).toFixed(2)}"/>`;
    s += `<rect x="${(px - W1 * 0.30).toFixed(1)}" y="${(yTop + H1 * 0.313).toFixed(1)}" width="${(W1 * 0.60).toFixed(1)}" height="${(H1 * 0.165).toFixed(1)}" fill="#FFF3D0" opacity="${(0.55 * vis).toFixed(2)}"/>`;
    // roof
    s += `<path d="M${(px - W1 * 0.98).toFixed(1)} ${(yTop + H1 * 0.28).toFixed(1)} L${(px + W1 * 0.98).toFixed(1)} ${(yTop + H1 * 0.28).toFixed(1)} L${(px + W1 * 0.52).toFixed(1)} ${(yTop + H1 * 0.115).toFixed(1)} L${(px - W1 * 0.52).toFixed(1)} ${(yTop + H1 * 0.115).toFixed(1)} Z" fill="#0E0918" opacity="${o}"/>`;
    // finial
    s += `<circle cx="${px.toFixed(1)}" cy="${(yTop + H1 * 0.055).toFixed(1)}" r="${(W1 * 0.17).toFixed(1)}" fill="#231735" opacity="${o}"/>`;
    // faint reflection on the wet tread beside it
    s += `<ellipse cx="${px.toFixed(1)}" cy="${(yB + H1 * 0.05).toFixed(1)}" rx="${(W1 * 1.1).toFixed(1)}" ry="${(H1 * 0.05).toFixed(1)}" fill="${PAL.lantern}" opacity="${(0.16 * vis).toFixed(2)}"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${s}</svg>`;
}

// --------------------------------------------------------------- stairs -----
// -------------------------------------------------------------- particles ---
function fxSVG(frame, spritePos) {
  const t = frame / FPS;
  let s = '';
  // warm glow behind the character so she separates from the dark stair
  s += `<defs><radialGradient id="backGlow" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#FF9E4A" stop-opacity="0.30"/>
    <stop offset="0.45" stop-color="#B76BFF" stop-opacity="0.14"/>
    <stop offset="1" stop-color="#B76BFF" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="ember" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#FFE9A8" stop-opacity="0.95"/>
    <stop offset="0.4" stop-color="${PAL.ember}" stop-opacity="0.7"/>
    <stop offset="1" stop-color="#FF4F1F" stop-opacity="0"/>
  </radialGradient></defs>`;
  s += `<ellipse cx="${spritePos.x}" cy="${spritePos.y - 330}" rx="310" ry="400" fill="url(#backGlow)"/>`;

  // embers rising from the crimson blade (lower right of the sprite)
  for (let i = 0; i < 34; i++) {
    const seed = i * 12.9;
    const life = ((t * (0.22 + rnd(seed) * 0.35) + rnd(seed * 2.1)) % 1);
    const bx = spritePos.x + 150 + rnd(seed * 3.3) * 120;
    const by = spritePos.y - 300 - rnd(seed * 5.5) * 120;
    const x = bx + Math.sin((life * 6.2) + seed) * (26 + rnd(seed) * 46);
    const y = by - life * (240 + rnd(seed * 7.1) * 320);
    const r = 2 + rnd(seed * 4.4) * 6;
    const o = (1 - life) * (0.55 + rnd(seed * 9.9) * 0.45);
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="url(#ember)" opacity="${o.toFixed(2)}"/>`;
  }

  // wisteria petals, three parallax layers
  for (let layer = 0; layer < 3; layer++) {
    const count = 16 + layer * 8;
    const speed = 34 + layer * 26;
    const scale = 0.55 + layer * 0.42;
    for (let i = 0; i < count; i++) {
      const seed = i * 17.3 + layer * 101.7;
      const x0 = rnd(seed) * (W + 200) - 100;
      const drift = Math.sin(t * (0.5 + rnd(seed * 2.7) * 0.9) + seed) * (26 + rnd(seed) * 40);
      const y = ((rnd(seed * 3.1) * H) + t * speed) % (H + 120) - 60;
      const x = x0 + drift + Math.sin(t * 1.4 + seed) * 14;
      const rot = (t * 40 + rnd(seed) * 360) * (rnd(seed * 5.3) > 0.5 ? 1 : -1);
      const w = 15 * scale, h = 8 * scale;
      const col = i % 3 === 0 ? PAL.petal2 : PAL.petal;
      const op = (0.30 + rnd(seed * 7.7) * 0.45) * (0.5 + layer * 0.22);
      s += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)})">
        <ellipse rx="${w.toFixed(1)}" ry="${h.toFixed(1)}" fill="${col}" opacity="${op.toFixed(2)}"/>
        <ellipse cx="${(-w * 0.18).toFixed(1)}" rx="${(w * 0.42).toFixed(1)}" ry="${(h * 0.5).toFixed(1)}" fill="#F2D9FF" opacity="${(op * 0.5).toFixed(2)}"/>
      </g>`;
    }
  }

  // warm pool of lantern light around her feet
  s += `<defs><radialGradient id="footPool" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#FFB45E" stop-opacity="0.22"/>
    <stop offset="0.5" stop-color="#FF8A3D" stop-opacity="0.07"/>
    <stop offset="1" stop-color="#FF8A3D" stop-opacity="0"/>
  </radialGradient></defs>`;
  s += `<ellipse cx="${spritePos.x}" cy="${spritePos.y - 4}" rx="330" ry="90" fill="url(#footPool)"/>`;

  // soft contact shadow, breathing with the step
  const bob = Math.sin((frame / CYCLE) * Math.PI * 2) * 3;
  s += `<ellipse cx="${spritePos.x}" cy="${spritePos.y + 4 + bob * 0.3}" rx="${150 + bob * 6}" ry="${16 + bob}" fill="#07040C" opacity="0.55"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${s}</svg>`;
}

function overlaySVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <radialGradient id="vig" cx="0.5" cy="0.46" r="0.78">
      <stop offset="0.45" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#05030A" stop-opacity="0.78"/>
    </radialGradient>
    <linearGradient id="grade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2A0E4A" stop-opacity="0.20"/>
      <stop offset="0.5" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#0A2A3A" stop-opacity="0.24"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#grade)"/>
  <rect width="${W}" height="${H}" fill="url(#vig)"/>
  </svg>`;
}

// ------------------------------------------------------------------ main ----
async function main() {
  if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });
  console.log('preparing art…');
  const sprites = await prepSprites();
  const canopy = await prepCanopy();

  const sky = await sharp(Buffer.from(skySVG())).png().toBuffer();
  const overlay = await sharp(Buffer.from(overlaySVG())).png().toBuffer();
  writeFileSync(join(TMP, 'sky.png'), sky);

  console.log(`rendering ${FRAMES} frames…`);
  const list = PREVIEW ? PREVIEW_SET : Array.from({ length: FRAMES }, (_, i) => i);
  for (const f of list) {
    const phase = (f / FRAMES) * STEPS_PER_LOOP;
    const stepPhase = (f % CYCLE) / CYCLE;
    // 4-phase cycle from 3 approved poses: contact(a) → passing(d) → contact(b) → passing(d)
    const q = stepPhase * 4;
    const pose = q < 1 ? 'a' : q < 2 ? 'd' : q < 3 ? 'b' : 'd';
    const sp = sprites[pose];
    const bob = Math.sin(stepPhase * Math.PI * 2) * 3;
    const sway = Math.sin(stepPhase * Math.PI * 2) * 0.7;
    const pulse = 1 + Math.sin(stepPhase * Math.PI * 2) * 0.004;

    const feetX = W / 2 + Math.sin(f / FRAMES * Math.PI * 2) * 6;
    const feetY = FEET_Y + bob;

    // scale sprite about its feet, with the tiny sway rotation
    const sw = Math.round(sp.w * pulse), sh = Math.round(sp.h * pulse);
    const spriteBuf = await sharp(sp.buf).resize(sw, sh, { fit: 'fill' }).png().toBuffer();
    const spriteLayer = await sharp({
      create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    }).composite([{
      input: await sharp(spriteBuf)
        .rotate(sway, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png().toBuffer(),
      left: Math.round(feetX - sw / 2),
      top: Math.round(feetY - sh),
    }]).png().toBuffer();

    // canopy drift: slow lateral sway, cropped from a wider strip
    const drift = Math.sin((f / FRAMES) * Math.PI * 2) * 90;
    const canopyLeft = 0;
    // canopy art is wider than the frame so it can drift without exposing an edge;
    // crop a window out of it and clamp the leftover height to the frame
    const cw = Math.min(canopy.w, W);
    const ch = Math.min(canopy.h, H);
    const cx0 = clamp(Math.round(drift), 0, canopy.w - cw);
    const canopyBuf = await sharp(canopy.buf)
      .extract({ left: cx0, top: 0, width: cw, height: ch })
      .png().toBuffer();

    const stairs = await sharp(Buffer.from(stairsSVG(f))).png().toBuffer();
    const fx = await sharp(Buffer.from(fxSVG(f, { x: feetX, y: feetY }))).png().toBuffer();

    const out = await sharp(sky)
      .composite([
        { input: stairs, top: 0, left: 0 },
        { input: canopyBuf, top: -40, left: canopyLeft },
        { input: fx, top: 0, left: 0 },
        { input: spriteLayer, top: 0, left: 0 },
        { input: overlay, top: 0, left: 0 },
      ])
      .jpeg({ quality: 96, chromaSubsampling: '4:4:4' })
      .toBuffer();

    writeFileSync(join(TMP, `f_${String(f).padStart(4, '0')}.jpg`), out);
    if (f % 24 === 0) process.stdout.write(`  ${f}/${FRAMES}\n`);
    void phase;
  }

  if (PREVIEW) { console.log('preview frames in', TMP); return; }
  console.log('encoding…');
  const mp4 = join(OUT, 'hotaru-walks-the-stairs.mp4');
  execFileSync(FFMPEG, [
    '-y', '-framerate', String(FPS), '-i', join(TMP, 'f_%04d.jpg'),
    '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'medium', '-crf', '20',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4,
  ], { stdio: 'inherit' });

  const gif = join(OUT, 'hotaru-walks-the-stairs.gif');
  execFileSync(FFMPEG, [
    '-y', '-i', mp4, '-vf',
    'fps=10,scale=640:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=3',
    '-loop', '0', gif,
  ], { stdio: 'inherit' });

  console.log('done:', mp4);
}

main().catch((e) => { console.error(e); process.exit(1); });
