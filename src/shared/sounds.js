// Ambient sound catalogue and spatial-audio tuning shared by dungeon
// generation, the server snapshot filter, and browser playback.

export const AMBIENT_POINT_COUNT = 12;
// Ambient tuning lives here so generation, server delivery, and browser audio
// stay in sync. Gain only affects ambience; footsteps keep their own levels.
export const AMBIENT_MAX_DIST = 10;
export const AMBIENT_REF_DIST = 1.5;
export const AMBIENT_GAIN = 0.30;

export const AMBIENT_SOUNDS = [
  { id: 'behind_you', url: '/sfx/behind-you-whisper-whisper-horror-scary-creepy-spooky-pjhodson.wav', dur: 3.0 },
  { id: 'go_outside', url: '/sfx/creepy-whisper-go-outside-whisper-frightening-creepy-ghostly-acekasbo.wav', dur: 9.0 },
  { id: 'creepy_whispering', url: '/sfx/creepy-whispering-1-whisper-echo-alien-vocal-whispering-danlucaz.wav', dur: 20.3 },
  { id: 'come_with_us', url: '/sfx/ghostly-whisper-saying-come-with-us-3.wav', dur: 26.6 },
  { id: 'over_here', url: '/sfx/over-here.wav', dur: 2.7 },
  { id: 'i_see_you', url: '/sfx/scary-i-see-you.wav', dur: 5.9 },
  { id: 'scream', url: '/sfx/scary-scream-sound-effect-hd.wav', dur: 5.1 },
  { id: 'sollosos', url: '/sfx/sollosos-kim-whisper-horror-kim-evil-splushionsin.wav', dur: 38.7 },
  { id: 'whisper', url: '/sfx/whisper.wav', dur: 2.8 },
  { id: 'whisper_crowd', url: '/sfx/whispers-crowd.wav', dur: 9.0 },
  { id: 'mixed_whispers', url: '/sfx/whispers-male-female-inarticulate-neutral-medium-2.wav', dur: 18.7 },
];
