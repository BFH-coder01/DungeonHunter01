// Footstep audio + fixed ambient sound points, both using real audio files
// (public/sfx/*.wav, user-supplied). Procedurally-synthesised ambience was
// tried first — live oscillators, then an offline-rendered version with
// layered oscillators and hand-rolled biquad filters — and dropped both
// times as too harsh/artificial, a real ceiling on hand-synthesised sound
// design without actual recordings.

import { AMBIENT_GAIN, AMBIENT_MAX_DIST, AMBIENT_REF_DIST, AMBIENT_SOUNDS } from '/shared/sounds.js';

const FOOTSTEP_MAX_DIST = 16; // tiles — footsteps are a subtle, local cue
const FOOTSTEP_REF_DIST = 1.5;
const FADE_SEC = 0.18;

const SOUND_BY_ID = new Map(AMBIENT_SOUNDS.map((sound) => [sound.id, sound]));

export function createAmbientAudio() {
  let ctx = null;
  let masterGain = null;
  let ambientGain = null;
  let footstepsBuffer = null;
  const ambientBuffers = new Map(); // sound id -> AudioBuffer
  const activeLoops = new Map(); // key ('self' or player id) -> { source, gain, panner }
  const queuedPoints = new Map(); // server points received before installation
  const installedPointIds = new Set();

  function ensureContext() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.8;
    masterGain.connect(ctx.destination);
    ambientGain = ctx.createGain();
    ambientGain.gain.value = AMBIENT_GAIN;
    ambientGain.connect(masterGain);

    loadBuffer('/sfx/footsteps.wav').then((buf) => { footstepsBuffer = buf; });
    for (const sound of AMBIENT_SOUNDS) {
      loadBuffer(sound.url).then((buf) => {
        if (buf) ambientBuffers.set(sound.id, buf);
      });
    }
  }

  function loadBuffer(url) {
    return fetch(url)
      .then((res) => res.arrayBuffer())
      .then((arr) => ctx.decodeAudioData(arr))
      .catch((err) => { console.warn('[audio] failed to load', url, err); return null; });
  }

  function makePanner(x, y, maxDist, refDist, output = masterGain) {
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
    p.connect(output);
    return p;
  }

  function updatePannerPos(panner, x, y) {
    if (panner.positionX) { panner.positionX.value = x; panner.positionZ.value = y; }
    else panner.setPosition(x, 0, y);
  }

  // --- footsteps (unchanged behaviour) -----------------------------------

  function startLoop(key, x, y, isSelf) {
    const src = ctx.createBufferSource();
    src.buffer = footstepsBuffer;
    src.loop = true;
    src.playbackRate.value = 0.92 + Math.random() * 0.24;

    const gain = ctx.createGain();
    const target = isSelf ? 0.16 : 0.55;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(target, ctx.currentTime + FADE_SEC);

    let panner = null;
    if (isSelf) {
      src.connect(gain);
      gain.connect(masterGain);
    } else {
      panner = makePanner(x, y, FOOTSTEP_MAX_DIST, FOOTSTEP_REF_DIST);
      src.connect(gain);
      gain.connect(panner);
    }
    src.start();
    activeLoops.set(key, { source: src, gain, panner });
  }

  function stopLoop(key) {
    const entry = activeLoops.get(key);
    if (!entry) return;
    activeLoops.delete(key);
    const { source, gain } = entry;
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0.0001, now + FADE_SEC);
    setTimeout(() => { try { source.stop(); } catch { /* already stopped */ } }, (FADE_SEC + 0.05) * 1000);
  }

  // --- ambient points -----------------------------------------------------
  // Locations and clip assignments are generated once by the server. The
  // browser only schedules playback and applies listener-relative panning and
  // linear distance attenuation.
  function playAmbient(soundId, panner) {
    const buf = ambientBuffers.get(soundId);
    if (!buf || ctx.state !== 'running') return false;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = 0.97 + Math.random() * 0.06;
    src.connect(panner);
    src.start();
    return true;
  }

  function scheduleClip(sound, panner) {
    const minMs = Math.max(12000, sound.dur * 1400);
    const maxMs = minMs + Math.max(20000, sound.dur * 2000);
    const fire = () => {
      // Large WAVs may still be decoding when a point is first installed.
      // Retry promptly instead of turning one miss into another minute of silence.
      if (!playAmbient(sound.id, panner)) {
        setTimeout(fire, 1000);
        return;
      }
      setTimeout(fire, minMs + Math.random() * (maxMs - minMs));
    };
    setTimeout(fire, 1000 + Math.random() * 3000);
  }

  function installQueuedPoints() {
    if (!ctx) return;
    for (const point of queuedPoints.values()) {
      if (installedPointIds.has(point.id)) continue;
      installedPointIds.add(point.id);
      if (point.mode === 'group') {
        const panner = makePanner(point.x, point.y, AMBIENT_MAX_DIST, AMBIENT_REF_DIST, ambientGain);
        for (const clip of point.clips) {
          const sound = SOUND_BY_ID.get(clip.soundId);
          if (sound) scheduleClip(sound, panner);
        }
      } else {
        for (const clip of point.clips) {
          const sound = SOUND_BY_ID.get(clip.soundId);
          if (!sound) continue;
          const panner = makePanner(clip.x, clip.y, AMBIENT_MAX_DIST, AMBIENT_REF_DIST, ambientGain);
          scheduleClip(sound, panner);
        }
      }
    }
  }

  return {
    // Must be called from inside a user-gesture handler (e.g. the join
    // button's click) — browsers won't let an AudioContext produce sound
    // otherwise.
    start() {
      ensureContext();
      if (ctx.state === 'suspended') ctx.resume();
      installQueuedPoints();
    },
    // Adds authoritative server-generated sources as the player comes within
    // audible range. Points are installed once and retain their fixed panners.
    setSoundPoints(points) {
      for (const point of points) queuedPoints.set(point.id, point);
      installQueuedPoints();
    },
    // Call every frame/update for 'self' and for each currently-visible
    // other player. Starts/stops/repositions their footstep loop as needed.
    setMoving(key, moving, x, y, isSelf = false) {
      if (!ctx || !footstepsBuffer) return;
      const entry = activeLoops.get(key);
      if (moving) {
        if (entry) { if (entry.panner) updatePannerPos(entry.panner, x, y); }
        else startLoop(key, x, y, isSelf);
      } else if (entry) {
        stopLoop(key);
      }
    },
    // Stops any footstep loop for a player who's no longer present (left,
    // died, went out of fog) without needing a final "moving:false" call.
    clearMissing(presentKeys) {
      for (const key of Array.from(activeLoops.keys())) {
        if (key !== 'self' && !presentKeys.has(key)) stopLoop(key);
      }
    },
    updateListener(x, y, angle) {
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
