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

const CHAR_PITCH = { kaito: 260, momo: 460, goro: 155, bibi: 390, yuna: 520 };

function ac() {
  if (muted) return null;
  if (ctx) {
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume().catch(() => {});
    return ctx;
  }
  const Ctor = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!Ctor) return null;
  try { ctx = new Ctor(); } catch { ctx = null; }
  return ctx;
}

function tone(freq, dur, { type = 'triangle', gain = 0.09, slideTo = null, delay = 0 } = {}) {
  const c = ac();
  if (!c) return;
  const now = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), now + dur);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(gain, now + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(g).connect(c.destination);
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
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(filt).connect(g).connect(c.destination);
  src.start(now);
}

export function sfx(kind) {
  if (muted) return;
  switch (kind) {
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
        a.volume = 0.85;
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

export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* ignore */ }
  return muted;
}
