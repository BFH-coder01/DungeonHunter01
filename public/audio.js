// Footstep audio. Procedurally-synthesised ambience (drips/screams/growls/
// whispers) was tried first — both live-oscillator and offline-rendered —
// and dropped: it sounded harsh/artificial either way, a well-known limit
// of hand-rolled DSP without real recordings. This plays back a real audio
// file instead (public/sfx/footsteps.wav, user-supplied — a ~36s walking
// loop, not a single step hit), looped for the duration a player is moving
// and faded out when they stop, positioned spatially for other players so
// you can hear someone approaching.

const FOOTSTEP_MAX_DIST = 16; // tiles — footsteps are a subtle, local cue
const FOOTSTEP_REF_DIST = 1.5;
const FADE_SEC = 0.18;

export function createAmbientAudio() {
  let ctx = null;
  let masterGain = null;
  let footstepsBuffer = null;
  const activeLoops = new Map(); // key ('self' or player id) -> { source, gain, panner }

  function ensureContext() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.8;
    masterGain.connect(ctx.destination);
    fetch('/sfx/footsteps.wav')
      .then((res) => res.arrayBuffer())
      .then((arr) => ctx.decodeAudioData(arr))
      .then((buf) => { footstepsBuffer = buf; })
      .catch((err) => console.warn('[audio] failed to load footsteps.wav', err));
  }

  function makePanner(x, y) {
    const p = ctx.createPanner();
    p.panningModel = 'equalpower';
    p.distanceModel = 'linear';
    p.refDistance = FOOTSTEP_REF_DIST;
    p.maxDistance = FOOTSTEP_MAX_DIST;
    p.rolloffFactor = 1;
    if (p.positionX) {
      p.positionX.value = x; p.positionY.value = 0; p.positionZ.value = y;
    } else {
      p.setPosition(x, 0, y);
    }
    return p;
  }

  function updatePannerPos(panner, x, y) {
    if (panner.positionX) { panner.positionX.value = x; panner.positionZ.value = y; }
    else panner.setPosition(x, 0, y);
  }

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
      panner = makePanner(x, y);
      src.connect(gain);
      gain.connect(panner);
      panner.connect(masterGain);
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

  return {
    // Must be called from inside a user-gesture handler (e.g. the join
    // button's click) — browsers won't let an AudioContext produce sound
    // otherwise.
    start() {
      ensureContext();
      if (ctx.state === 'suspended') ctx.resume();
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
