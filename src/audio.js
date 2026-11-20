// Procedural Web Audio SFX + character voice barks. Safe in headless / muted environments.

const MUTE_KEY = 'cellwarriors.mute';
let ctx = null;
let muted = false;
const voiceCache = {};

try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch { muted = false; }

export const BARK_LINES = {
  kaito: {
    select: 'Someone has to go first.',
    attack: ['Clear the breach.', 'Stay out of the way.', 'On my mark.'],
    ego: 'Not one step back — Last Stand!',
    hurt: 'Tch… keep moving.',
    break: 'There is the opening!',
    win: 'Shift clear. Nobody drops.',
  },
  momo: {
    select: "I-I'll patch it — just give me a second!",
    attack: ['H-holding the line!', 'Stay behind the barrier!', 'Patching now!'],
    ego: 'Everything holds — Bulwark up!',
    hurt: 'Aah! Still standing!',
    break: 'We broke through! Hurry!',
    win: 'Phew… nobody got hurt, right?',
  },
  goro: {
    select: '...Leave it to me.',
    attack: ['Clean cut.', 'Sit still.', 'Clearing the bed.'],
    ego: 'Nothing left standing — Feast.',
    hurt: 'Heavy hit. Manageable.',
    break: 'It cracked.',
    win: '...Good work. Breathe.',
  },
  bibi: {
    select: "Let's make it LOUD.",
    attack: ['Watch the flare!', 'Light it up!', 'Overdrive incoming!'],
    ego: 'Full cascade — Cytokine Storm!',
    hurt: 'Whoa — okay, rude!',
    break: 'BOOM! Hit it while it shakes!',
    win: 'Told you loud works!',
  },
  yuna: {
    select: 'Just a little dose…',
    attack: ['Hold still — this will spread.', 'One drop is enough.', 'Let it soak in.'],
    ego: 'Pandemic Requiem — breathe it in!',
    hurt: 'Careful! Those vials are expensive!',
    break: 'It cracked — poison, inside!',
    win: 'See? It melted all by itself.',
  },
};

/* Recorded clips are only used for an Ego activation — one per battle, and it
   should sound like a performance. Card plays are synthesised per card
   (see cardVoice) because a single "attack" clip per character made every one
   of that character's cards sound identical. */
export const VOICE_CLIPS = {
  'kaito:ego': 'audio/kaito-ego.mp3',
  'momo:ego': 'audio/momo-ego.mp3',
  'goro:ego': 'audio/goro-ego.mp3',
  'bibi:ego': 'audio/bibi-ego.mp3',
};

const CHAR_PITCH = { kaito: 260, momo: 460, goro: 155, bibi: 390, yuna: 520, sable: 300 };

function ac() {
  if (muted) return null;
  if (ctx) {
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume().catch(() => {});
    return ctx;
  }
  const Ctor = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!Ctor) return null;
  try { ctx = new Ctor(); } catch { ctx = null; }
  // Master bus: every tone/noise routes through one gain so major moments can
  // DUCK everything else for a beat — the cheapest cinematic trick there is.
  // After it sits a soft compressor (a 4-hit flurry should land as one punch,
  // not as four clipped snaps) and a synthetic room, because dry Web Audio
  // bleeps are exactly what "cheap" sounds like.
  if (ctx && ctx.createGain && !ctx._master) {
    try {
      const master = ctx.createGain();
      master.gain.value = 0.9;
      let head = master;
      if (ctx.createDynamicsCompressor) {
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -14;
        comp.knee.value = 24;
        comp.ratio.value = 4;
        comp.attack.value = 0.004;
        comp.release.value = 0.18;
        master.connect(comp);
        head = comp;
      }
      head.connect(ctx.destination);
      ctx._master = master;

      if (ctx.createConvolver && ctx.createBuffer) {
        const conv = ctx.createConvolver();
        conv.buffer = makeIR(ctx);
        const damp = ctx.createBiquadFilter();
        damp.type = 'lowpass';
        damp.frequency.value = 3600;
        const wet = ctx.createGain();
        wet.gain.value = 0.5;
        const send = ctx.createGain();
        send.gain.value = 1;
        send.connect(conv).connect(damp).connect(wet).connect(master);
        ctx._send = send;
      }
    } catch { /* fall back to direct destination */ }
  }
  return ctx;
}

/* 1.4s of decaying stereo noise = a small concrete room. Cheap, and it is the
   single biggest difference between "beep" and "impact". */
function makeIR(c) {
  const len = Math.max(1, Math.floor(c.sampleRate * 1.4));
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3.2) * 0.8;
    }
  }
  return buf;
}

/* Route a finished voice to the dry bus, optionally panned and optionally into
   the reverb send. StereoPannerNode is missing on very old WebViews - degrade
   to mono rather than throw. */
function output(c, node, { pan = 0, send = 0 } = {}) {
  let tail = node;
  if (pan && c.createStereoPanner) {
    try {
      const p = c.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      tail.connect(p);
      tail = p;
    } catch { /* mono */ }
  }
  tail.connect(out(c));
  if (send > 0 && c._send) {
    try {
      const g = c.createGain();
      g.gain.value = send;
      tail.connect(g);
      g.connect(c._send);
    } catch { /* no room */ }
  }
  return tail;
}

function out(c) { return (c && c._master) || c.destination; }

// Duck the whole mix (0 = silent … 1 = untouched) for `hold` seconds, then ease back.
export function duckMix(depth = 0.3, hold = 0.22) {
  const c = ac();
  if (!c || !c._master) return;
  try {
    const g = c._master.gain;
    const now = c.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(Math.max(0.05, depth), now);
    g.linearRampToValueAtTime(0.92, now + Math.max(0.08, hold));
  } catch { /* ignore */ }
}

/* Headroom. The synthesis below is deliberately mixed conservatively (a chip
   hit peaks around 0.02 of full scale, which on a phone speaker is inaudible
   next to any other app). Everything gets one constant lift here, and the
   compressor on the master bus keeps stacked hits from clipping. */
const BUS_GAIN = 2.4;

// Tiny random detune so the same sound never plays identically twice.
const vary = (f, amt = 0.05) => f * (1 + (Math.random() * 2 - 1) * amt);
// Log-scaled loudness: a 200-damage hit is weightier, not 10x louder.
const dmgGain = (amt, base = 0.05, cap = 0.1) => base + Math.min(cap, Math.log10(Math.max(1, amt)) * 0.032);

function tone(freq, dur, { type = 'triangle', gain = 0.09, slideTo = null, delay = 0, exact = false, pan = 0, send = 0, attack = 0.012, detune = 0 } = {}) {
  const c = ac();
  if (!c) return;
  const now = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  const f = exact ? freq : vary(freq, 0.035);
  osc.type = type;
  osc.frequency.setValueAtTime(f, now);
  if (detune) osc.detune.setValueAtTime(detune, now);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, exact ? slideTo : vary(slideTo, 0.035)), now + dur);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(gain * sfxVolume * BUS_GAIN, now + Math.max(0.002, attack));
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(g);
  output(c, g, { pan, send });
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

/* Filtered noise with a real attack shape. `highpass` is kept for the existing
   call sites; `band` turns the same generator into a fricative/whoosh. */
function noiseBurst(dur, { gain = 0.08, highpass = 600, delay = 0, band = null, q = 1.2, pan = 0, send = 0, attack = 0.002, curve = 1 } = {}) {
  const c = ac();
  if (!c || !c.createBuffer) return;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const t = i / len;
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, curve);
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const filt = c.createBiquadFilter();
  if (band) {
    filt.type = 'bandpass';
    filt.frequency.value = band;
    filt.Q.value = q;
  } else {
    filt.type = 'highpass';
    filt.frequency.value = highpass;
  }
  const g = c.createGain();
  const now = c.currentTime + delay;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(gain * sfxVolume * BUS_GAIN, now + Math.max(0.001, attack));
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(filt).connect(g);
  output(c, g, { pan, send });
  src.start(now);
}

export function sfx(kind, opts = {}) {
  if (muted) return;
  switch (kind) {
    case 'poison-tick': {
      // Wet bubbling scaled by the tick size — Yuna's End-Turn melt.
      const n = Math.max(3, Math.min(7, 3 + Math.round((opts.amt || 12) / 14)));
      for (let i = 0; i < n; i++) {
        tone(85 + Math.random() * 95, 0.1, { type: 'sine', gain: 0.035 + Math.min(0.04, (opts.amt || 0) * 0.0008), delay: i * 0.07, slideTo: 60 });
      }
      break;
    }
    case 'chirp-up':
      tone(660, 0.07, { type: 'sine', gain: 0.045, slideTo: 990 });
      break;
    case 'chirp-down':
      tone(880, 0.08, { type: 'sine', gain: 0.04, slideTo: 520 });
      break;
    case 'donk':
      // Fully shield-blocked: dull, sparkle-free.
      tone(185, 0.12, { type: 'square', gain: 0.07, slideTo: 120 });
      noiseBurst(0.05, { gain: 0.04, highpass: 300 });
      break;
    case 'stamp':
      // Sable's ledger stamp — %HP hits land like a seal on paper.
      tone(135, 0.13, { type: 'square', gain: 0.09, slideTo: 70 });
      noiseBurst(0.06, { gain: 0.07, highpass: 700 });
      tone(392, 0.18, { type: 'sine', gain: 0.04, delay: 0.03 });
      break;
    case 'click':
      // A UI tick is two layers: a short pitched blip for the ear, a 6ms noise
      // transient for the "tap" — one sine on its own sounds like a mosquito.
      tone(880, 0.04, { type: 'sine', gain: 0.05, slideTo: 1180, attack: 0.002, send: 0.06 });
      noiseBurst(0.012, { gain: 0.05, band: 2600, q: 0.9, send: 0.04 });
      break;
    case 'draw':
      // card leaving the deck: a paper swish that opens then closes
      noiseBurst(0.11, { gain: 0.07, band: 1900, q: 0.7, send: 0.1, curve: 1.6 });
      tone(430, 0.07, { type: 'sine', gain: 0.03, slideTo: 620, send: 0.08 });
      break;
    case 'slash':
      noiseBurst(0.15, { gain: 0.13, band: 1650, q: 0.6, send: 0.16, curve: 1.3 });
      tone(300, 0.17, { type: 'sawtooth', gain: 0.085, slideTo: 78, send: 0.12 });
      tone(120, 0.2, { type: 'triangle', gain: 0.07, slideTo: 52, delay: 0.01, send: 0.05 });
      break;
    case 'weak':
      noiseBurst(0.16, { gain: 0.13, highpass: 1200 });
      tone(440, 0.12, { type: 'triangle', gain: 0.1, slideTo: 880 });
      tone(660, 0.16, { type: 'sine', gain: 0.09, slideTo: 1040, delay: 0.04 });
      break;
    case 'shield':
      // glass ring: a triad that arrives a hair apart, with room around it
      tone(330, 0.16, { type: 'triangle', gain: 0.07, slideTo: 470, send: 0.18 });
      tone(660, 0.22, { type: 'sine', gain: 0.05, delay: 0.035, send: 0.24 });
      tone(990, 0.26, { type: 'sine', gain: 0.03, delay: 0.07, send: 0.3, pan: 0.12 });
      break;
    case 'heal':
      tone(440, 0.18, { type: 'sine', gain: 0.06, send: 0.3, attack: 0.03 });
      tone(554, 0.2, { type: 'sine', gain: 0.06, delay: 0.06, send: 0.3, attack: 0.03 });
      tone(659, 0.26, { type: 'sine', gain: 0.06, delay: 0.12, send: 0.34, attack: 0.03 });
      tone(1318, 0.3, { type: 'sine', gain: 0.022, delay: 0.16, send: 0.4, pan: 0.1 });
      break;
    case 'buff':
    case 'celestial':
      tone(392, 0.12, { type: 'triangle', gain: 0.07 });
      tone(587, 0.2, { type: 'triangle', gain: 0.08, delay: 0.05 });
      break;
    case 'break':
      noiseBurst(0.3, { gain: 0.16, highpass: 330, send: 0.22, curve: 1.5 });
      tone(160, 0.36, { type: 'sawtooth', gain: 0.12, slideTo: 50, send: 0.12 });
      tone(784, 0.3, { type: 'triangle', gain: 0.1, slideTo: 1175, delay: 0.07, send: 0.3 });
      tone(1568, 0.34, { type: 'sine', gain: 0.05, delay: 0.12, send: 0.34, pan: 0.16 });
      break;
    case 'phase':
      tone(180, 0.3, { type: 'sawtooth', gain: 0.11, slideTo: 90 });
      tone(270, 0.35, { type: 'square', gain: 0.07, slideTo: 540, delay: 0.08 });
      break;
    case 'hurt':
      noiseBurst(0.15, { gain: 0.12, highpass: 240, send: 0.1, curve: 1.4 });
      tone(145, 0.19, { type: 'sawtooth', gain: 0.1, slideTo: 62, send: 0.06 });
      tone(70, 0.22, { type: 'sine', gain: 0.09, slideTo: 44, delay: 0.01 }); // body thud
      break;
    case 'stress':
      tone(210, 0.22, { type: 'sine', gain: 0.06, slideTo: 175 });
      break;
    case 'breakdown':
      tone(150, 0.38, { type: 'sawtooth', gain: 0.11, slideTo: 95 });
      tone(215, 0.38, { type: 'sawtooth', gain: 0.09, slideTo: 110, delay: 0.06 });
      break;
    case 'ego':
      tone(330, 0.18, { type: 'triangle', gain: 0.1 });
      tone(495, 0.22, { type: 'triangle', gain: 0.1, delay: 0.06 });
      tone(660, 0.32, { type: 'sine', gain: 0.11, delay: 0.12 });
      break;
    case 'sands':
      tone(880, 0.16, { type: 'sine', gain: 0.07, slideTo: 440 });
      tone(660, 0.2, { type: 'sine', gain: 0.06, slideTo: 330, delay: 0.06 });
      break;
    case 'turn':
      tone(340, 0.11, { type: 'sine', gain: 0.06, slideTo: 510 });
      break;
    case 'coin':
      tone(988, 0.09, { type: 'sine', gain: 0.07, send: 0.16 });
      tone(1318, 0.18, { type: 'sine', gain: 0.08, delay: 0.06, send: 0.2 });
      tone(2637, 0.12, { type: 'sine', gain: 0.03, delay: 0.08, send: 0.24 }); // metallic edge
      break;
    case 'upgrade':
      tone(440, 0.11, { type: 'triangle', gain: 0.07, send: 0.18 });
      tone(659, 0.13, { type: 'triangle', gain: 0.07, delay: 0.06, send: 0.2 });
      tone(880, 0.24, { type: 'sine', gain: 0.08, delay: 0.12, send: 0.24 });
      tone(1320, 0.3, { type: 'sine', gain: 0.035, delay: 0.16, send: 0.3 });
      break;
    case 'win':
      tone(523, 0.16, { type: 'triangle', gain: 0.08, send: 0.22 });
      tone(659, 0.16, { type: 'triangle', gain: 0.08, delay: 0.09, send: 0.24 });
      tone(784, 0.18, { type: 'triangle', gain: 0.09, delay: 0.18, send: 0.26 });
      tone(1046, 0.4, { type: 'sine', gain: 0.1, delay: 0.27, send: 0.34 });
      tone(1568, 0.5, { type: 'sine', gain: 0.04, delay: 0.3, send: 0.4, pan: 0.14 });
      break;
    case 'loss':
      tone(294, 0.22, { type: 'sawtooth', gain: 0.08, slideTo: 220 });
      tone(220, 0.36, { type: 'sawtooth', gain: 0.08, slideTo: 146, delay: 0.18 });
      break;
    case 'crit':
      noiseBurst(0.18, { gain: 0.15, highpass: 1400 });
      tone(587, 0.12, { type: 'sawtooth', gain: 0.1, slideTo: 1175 });
      tone(880, 0.22, { type: 'triangle', gain: 0.11, delay: 0.05 });
      break;
    case 'mega':
      noiseBurst(0.32, { gain: 0.18, highpass: 450 });
      tone(196, 0.28, { type: 'sawtooth', gain: 0.13, slideTo: 65 });
      tone(587, 0.24, { type: 'triangle', gain: 0.11, slideTo: 1175, delay: 0.04 });
      tone(1175, 0.35, { type: 'sine', gain: 0.11, delay: 0.12 });
      break;
    case 'exalt':
      noiseBurst(0.28, { gain: 0.15, highpass: 700 });
      tone(330, 0.16, { type: 'triangle', gain: 0.1 });
      tone(495, 0.18, { type: 'triangle', gain: 0.1, delay: 0.05 });
      tone(660, 0.22, { type: 'triangle', gain: 0.11, delay: 0.10 });
      tone(990, 0.38, { type: 'sine', gain: 0.12, delay: 0.16 });
      break;
    case 'chain':
      tone(660, 0.09, { type: 'sine', gain: 0.06, slideTo: 880 });
      break;
    case 'bleed':
    case 'counter':
      noiseBurst(0.09, { gain: 0.07, highpass: 1200 });
      tone(240, 0.1, { type: 'sawtooth', gain: 0.06, slideTo: 120 });
      break;
    case 'epiphany':
      tone(523, 0.13, { type: 'sine', gain: 0.07, send: 0.26 });
      tone(784, 0.17, { type: 'sine', gain: 0.08, delay: 0.06, send: 0.3 });
      tone(1046, 0.26, { type: 'triangle', gain: 0.08, delay: 0.12, send: 0.34 });
      tone(1568, 0.3, { type: 'sine', gain: 0.035, delay: 0.17, send: 0.4, pan: 0.2 });
      break;
    default:
      break;
  }
}

/* ===========================================================================
   DYNAMIC DAMAGE SFX — the sound scales with the number it accompanies.
   Tiers mirror the badge classes: chip <10, solid <25, big <50, mega 50+.
   Pitch identity comes from the attacker's CHAR_PITCH, loudness is
   log-scaled, multi-hits climb a semitone ladder, and a 300ms throttle
   window (max ~4 hits, loudest wins) prevents machine-gun fatigue.
   =========================================================================== */
const dmgWindow = { start: 0, count: 0, maxAmt: 0 };
export function sfxDamage({ amt = 0, weak = false, crit = false, killed = false, hits = 1, blocked = false, owner = null, stamp = false } = {}) {
  if (muted) return;
  const nowMs = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  if (nowMs - dmgWindow.start > 300) { dmgWindow.start = nowMs; dmgWindow.count = 0; dmgWindow.maxAmt = 0; }
  dmgWindow.count += 1;
  const isLoudest = amt >= dmgWindow.maxAmt;
  dmgWindow.maxAmt = Math.max(dmgWindow.maxAmt, amt);
  if (dmgWindow.count > 4 && !isLoudest && !killed) return; // throttle: keep only the biggest voices

  if (blocked) { sfx('donk'); return; }

  const base = CHAR_PITCH[owner] || 300;
  const g = dmgGain(amt);
  let at = 0;

  // Multi-hit ladder: each hit ticks up a semitone, the last lands heaviest.
  if (hits > 1) {
    const steps = Math.min(hits, 5);
    for (let i = 0; i < steps - 1; i++) {
      tone(base * Math.pow(2, i / 12) * 1.6, 0.07, { type: 'triangle', gain: g * 0.75, delay: i * 0.065 });
      noiseBurst(0.05, { gain: g * 0.5, highpass: 1500, delay: i * 0.065 });
    }
    at = (steps - 1) * 0.065;
  }

  if (stamp) { // Sable %HP hit: ledger stamp underneath any tier
    tone(120, 0.14, { type: 'square', gain: 0.08, slideTo: 62, delay: at });
    noiseBurst(0.05, { gain: 0.06, highpass: 800, delay: at });
  }

  if (amt >= 50) {
    // MEGA: the inhale (duck + riser), then the boom.
    duckMix(0.25, 0.3);
    tone(180, 0.13, { type: 'sawtooth', gain: 0.045, slideTo: 920, delay: at });
    const hit = at + 0.13;
    noiseBurst(0.3, { gain: 0.17, highpass: 420, delay: hit });
    tone(165, 0.42, { type: 'sawtooth', gain: 0.13, slideTo: 44, delay: hit });
    tone(880, 0.3, { type: 'triangle', gain: 0.09, slideTo: 1760, delay: hit + 0.02 });
    tone(base, 0.34, { type: 'triangle', gain: 0.08, delay: hit });
    if (amt >= 100) { // shatter cascade on true overkill numbers
      [0, 1, 2].forEach((i) => noiseBurst(0.09, { gain: 0.08, highpass: 1900 - i * 450, delay: hit + 0.08 + i * 0.07 }));
    }
  } else if (amt >= 25) {
    noiseBurst(0.15, { gain: g + 0.05, highpass: 900, delay: at });
    tone(base * 1.1, 0.16, { type: 'sawtooth', gain: g + 0.03, slideTo: base * 0.4, delay: at });
    tone(115, 0.24, { type: 'triangle', gain: 0.11, slideTo: 58, delay: at + 0.015 }); // sub thump
    tone(1560, 0.2, { type: 'sine', gain: 0.05, delay: at + 0.03 }); // metallic ting
  } else if (amt >= 10) {
    noiseBurst(0.13, { gain: g + 0.04, highpass: 950, delay: at });
    tone(base * 1.15, 0.14, { type: 'sawtooth', gain: g + 0.02, slideTo: base * 0.42, delay: at });
  } else {
    noiseBurst(0.06, { gain: 0.05, highpass: 1700, delay: at });
    tone(820, 0.055, { type: 'sine', gain: 0.04, slideTo: 620, delay: at });
  }

  if (weak) { // weakness ping: players should HEAR super-effective
    tone(1318, 0.34, { type: 'sine', gain: 0.065, delay: at + 0.05, exact: true });
    tone(1975, 0.26, { type: 'sine', gain: 0.045, delay: at + 0.09, exact: true });
  }
  if (crit) {
    noiseBurst(0.09, { gain: 0.11, highpass: 2400, delay: at + 0.02 });
    tone(740, 0.13, { type: 'sawtooth', gain: 0.09, slideTo: 1480, delay: at + 0.03 });
    noiseBurst(0.07, { gain: 0.09, highpass: 1800, delay: at + 0.13 }); // whip-crack tail
  }
  if (killed) {
    const hit = at + (amt >= 50 ? 0.15 : 0.03);
    tone(520, 0.36, { type: 'triangle', gain: 0.09, slideTo: 68, delay: hit }); // deflation
    [0, 1, 2].forEach((i) => noiseBurst(0.08, { gain: 0.07, highpass: 2100 - i * 500, delay: hit + 0.05 + i * 0.06 })); // glassy pop
    tone(1046, 0.22, { type: 'sine', gain: 0.05, delay: hit + 0.1 }); // +1 EP sparkle
  }
}

/* ===========================================================================
   MAJOR-CARD STINGERS — rares, finishers, Egos, Exalt, Epiphany.
   Shape is always wind-up -> impact, with per-card signatures, an
   inhale of near-silence before the biggest booms, and mix ducking.
   =========================================================================== */
export function sfxMajor(kind, { owner = null, cardId = '' } = {}) {
  if (muted) return;
  const base = CHAR_PITCH[owner] || 300;
  if (kind === 'rare') {
    tone(180, 0.3, { type: 'sawtooth', gain: 0.055, slideTo: 740 });
    noiseBurst(0.26, { gain: 0.06, highpass: 480 });
    tone(128, 0.4, { type: 'triangle', gain: 0.12, slideTo: 48, delay: 0.3 });
    tone(base * 2, 0.3, { type: 'triangle', gain: 0.07, delay: 0.3 });
    return;
  }
  if (kind === 'epiphany') {
    [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, 0.2, { type: 'sine', gain: 0.06, delay: i * 0.055, exact: true }));
    noiseBurst(0.18, { gain: 0.04, highpass: 2600 });
    return;
  }
  if (kind === 'ego') {
    duckMix(0.35, 0.4);
    tone(300, 0.16, { type: 'sawtooth', gain: 0.05, slideTo: 175 }); // time holds its breath
    [1, 1.25, 1.5, 2].forEach((r, i) => { // choir stack a fifth apart
      tone(base * r, 0.34, { type: 'triangle', gain: 0.085, delay: 0.17 + i * 0.05 });
      tone(base * r * 1.005, 0.34, { type: 'sine', gain: 0.05, delay: 0.17 + i * 0.05 });
    });
    noiseBurst(0.22, { gain: 0.07, highpass: 650, delay: 0.17 });
    return;
  }
  if (kind === 'exalt') {
    // Boom … breath … BIGGER boom.
    noiseBurst(0.26, { gain: 0.14, highpass: 420 });
    tone(150, 0.34, { type: 'sawtooth', gain: 0.12, slideTo: 46 });
    tone(660, 0.26, { type: 'triangle', gain: 0.09, slideTo: 990, delay: 0.03 });
    duckMix(0.12, 0.34);
    noiseBurst(0.4, { gain: 0.18, highpass: 360, delay: 0.36 });
    tone(120, 0.55, { type: 'sawtooth', gain: 0.15, slideTo: 36, delay: 0.36 });
    tone(990, 0.44, { type: 'sine', gain: 0.11, slideTo: 1480, delay: 0.4 });
    tone(base * 2, 0.4, { type: 'triangle', gain: 0.08, delay: 0.4 });
    return;
  }
  // kind === 'finisher' — per-card signatures, generic heavy fallbacks.
  sfxMajor('rare', { owner });
  if (cardId === 'm_bash') { // Aegis Slam shield-gong
    [220, 331, 497, 664].forEach((f) => tone(f, 0.55, { type: 'sine', gain: 0.07, delay: 0.3, exact: true }));
  } else if (cardId === 'k_last' || cardId === 'g_devour') { // finisher cleave + stone crack
    noiseBurst(0.22, { gain: 0.13, highpass: 500, delay: 0.3 });
    noiseBurst(0.08, { gain: 0.1, highpass: 260, delay: 0.42 });
    tone(90, 0.4, { type: 'sawtooth', gain: 0.12, slideTo: 38, delay: 0.3 });
  } else if (cardId === 'b_burst') { // Cytokine Storm sub wobble
    [0, 1, 2].forEach((i) => tone(56, 0.22, { type: 'square', gain: 0.1, slideTo: 94, delay: 0.3 + i * 0.13 }));
    tone(1180, 0.4, { type: 'sine', gain: 0.07, slideTo: 590, delay: 0.34 });
  } else if (cardId === 's_titer' || owner === 'sable') { // ledger stamp + amber choir
    sfx('stamp');
    [392, 494, 587].forEach((f, i) => tone(f, 0.34, { type: 'triangle', gain: 0.06, delay: 0.3 + i * 0.05, exact: true }));
  } else if (owner === 'yuna') { // poison detonation bubbles into a low boom
    sfx('poison-tick', { amt: 60 });
    tone(105, 0.42, { type: 'sawtooth', gain: 0.11, slideTo: 42, delay: 0.3 });
  }
}

/* ===========================================================================
   SIDE-BADGE SFX — sounds FOR the damage number on the card's edge.
   Slam tok lands with the dmgSlam overshoot, hover charge-whine maps its
   pitch to the previewed damage, LETHAL gets a heartbeat, BURST sparkles,
   and preview changes chirp up/down.
   =========================================================================== */
let badgeWhineAt = 0;
let heartbeatTimer = null;
function thump(delay, gain) { tone(64, 0.13, { type: 'sine', gain, slideTo: 44, delay, exact: true }); }
export function sfxBadgeHover({ amt = 0, lethal = false, burst = false } = {}) {
  if (muted) return;
  const nowMs = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  if (nowMs - badgeWhineAt > 220) { // charge-up whine, throttled
    badgeWhineAt = nowMs;
    const f = 300 + Math.min(880, amt * 9);
    tone(f, 0.2, { type: 'sine', gain: 0.022, slideTo: f * 1.45 });
    tone(1180, 0.06, { type: 'triangle', gain: 0.035, slideTo: 700, delay: 0.02 }); // slam tok
  }
  if (burst) { // sparkle arpeggio under the breathing glow
    tone(1568, 0.16, { type: 'sine', gain: 0.03, exact: true });
    tone(2093, 0.2, { type: 'sine', gain: 0.025, delay: 0.07, exact: true });
  }
  if (lethal) badgeHeartbeatStart(); else badgeHeartbeatStop();
}
export function badgeHeartbeatStart() {
  if (muted || heartbeatTimer) return;
  const pair = () => { thump(0, 0.085); thump(0.17, 0.055); };
  pair();
  heartbeatTimer = setInterval(pair, 900); // matches lethalPulse 0.9s
}
export function badgeHeartbeatStop() {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
}

/* ===========================================================================
   PER-CARD VOICE — every card speaks its own syllable
   ---------------------------------------------------------------------------
   One recorded "attack" clip per CHARACTER meant all five of a character's
   cards said the identical thing, which is why the hand sounded like a
   broken record. Instead each card gets a short formant-synthesised utterance
   derived from a hash of its id: a fixed number of syllables, its own vowels,
   its own pitch contour and its own consonant onsets. The character still owns
   the timbre (kaito is bright and clipped, goro is low and gravelly, …), so a
   card is recognisable by character but never identical to its neighbour.

   Deterministic: card 'k_jab' sounds the same in every battle and every
   install, because the seed is the id — not Math.random().
   =========================================================================== */

/* FNV-1a: tiny, stable across engines, and good enough to scatter ids. */
function hash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
/* mulberry32 — one seed in, a repeatable stream of 0..1 out. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Formant pairs (F1/F2) of the vowels a human actually uses for short shouts. */
const VOWELS = {
  a: [730, 1090], e: [530, 1840], i: [285, 2260], o: [570, 840], u: [320, 870],
  ae: [660, 1720], eh: [580, 1790], oh: [500, 900], ih: [400, 1990],
};

/* Character timbre. f0 = speaking pitch, formant = vocal-tract scale (>1 is a
   smaller head), breath = air on the voice, grit = sub-harmonic rasp. */
const VOICE_PROFILE = {
  kaito: { f0: 128, formant: 1.04, breath: 0.05, grit: 0.10, vowels: ['e', 'a', 'ih'], rate: 1.0, gain: 0.20 },
  momo:  { f0: 214, formant: 1.16, breath: 0.16, grit: 0.02, vowels: ['e', 'a', 'i'], rate: 1.12, gain: 0.18 },
  goro:  { f0: 92,  formant: 0.92, breath: 0.04, grit: 0.26, vowels: ['o', 'u', 'oh'], rate: 0.84, gain: 0.22 },
  bibi:  { f0: 176, formant: 1.10, breath: 0.08, grit: 0.08, vowels: ['a', 'oh', 'e'], rate: 1.18, gain: 0.21 },
  yuna:  { f0: 246, formant: 1.20, breath: 0.22, grit: 0.02, vowels: ['i', 'e', 'ae'], rate: 0.95, gain: 0.17 },
  sable: { f0: 158, formant: 1.02, breath: 0.07, grit: 0.06, vowels: ['eh', 'a', 'ih'], rate: 1.05, gain: 0.19 },
};
const DEFAULT_PROFILE = { f0: 140, formant: 1, breath: 0.08, grit: 0.08, vowels: ['a', 'e', 'o'], rate: 1, gain: 0.29 };

/* Onset consonants: how the syllable starts, not what it says. */
const ONSETS = [
  { kind: 'plosive', band: 1400, gain: 0.10, len: 0.022 }, // t / k / p — a click
  { kind: 'fricative', band: 4200, gain: 0.055, len: 0.055 }, // s / sh — a hiss
  { kind: 'soft', band: 900, gain: 0.035, len: 0.03 }, // m / n — a hum
];

/* One voiced syllable: glottal saw + square body through two formant filters.
   That is a crude but very recognisable "voice" and it costs nothing. */
function syllable(c, prof, { f0, vowel, onset, dur, gain, pan, at, rise }) {
  const [F1, F2] = (VOWELS[vowel] || VOWELS.a).map((f) => f * prof.formant);
  const now = c.currentTime + at;
  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, now);
  env.gain.linearRampToValueAtTime(gain, now + Math.min(0.03, dur * 0.22));
  env.gain.exponentialRampToValueAtTime(gain * 0.55, now + dur * 0.6);
  env.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  const f1 = c.createBiquadFilter();
  f1.type = 'bandpass'; f1.frequency.value = F1; f1.Q.value = 5.5;
  const f2 = c.createBiquadFilter();
  f2.type = 'bandpass'; f2.frequency.value = F2; f2.Q.value = 7.5;
  /* A third, quiet formant around 2.8kHz. Without it the voice reads as a
     buzzer: F1/F2 alone carry no "t" or "s" colour and the result sounds like
     a synth patch rather than a person. */
  const f3 = c.createBiquadFilter();
  f3.type = 'bandpass'; f3.frequency.value = 2800 * prof.formant; f3.Q.value = 6;
  const body = c.createGain();
  body.gain.value = 1;
  const hp = c.createBiquadFilter(); // kill rumble so the mix stays clear
  hp.type = 'highpass'; hp.frequency.value = 110;

  const osc = c.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(Math.max(40, f0 * (1 + rise)), now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, f0 * (1 - rise * 0.8)), now + dur);
  const sub = c.createOscillator();
  sub.type = 'square';
  sub.frequency.setValueAtTime(Math.max(40, f0 * 0.5), now);

  const g2 = c.createGain(); g2.gain.value = 0.85;   // F2 carries the vowel colour
  const g3 = c.createGain(); g3.gain.value = 0.22;   // F3 adds presence
  osc.connect(f1).connect(body);
  osc.connect(f2).connect(g2).connect(body);
  osc.connect(f3).connect(g3).connect(body);
  if (prof.breath > 0) {
    const air = c.createGain(); air.gain.value = prof.breath;
    osc.connect(air).connect(body);                   // unfiltered = breath
  }
  if (prof.grit > 0) {
    const rasp = c.createGain(); rasp.gain.value = prof.grit * 0.35;
    sub.connect(rasp).connect(body);
  }
  body.connect(hp).connect(env);
  output(c, env, { pan, send: 0.12 });
  osc.start(now); sub.start(now);
  osc.stop(now + dur + 0.03); sub.stop(now + dur + 0.03);

  if (onset && onset.gain > 0.005) {
    noiseBurst(onset.len, {
      gain: onset.gain * sfxVolume * 1.5, band: onset.band, q: 1.1,
      delay: at, pan, send: 0.05, attack: 0.004,
    });
  }
}

/* The card's whole utterance. */
export function cardVoice(cardId = '', charId = null) {
  if (muted) return;
  const c = ac();
  if (!c) return;
  const prof = VOICE_PROFILE[charId] || DEFAULT_PROFILE;
  const seed = hash32(`${charId}:${cardId || 'x'}`);
  const rnd = mulberry32(seed);

  // 1-3 syllables; short cards bark once, dense ones get a phrase.
  const count = 1 + Math.floor(rnd() * 3);
  const contour = rnd();                       // 0 = falling (command), 1 = rising (question)
  const pan = (rnd() * 2 - 1) * 0.18;
  const baseRate = 0.10 / prof.rate;           // syllable length, character tempo
  let at = 0;
  for (let i = 0; i < count; i++) {
    const vowel = prof.vowels[Math.floor(rnd() * prof.vowels.length)];
    const onset = ONSETS[Math.floor(rnd() * ONSETS.length)];
    const dur = baseRate * (0.82 + rnd() * 0.62);
    const f0 = prof.f0 * (0.9 + rnd() * 0.24) * (1 + (contour - 0.5) * 0.10 * i);
    const rise = 0.06 + rnd() * 0.12;
    syllable(c, prof, {
      f0, vowel, onset, dur,
      gain: prof.gain * (i === count - 1 ? 1 : 0.82) * BUS_GAIN,
      pan: pan * (1 - i * 0.15), at, rise,
    });
    at += dur * (0.86 + rnd() * 0.3);
  }
  // A tiny tick on the tail gives every card an audible fingerprint without
  // becoming a beep in the middle of the phrase.
  tone(prof.f0 * (2 + (seed % 7) / 10), 0.045, {
    type: 'sine', gain: 0.02, delay: at, pan, send: 0.22, exact: true,
  });
}


let activeAudio = null;

export function bark(charId, kind = 'attack', cardId = null) {
  const bank = BARK_LINES[charId];
  const raw = bank ? bank[kind] : null;
  const line = Array.isArray(raw) ? raw[Math.floor(Math.random() * raw.length)] : raw;

  // Card plays: one distinct utterance per card, derived from its id.
  if (!muted && kind === 'attack') {
    cardVoice(cardId || charId, charId);
    return line || '';
  }
  if (!muted) {
    const clipKey = `${charId}:ego`; // only Ego activations still use a clip
    const src = VOICE_CLIPS[clipKey];
    if (src && typeof Audio !== 'undefined') {
      try {
        if (activeAudio) { activeAudio.pause(); activeAudio.currentTime = 0; }
        const a = voiceCache[src] || new Audio(src);
        voiceCache[src] = a;
        a.currentTime = 0;
        a.volume = 0.85 * sfxVolume;
        activeAudio = a;
        a.play().catch(() => cardVoice(cardId || kind, charId));
      } catch {
        cardVoice(cardId || kind, charId);
      }
    } else {
      cardVoice(cardId || kind, charId);
    }
  }
  return line || '';
}

export const isMuted = () => muted;

// Master SFX/voice volume (Settings slider), persisted.
let sfxVolume = 0.9;
try { const v = parseFloat(localStorage.getItem('cw_sfx_vol')); if (!Number.isNaN(v)) sfxVolume = Math.max(0, Math.min(1, v)); } catch { /* ignore */ }
export const getSfxVolume = () => sfxVolume;
export function setSfxVolume(v) {
  sfxVolume = Math.max(0, Math.min(1, Number(v) || 0));
  try { localStorage.setItem('cw_sfx_vol', String(sfxVolume)); } catch { /* ignore */ }
}

export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* ignore */ }
  return muted;
}
