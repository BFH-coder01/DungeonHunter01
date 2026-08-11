// Procedurally-synthesised ambient dungeon sound — no audio files, same
// zero-asset approach as the visuals. Three kinds of ambience:
//   - drips: anchored to fixed points scattered through the level, fading
//     in/out with distance via a Web Audio PannerNode.
//   - distant ambience (scream/growl/chain/creak/wind): no fixed source —
//     each time one fires, a virtual source position is rolled at a random
//     distance/direction from the player, heavily weighted toward "far
//     away" (screams in particular should almost never be closer than 30
//     tiles). A pool of five instead of just scream+growl so it doesn't
//     read as the same two sounds on loop.
//   - whispers: rare, close, directional startles — "I see you" panned hard
//     to one ear. Caveat: the Web Speech API (browser text-to-speech) has
//     no way to route its output through the Web Audio panning graph, so
//     the *words* always play centered/both ears — only the accompanying
//     breath cue is genuinely panned left/right. Flagged clearly rather
//     than pretending the words themselves are spatialised.

import { TILE } from '/shared/constants.js';

const DRIP_COUNT = 9;
const DRIP_MIN_INTERVAL_MS = 3000, DRIP_MAX_INTERVAL_MS = 9000;
const DRIP_MAX_DIST = 13; // tiles — a local detail, not audible dungeon-wide
const DRIP_REF_DIST = 1.2;

const AMBIENT_MIN_INTERVAL_MS = 18000, AMBIENT_MAX_INTERVAL_MS = 42000;
const AMBIENT_MIN_DIST = 30, AMBIENT_MAX_DIST = 110;
const AMBIENT_REF_DIST = 12;

const WHISPER_MIN_INTERVAL_MS = 55000, WHISPER_MAX_INTERVAL_MS = 150000;
const WHISPER_PHRASES = [
  'I see you', 'over here', 'behind you', 'closer now',
  'run', 'found you', "don't look", 'they are near',
];

export function createAmbientAudio() {
  let ctx = null;
  let masterGain = null;
  let noiseBuffer = null;
  let width = 0, height = 0, map = null;
  let dungeonReady = false;
  let scheduling = false;
  let dripHandles = [];
  let listenerX = 0, listenerY = 0;

  function ensureContext() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.6;
    masterGain.connect(ctx.destination);
    noiseBuffer = makeBrownNoise(ctx, 2);
  }

  function makeBrownNoise(ac, seconds) {
    const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * seconds), ac.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 2.8;
    }
    return buf;
  }

  function makePanner(x, y, maxDist, refDist) {
    const p = ctx.createPanner();
    p.panningModel = 'equalpower';
    p.distanceModel = 'linear';
    p.refDistance = refDist;
    p.maxDistance = maxDist;
    p.rolloffFactor = 1;
    if (p.positionX) {
      p.positionX.value = x; p.positionY.value = 0; p.positionZ.value = y;
    } else {
      p.setPosition(x, 0, y);
    }
    p.connect(masterGain);
    return p;
  }

  function playDrip(x, y) {
    const panner = makePanner(x, y, DRIP_MAX_DIST, DRIP_REF_DIST);
    const t0 = ctx.currentTime;
    const startHz = 1100 + Math.random() * 500;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startHz, t0);
    osc.frequency.exponentialRampToValueAtTime(startHz * 0.55, t0 + 0.18);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.9, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);

    osc.connect(g);
    g.connect(panner);
    osc.start(t0);
    osc.stop(t0 + 0.24);
  }

  function playScream(x, y) {
    const panner = makePanner(x, y, AMBIENT_MAX_DIST, AMBIENT_REF_DIST);
    const t0 = ctx.currentTime;
    const dur = 0.9 + Math.random() * 0.5;
    const base = 340 + Math.random() * 120;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(base, t0);
    osc.frequency.linearRampToValueAtTime(base * 2.4, t0 + dur * 0.35);
    osc.frequency.exponentialRampToValueAtTime(base * 0.7, t0 + dur);

    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = 900;
    filt.Q.value = 0.7;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.8, t0 + dur * 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(filt);
    filt.connect(g);
    g.connect(panner);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function playGrowl(x, y) {
    const panner = makePanner(x, y, AMBIENT_MAX_DIST, AMBIENT_REF_DIST);
    const t0 = ctx.currentTime;
    const dur = 1.6 + Math.random() * 1.0;

    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;

    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(170, t0);
    filt.frequency.linearRampToValueAtTime(260, t0 + dur * 0.5);
    filt.frequency.linearRampToValueAtTime(150, t0 + dur);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.5, t0 + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    src.connect(filt);
    filt.connect(g);
    g.connect(panner);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  function playChainClank(x, y) {
    const panner = makePanner(x, y, AMBIENT_MAX_DIST, AMBIENT_REF_DIST);
    const t0 = ctx.currentTime;
    const links = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < links; i++) {
      const dt = i * (0.09 + Math.random() * 0.06);
      const base = 500 + Math.random() * 400;
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(base, t0 + dt);
      osc.frequency.exponentialRampToValueAtTime(base * 0.6, t0 + dt + 0.12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0 + dt);
      g.gain.exponentialRampToValueAtTime(0.5, t0 + dt + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.16);
      osc.connect(g);
      g.connect(panner);
      osc.start(t0 + dt);
      osc.stop(t0 + dt + 0.2);
    }
  }

  function playCreak(x, y) {
    const panner = makePanner(x, y, AMBIENT_MAX_DIST, AMBIENT_REF_DIST);
    const t0 = ctx.currentTime;
    const dur = 1.4 + Math.random() * 1.2;
    const base = 90 + Math.random() * 60;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(base, t0);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 1.2 + Math.random();
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = base * 0.15;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.4, t0 + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(g);
    g.connect(panner);
    osc.start(t0); lfo.start(t0);
    osc.stop(t0 + dur + 0.05); lfo.stop(t0 + dur + 0.05);
  }

  function playWindMoan(x, y) {
    const panner = makePanner(x, y, AMBIENT_MAX_DIST, AMBIENT_REF_DIST);
    const t0 = ctx.currentTime;
    const dur = 2.2 + Math.random() * 1.2;

    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;

    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.Q.value = 3;
    filt.frequency.setValueAtTime(300, t0);
    filt.frequency.linearRampToValueAtTime(700, t0 + dur * 0.5);
    filt.frequency.linearRampToValueAtTime(250, t0 + dur);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.45, t0 + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    src.connect(filt);
    filt.connect(g);
    g.connect(panner);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  // Directional breath/hiss before a whisper — the one part of the whisper
  // that's genuinely panned to a single ear (see file header caveat).
  function playWhisperBreath(pan) {
    const t0 = ctx.currentTime;
    const dur = 0.5 + Math.random() * 0.3;

    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = 1800 + Math.random() * 800;
    filt.Q.value = 0.6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.35, t0 + dur * 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    src.connect(filt);
    filt.connect(g);
    if (ctx.createStereoPanner) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = pan;
      g.connect(panner);
      panner.connect(masterGain);
    } else {
      g.connect(masterGain);
    }
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  function speakWhisper(phrase) {
    if (!('speechSynthesis' in window)) return;
    const utter = new SpeechSynthesisUtterance(phrase);
    utter.volume = 0.4;
    utter.rate = 0.82;
    utter.pitch = 0.75;
    window.speechSynthesis.speak(utter);
  }

  // Biases the roll heavily toward `max` (far/faint), rarely down near `min`.
  function rollFarDistance(min, max) {
    const u = Math.random();
    return max - (max - min) * Math.pow(u, 3);
  }

  const AMBIENT_SOUNDS = [playScream, playGrowl, playChainClank, playCreak, playWindMoan];

  function scheduleAmbient() {
    const delay = AMBIENT_MIN_INTERVAL_MS + Math.random() * (AMBIENT_MAX_INTERVAL_MS - AMBIENT_MIN_INTERVAL_MS);
    setTimeout(() => {
      const dist = rollFarDistance(AMBIENT_MIN_DIST, AMBIENT_MAX_DIST);
      const angle = Math.random() * Math.PI * 2;
      const x = listenerX + Math.cos(angle) * dist;
      const y = listenerY + Math.sin(angle) * dist;
      AMBIENT_SOUNDS[Math.floor(Math.random() * AMBIENT_SOUNDS.length)](x, y);
      scheduleAmbient();
    }, delay);
  }

  function scheduleWhisper() {
    const delay = WHISPER_MIN_INTERVAL_MS + Math.random() * (WHISPER_MAX_INTERVAL_MS - WHISPER_MIN_INTERVAL_MS);
    setTimeout(() => {
      const pan = Math.random() < 0.5 ? -0.9 : 0.9;
      playWhisperBreath(pan);
      const phrase = WHISPER_PHRASES[Math.floor(Math.random() * WHISPER_PHRASES.length)];
      setTimeout(() => speakWhisper(phrase), 220);
      scheduleWhisper();
    }, delay);
  }

  function scheduleDrip(pt) {
    let timer;
    const fire = () => {
      playDrip(pt.x, pt.y);
      timer = setTimeout(fire, DRIP_MIN_INTERVAL_MS + Math.random() * (DRIP_MAX_INTERVAL_MS - DRIP_MIN_INTERVAL_MS));
    };
    timer = setTimeout(fire, Math.random() * DRIP_MAX_INTERVAL_MS);
    return { clear: () => clearTimeout(timer) };
  }

  function placeDripPoints() {
    if (!ctx || !map || !width || !height) return;
    for (const h of dripHandles) h.clear();
    dripHandles = [];

    const floors = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (map[y * width + x] === TILE.FLOOR) floors.push({ x: x + 0.5, y: y + 0.5 });
      }
    }
    if (!floors.length) return;

    const n = Math.min(DRIP_COUNT, floors.length);
    for (let i = 0; i < n; i++) {
      const pt = floors[Math.floor(Math.random() * floors.length)];
      dripHandles.push(scheduleDrip(pt));
    }
  }

  return {
    // Must be called from inside a user-gesture handler (e.g. the join
    // button's click) — browsers won't let an AudioContext produce sound
    // otherwise.
    start() {
      ensureContext();
      if (ctx.state === 'suspended') ctx.resume();
      if (!scheduling) {
        scheduling = true;
        scheduleAmbient();
        scheduleWhisper();
        if (dungeonReady) placeDripPoints();
      }
    },
    setDungeon(w, h, m) {
      width = w; height = h; map = m;
      dungeonReady = true;
      if (ctx) placeDripPoints();
    },
    updateListener(x, y, angle) {
      listenerX = x; listenerY = y;
      if (!ctx) return;
      const l = ctx.listener;
      const fx = Math.cos(angle), fy = Math.sin(angle);
      if (l.positionX) {
        l.positionX.value = x; l.positionY.value = 0; l.positionZ.value = y;
        l.forwardX.value = fx; l.forwardY.value = 0; l.forwardZ.value = fy;
        l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0;
      } else {
        l.setPosition(x, 0, y);
        l.setOrientation(fx, 0, fy, 0, 1, 0);
      }
    },
  };
}
