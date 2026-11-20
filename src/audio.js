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

export const VOICE_CLIPS = {
  'kaito:attack': 'audio/kaito-atk.mp3',
  'kaito:ego': 'audio/kaito-ego.mp3',
  'momo:attack': 'audio/momo-atk.mp3',
  'momo:ego': 'audio/momo-ego.mp3',
  'goro:attack': 'audio/goro-atk.mp3',
  'goro:ego': 'audio/goro-ego.mp3',
  'bibi:attack': 'audio/bibi-atk.mp3',
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
  if (ctx && ctx.createGain && !ctx._master) {
    try {
      const master = ctx.createGain();
      master.gain.value = 0.92;
      master.connect(ctx.destination);
      ctx._master = master;
    } catch { /* fall back to direct destination */ }
  }
  return ctx;
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

// Tiny random detune so the same sound never plays identically twice.
const vary = (f, amt = 0.05) => f * (1 + (Math.random() * 2 - 1) * amt);
// Log-scaled loudness: a 200-damage hit is weightier, not 10x louder.
const dmgGain = (amt, base = 0.05, cap = 0.1) => base + Math.min(cap, Math.log10(Math.max(1, amt)) * 0.032);

function tone(freq, dur, { type = 'triangle', gain = 0.09, slideTo = null, delay = 0, exact = false } = {}) {
  const c = ac();
  if (!c) return;
  const now = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  const f = exact ? freq : vary(freq, 0.035);
  osc.type = type;
  osc.frequency.setValueAtTime(f, now);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, exact ? slideTo : vary(slideTo, 0.035)), now + dur);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(gain * sfxVolume, now + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(g).connect(out(c));
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

function noiseBurst(dur, { gain = 0.08, highpass = 600, delay = 0 } = {}) {
  const c = ac();
  if (!c || !c.createBuffer) return;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filt = c.createBiquadFilter();
  filt.type = 'highpass';
  filt.frequency.value = highpass;
  const g = c.createGain();
  const now = c.currentTime + delay;
  g.gain.setValueAtTime(gain * sfxVolume, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(filt).connect(g).connect(out(c));
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
      tone(520, 0.05, { type: 'sine', gain: 0.05, slideTo: 660 });
      break;
    case 'draw':
      noiseBurst(0.08, { gain: 0.05, highpass: 1400 });
      tone(420, 0.06, { type: 'sine', gain: 0.03, slideTo: 580 });
      break;
    case 'slash':
      noiseBurst(0.14, { gain: 0.12, highpass: 900 });
      tone(290, 0.15, { type: 'sawtooth', gain: 0.08, slideTo: 85 });
      break;
    case 'weak':
      noiseBurst(0.16, { gain: 0.13, highpass: 1200 });
      tone(440, 0.12, { type: 'triangle', gain: 0.1, slideTo: 880 });
      tone(660, 0.16, { type: 'sine', gain: 0.09, slideTo: 1040, delay: 0.04 });
      break;
    case 'shield':
      tone(320, 0.14, { type: 'triangle', gain: 0.08, slideTo: 480 });
      tone(640, 0.18, { type: 'sine', gain: 0.05, delay: 0.04 });
      break;
    case 'heal':
      tone(440, 0.16, { type: 'sine', gain: 0.07 });
      tone(554, 0.18, { type: 'sine', gain: 0.07, delay: 0.06 });
      tone(659, 0.24, { type: 'sine', gain: 0.07, delay: 0.12 });
      break;
    case 'buff':
    case 'celestial':
      tone(392, 0.12, { type: 'triangle', gain: 0.07 });
      tone(587, 0.2, { type: 'triangle', gain: 0.08, delay: 0.05 });
      break;
    case 'break':
      noiseBurst(0.28, { gain: 0.16, highpass: 350 });
      tone(160, 0.34, { type: 'sawtooth', gain: 0.12, slideTo: 52 });
      tone(784, 0.28, { type: 'triangle', gain: 0.1, slideTo: 1175, delay: 0.07 });
      break;
    case 'phase':
      tone(180, 0.3, { type: 'sawtooth', gain: 0.11, slideTo: 90 });
      tone(270, 0.35, { type: 'square', gain: 0.07, slideTo: 540, delay: 0.08 });
      break;
    case 'hurt':
      noiseBurst(0.14, { gain: 0.11, highpass: 250 });
      tone(140, 0.18, { type: 'sawtooth', gain: 0.1, slideTo: 65 });
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
      tone(988, 0.08, { type: 'sine', gain: 0.07 });
      tone(1318, 0.16, { type: 'sine', gain: 0.08, delay: 0.06 });
      break;
    case 'upgrade':
      tone(440, 0.1, { type: 'triangle', gain: 0.08 });
      tone(659, 0.12, { type: 'triangle', gain: 0.08, delay: 0.06 });
      tone(880, 0.22, { type: 'sine', gain: 0.09, delay: 0.12 });
      break;
    case 'win':
      tone(523, 0.14, { type: 'triangle', gain: 0.09 });
      tone(659, 0.14, { type: 'triangle', gain: 0.09, delay: 0.09 });
      tone(784, 0.16, { type: 'triangle', gain: 0.1, delay: 0.18 });
      tone(1046, 0.36, { type: 'sine', gain: 0.11, delay: 0.27 });
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
      tone(523, 0.12, { type: 'sine', gain: 0.08 });
      tone(784, 0.16, { type: 'sine', gain: 0.09, delay: 0.06 });
      tone(1046, 0.24, { type: 'triangle', gain: 0.09, delay: 0.12 });
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

let activeAudio = null;

export function bark(charId, kind = 'attack') {
  const bank = BARK_LINES[charId];
  const raw = bank ? bank[kind] : null;
  const line = Array.isArray(raw) ? raw[Math.floor(Math.random() * raw.length)] : raw;

  if (!muted) {
    const clipKey = `${charId}:${kind === 'ego' ? 'ego' : 'attack'}`;
    const src = VOICE_CLIPS[clipKey];
    if (src && typeof Audio !== 'undefined') {
      try {
        if (activeAudio) { activeAudio.pause(); activeAudio.currentTime = 0; }
        const a = voiceCache[src] || new Audio(src);
        voiceCache[src] = a;
        a.currentTime = 0;
        a.volume = 0.85 * sfxVolume;
        activeAudio = a;
        a.play().catch(() => {
          const base = CHAR_PITCH[charId] || 300;
          tone(base, 0.09, { type: 'triangle', gain: 0.05, slideTo: base * 1.18 });
        });
      } catch {
        const base = CHAR_PITCH[charId] || 300;
        tone(base, 0.09, { type: 'triangle', gain: 0.05, slideTo: base * 1.18 });
      }
    } else {
      const base = CHAR_PITCH[charId] || 300;
      tone(base, 0.09, { type: 'triangle', gain: 0.05, slideTo: base * 1.18 });
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
