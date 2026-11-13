import { fn as e, tn as t } from "./system.js";
import { s as n } from "./logger.js";
import { $ as r, n as i, o as a, tt as o } from "./base.js";
import { cl as s, ll as c, sl as l } from "./webAppFactory.js";
import { o as u, p as d, s as f } from "./resourceManager.js";
import { i as p, n as m, r as h, t as g } from "./audioStreaming.js";
import { TextureContent as _ } from "../wasm.js";
import { i as v, r as y } from "./runtimeAssets.js";
import { a as b, n as x, o as S, r as C, t as w } from "./glTextureUpload.js";
import { t as ee } from "./primaryPointer.js";
import { t as te } from "./recordingClock.js";
import { a as T, n as E, t as D } from "./types.js";
import { n as O, t as ne } from "./core.js";
import { r as re } from "./worldView.js";
//#region src/platform/webTextEditor.ts
const k = "-9999px";
function ie() {
	if (typeof document === "undefined" || !document.body) return null;
	const e = document.createElement("textarea");
	e.style.position = "fixed";
	e.style.left = k;
	e.style.top = k;
	e.style.width = "1px";
	e.style.height = "1px";
	e.style.opacity = "0";
	e.style.zIndex = "-1";
	e.style.pointerEvents = "none";
	e.style.border = "0";
	e.style.padding = "0";
	e.tabIndex = -1;
	e.dataset.estellaTextEditor = "true";
	e.autocomplete = "off";
	e.setAttribute("autocorrect", "off");
	e.setAttribute("autocapitalize", "off");
	e.setAttribute("spellcheck", "false");
	document.body.appendChild(e);
	return e;
}
function A() {
	const e = ie();
	if (!e) return null;
	const t = /* @__PURE__ */ new Set();
	const n = (e) => {
		for (const n of t) n(e);
	};
	let r = false;
	let i = false;
	const a = () => {
		if (!r) n({ kind: "change" });
	};
	const o = () => {
		r = true;
		n({
			kind: "composition",
			composing: true
		});
	};
	const s = () => n({
		kind: "composition",
		composing: true
	});
	const c = () => {
		r = false;
		n({
			kind: "composition",
			composing: false
		});
		n({ kind: "change" });
	};
	const l = (e) => {
		if (r || e.isComposing || e.keyCode === 229) return;
		if (e.key === "Escape") {
			n({ kind: "cancel" });
			return;
		}
		if (e.key === "Enter" && !i) {
			e.preventDefault();
			n({ kind: "submit" });
			return;
		}
		n({ kind: "change" });
	};
	const u = () => {
		r = false;
		n({ kind: "blur" });
	};
	e.addEventListener("input", a);
	e.addEventListener("compositionstart", o);
	e.addEventListener("compositionupdate", s);
	e.addEventListener("compositionend", c);
	e.addEventListener("keydown", l);
	e.addEventListener("blur", u);
	const d = () => {
		if (e.style.left !== k) {
			e.style.left = k;
			e.style.top = k;
		}
	};
	return {
		focus(t, n) {
			r = false;
			i = n.multiline;
			if (n.maxLength > 0) e.maxLength = n.maxLength;
			else e.removeAttribute("maxlength");
			e.value = t.value;
			e.selectionStart = t.selectionStart;
			e.selectionEnd = t.selectionEnd;
			e.focus();
		},
		blur() {
			d();
			e.blur();
		},
		read() {
			const t = e.value;
			return {
				value: t,
				selectionStart: e.selectionStart ?? t.length,
				selectionEnd: e.selectionEnd ?? t.length,
				backward: e.selectionDirection === "backward"
			};
		},
		write(t) {
			if (e.value !== t.value) e.value = t.value;
			e.selectionStart = t.selectionStart;
			e.selectionEnd = t.selectionEnd;
		},
		setCaretAnchor(t, n) {
			e.style.left = Math.round(t) + "px";
			e.style.top = Math.round(n) + "px";
		},
		subscribe(e) {
			t.add(e);
			return () => {
				t.delete(e);
			};
		},
		dispose() {
			e.removeEventListener("input", a);
			e.removeEventListener("compositionstart", o);
			e.removeEventListener("compositionupdate", s);
			e.removeEventListener("compositionend", c);
			e.removeEventListener("keydown", l);
			e.removeEventListener("blur", u);
			e.remove();
			t.clear();
		}
	};
}
//#endregion
//#region src/audio/WebAudioBackend.ts
var j = class {
	constructor(e, t, n, r, i, a, o, s = 0, c = 0, l = n.duration, u = a.currentTime) {
		this.playing_ = true;
		this.stopped_ = false;
		this.pausedAt_ = 0;
		this.id = e;
		this.source_ = t;
		this.buffer_ = n;
		this.lead_ = c;
		this.end_ = l;
		this.duration_ = l - c;
		this.poolNode_ = r;
		this.pool_ = i;
		this.context_ = a;
		this.startOffset_ = o;
		this.startedAt_ = u;
		this.playbackRate_ = t.playbackRate.value;
		this.loop_ = t.loop;
		this.loopStart_ = s;
		this.bindOnEnded_(t);
	}
	bindOnEnded_(e) {
		e.onended = () => {
			if (!this.stopped_ && this.playing_ && e === this.source_ && !this.loop_) {
				this.release_();
				this.onEnd?.();
			}
		};
	}
	stop() {
		if (this.stopped_) return;
		this.release_();
	}
	release_() {
		this.stopped_ = true;
		this.playing_ = false;
		if (this.source_) this.source_.onended = null;
		this.pool_.release(this.poolNode_);
		this.buffer_ = null;
		this.source_ = null;
		this.poolNode_ = null;
		this.pool_ = null;
		this.context_ = null;
	}
	pause() {
		if (!this.playing_ || this.stopped_) return;
		this.playing_ = false;
		const e = (this.context_.currentTime - this.startedAt_) * this.playbackRate_;
		this.pausedAt_ = this.startOffset_ + e;
		if (this.loop_ && this.buffer_.duration > 0) this.pausedAt_ = this.wrapped_(this.pausedAt_);
		this.source_.onended = null;
		try {
			this.source_.stop();
		} catch (e) {}
		this.source_.disconnect();
	}
	/** A place in the clip for a time since it began: past the end, it has been round from the loop's start. */
	wrapped_(e) {
		const t = this.end_;
		if (e < t) return e;
		const n = t - this.loopStart_;
		return n > 0 ? this.loopStart_ + (e - this.loopStart_) % n : e % t;
	}
	resume() {
		if (this.playing_ || this.stopped_) return;
		const e = this.context_.createBufferSource();
		let t;
		try {
			e.buffer = this.buffer_;
			e.loop = this.loop_;
			if (this.loop_ && (this.loopStart_ > 0 || this.end_ < this.buffer_.duration)) {
				e.loopStart = this.loopStart_;
				e.loopEnd = this.end_;
			}
			e.playbackRate.value = this.playbackRate_;
			e.connect(this.poolNode_.gain);
			this.bindOnEnded_(e);
			t = this.context_.currentTime;
			e.start(0, this.pausedAt_);
		} catch (t) {
			e.onended = null;
			try {
				e.stop();
			} catch (e) {}
			e.disconnect();
			throw t;
		}
		this.source_ = e;
		this.poolNode_.source = e;
		this.startOffset_ = this.pausedAt_;
		this.startedAt_ = t;
		this.playing_ = true;
	}
	setVolume(e) {
		if (this.stopped_) return;
		this.poolNode_.gain.gain.value = e;
	}
	setPan(e) {
		if (this.stopped_) return;
		this.poolNode_.panner.pan.value = e;
	}
	setLoop(e) {
		if (this.stopped_) return;
		this.loop_ = e;
		this.source_.loop = e;
	}
	setPlaybackRate(e) {
		if (this.stopped_) return;
		if (this.playing_) {
			const t = this.context_.currentTime;
			const n = this.startOffset_ + (t - this.startedAt_) * this.playbackRate_;
			this.source_.playbackRate.value = e;
			this.startOffset_ = n;
			this.startedAt_ = t;
		}
		this.playbackRate_ = e;
	}
	get isPlaying() {
		return this.playing_;
	}
	get currentTime() {
		if (this.stopped_) return 0;
		if (!this.playing_) return this.pausedAt_ - this.lead_;
		const e = (this.context_.currentTime - this.startedAt_) * this.playbackRate_;
		return this.startOffset_ + e - this.lead_;
	}
	get duration() {
		return this.duration_;
	}
};
/**
* A clip played from its compressed file through a media element, routed into the same pooled gain / pan
* and bus as a decoded one, so volume, buses, effects and fades treat it alike.
* Gives up a sample-accurate loop point and a second simultaneous voice: playing the clip again ends the first.
*/
var M = class {
	constructor(e, t, n, r, i, a, o, s, c = 0) {
		this.playing_ = false;
		this.stopped_ = false;
		this.loopFrom_ = 0;
		this.looping_ = false;
		this.id = e;
		this.element_ = t;
		this.node_ = n;
		this.poolNode_ = r;
		this.pool_ = i;
		this.duration_ = a;
		this.onRelease_ = o;
		this.ensureResumed_ = s;
		r.source = n;
		if (c > 0 && t.loop) {
			this.loopFrom_ = c;
			this.looping_ = true;
			t.loop = false;
		}
		t.onended = () => {
			if (this.stopped_ || t.loop) return;
			if (this.looping_ && this.playing_) {
				this.begin(this.loopFrom_);
				return;
			}
			this.release_();
			this.onEnd?.();
		};
	}
	/** Start (or restart) the element. A browser that blocks it until a gesture is retried once the context resumes. */
	begin(e) {
		const t = this.element_;
		if (!t) return;
		if (e > 0) t.currentTime = e;
		this.playing_ = true;
		const n = t.play();
		if (n) n.catch(async () => {
			if (this.stopped_ || !this.playing_) return;
			await this.ensureResumed_().catch(() => void 0);
			if (!this.stopped_ && this.playing_) await t.play().catch(() => {
				this.playing_ = false;
			});
		});
	}
	stop() {
		if (this.stopped_) return;
		this.release_();
	}
	release_() {
		this.stopped_ = true;
		this.playing_ = false;
		const e = this.element_;
		if (e) {
			e.onended = null;
			e.pause();
			e.removeAttribute("src");
			e.load();
		}
		this.node_?.disconnect();
		if (this.poolNode_ && this.pool_) this.pool_.release(this.poolNode_);
		this.element_ = null;
		this.node_ = null;
		this.poolNode_ = null;
		this.pool_ = null;
		this.onRelease_(this);
	}
	pause() {
		if (!this.playing_ || this.stopped_) return;
		this.playing_ = false;
		this.element_?.pause();
	}
	resume() {
		if (this.playing_ || this.stopped_) return;
		this.begin(0);
	}
	/** The host suspended the device: hold the element where it is. It still counts as playing, as a decoded voice does. */
	holdForSuspend() {
		if (!this.playing_ || this.stopped_) return false;
		this.element_?.pause();
		return true;
	}
	/** The device is running again: carry on from where the hold left the element. */
	continueAfterSuspend() {
		if (this.playing_ && !this.stopped_) this.begin(0);
	}
	setVolume(e) {
		if (this.stopped_) return;
		this.poolNode_.gain.gain.value = e;
	}
	setPan(e) {
		if (this.stopped_) return;
		this.poolNode_.panner.pan.value = e;
	}
	setLoop(e) {
		if (this.stopped_ || !this.element_) return;
		if (this.loopFrom_ > 0) this.looping_ = e;
		else this.element_.loop = e;
	}
	setPlaybackRate(e) {
		if (this.stopped_ || !this.element_) return;
		this.element_.playbackRate = e;
	}
	get isPlaying() {
		return this.playing_;
	}
	get currentTime() {
		return this.element_ ? this.element_.currentTime : 0;
	}
	get duration() {
		return this.duration_;
	}
};
/** How long to wait for an element's metadata before trusting the header estimate. */
const N = 3e3;
/** Decoded PCM size of a WebAudio buffer: frames × channels × 4 (Float32). */
function P(e) {
	return e.length * e.numberOfChannels * 4;
}
const F = {
	mp3: "audio/mpeg",
	wav: "audio/wav",
	ogg: "audio/ogg",
	m4a: "audio/mp4",
	aac: "audio/aac",
	flac: "audio/flac",
	webm: "audio/webm"
};
function I(e) {
	const t = /\.([a-z0-9]+)(?:[?#]|$)/i.exec(e)?.[1]?.toLowerCase();
	return t && F[t] || "";
}
/** The length a media element reports for `objectUrl`, or `estimate` (or 0) when it will not say in time. */
function L(e, t) {
	return new Promise((n) => {
		const r = new Audio();
		let i = false;
		const a = (e) => {
			if (i) return;
			i = true;
			clearTimeout(o);
			r.removeAttribute("src");
			r.load();
			n(e !== null && Number.isFinite(e) && e > 0 ? e : t ?? 0);
		};
		const o = setTimeout(() => a(null), N);
		r.preload = "metadata";
		r.onloadedmetadata = () => a(r.duration);
		r.onerror = () => a(null);
		r.src = e;
	});
}
var R = class {
	constructor() {
		this.name = "WebAudio";
		this.delivery = "bytes";
		this.context_ = null;
		this.mixer_ = null;
		this.pool_ = null;
		this.buffers_ = /* @__PURE__ */ new Map();
		this.loadingUrls_ = /* @__PURE__ */ new Map();
		this.sources_ = /* @__PURE__ */ new Map();
		this.nextBufferId_ = 0;
		this.nextHandleId_ = 0;
		this.resumeHandler_ = null;
		this.explicitlySuspended_ = false;
		this.deviceIntentRevision_ = 0;
		this.contextGeneration_ = 0;
		this.analyser_ = null;
		this.streams_ = /* @__PURE__ */ new Map();
		this.heldStreams_ = [];
		this.retiredStreams_ = /* @__PURE__ */ new Map();
		this.together_ = /* @__PURE__ */ new WeakMap();
	}
	get mixer() {
		return this.mixer_;
	}
	get isReady() {
		return this.context_?.state === "running";
	}
	async initialize(e = {}) {
		this.contextGeneration_++;
		this.deviceIntentRevision_++;
		this.explicitlySuspended_ = false;
		this.context_ = new AudioContext();
		this.mixer_ = new c(this.context_, e.mixerConfig);
		this.pool_ = new s(this.context_, e.initialPoolSize);
		this.analyser_ = this.context_.createAnalyser();
		this.analyser_.fftSize = 128;
		this.analyser_.smoothingTimeConstant = .7;
		this.mixer_.master.node.connect(this.analyser_);
		if (this.context_.state === "suspended") {
			const e = () => {
				if (this.explicitlySuspended_) return;
				this.resume();
				document.removeEventListener("touchstart", e);
				document.removeEventListener("mousedown", e);
				document.removeEventListener("keydown", e);
				this.resumeHandler_ = null;
			};
			document.addEventListener("touchstart", e);
			document.addEventListener("mousedown", e);
			document.addEventListener("keydown", e);
			this.resumeHandler_ = e;
		}
	}
	async ensureResumed() {
		if (!this.explicitlySuspended_ && this.context_?.state === "suspended") await this.requestDeviceIntent_(false);
	}
	requestDeviceIntent_(e) {
		if (this.explicitlySuspended_ !== e) {
			this.explicitlySuspended_ = e;
			this.deviceIntentRevision_++;
		}
		const t = this.deviceIntentRevision_;
		const n = this.context_;
		if (!n || n.state === "closed") return Promise.resolve();
		return this.applyDeviceIntent_(n, e, t, this.contextGeneration_);
	}
	async applyDeviceIntent_(e, t, n, r) {
		await (t ? e.suspend() : e.resume());
		if (e !== this.context_ || r !== this.contextGeneration_ || e.state === "closed") return;
		if (n !== this.deviceIntentRevision_ && e.state !== (this.explicitlySuspended_ ? "suspended" : "running")) await this.applyDeviceIntent_(e, this.explicitlySuspended_, this.deviceIntentRevision_, r);
	}
	fireDeviceIntent_(e) {
		const t = this.context_;
		const r = this.contextGeneration_;
		this.requestDeviceIntent_(e).catch((e) => {
			if (t === this.context_ && r === this.contextGeneration_) n.warn("audio", "Audio device transition failed", e);
		});
	}
	async loadBuffer(e, t) {
		if (!this.context_) throw new Error("AudioContext not initialized");
		const n = this.cachedBuffer_(e);
		if (n) return n;
		const r = this.loadingUrls_.get(e);
		if (r) return r;
		const a = this.loadSource_(e, () => i().readFile(e), t);
		this.loadingUrls_.set(e, a);
		try {
			return await a;
		} finally {
			if (this.loadingUrls_.get(e) === a) this.loadingUrls_.delete(e);
		}
	}
	async loadBufferFromData(e, t, n) {
		return this.loadSource_(e, async () => t, n);
	}
	cachedBuffer_(e) {
		const t = this.sources_.get(e)?.bufferId;
		if (t === void 0) return null;
		const n = this.buffers_.get(t);
		return n ? this.handleOf_(t, n) : null;
	}
	handleOf_(e, t) {
		if (t.stream) {
			const n = t.stream.duration;
			return {
				id: e,
				duration: n,
				bytes: 0,
				streamed: true,
				savedBytes: g(n)
			};
		}
		return {
			id: e,
			duration: t.span ? t.span.end - t.span.lead : t.buffer.duration,
			bytes: P(t.buffer)
		};
	}
	async loadSource_(e, t, n) {
		const r = this.context_;
		if (!r) throw new Error("AudioContext not initialized");
		const i = this.contextGeneration_;
		const a = this.cachedBuffer_(e);
		if (a) return a;
		let o = this.sources_.get(e);
		if (!o) {
			o = { pending: 0 };
			this.sources_.set(e, o);
		}
		o.pending++;
		try {
			const a = await t();
			this.assertLoadContext_(r, i);
			return await this.decodeBuffer_(e, a, o, r, i, n);
		} finally {
			o.pending--;
			if (this.sources_.get(e) === o && o.pending === 0 && o.bufferId === void 0) this.sources_.delete(e);
		}
	}
	assertLoadContext_(e, t) {
		if (this.context_ !== e || this.contextGeneration_ !== t) throw new Error("AudioContext changed while loading audio");
	}
	async decodeBuffer_(e, t, n, r, i, a) {
		if (this.sources_.get(e) === n) {
			const t = this.cachedBuffer_(e);
			if (t) return t;
		}
		if (h(a?.loadType, t)) return this.streamBuffer_(e, t, n, r, i, a);
		let o;
		try {
			o = await r.decodeAudioData(t);
		} catch (t) {
			this.assertLoadContext_(r, i);
			throw new Error(`Failed to decode audio ${e}: ${t.message}`);
		}
		this.assertLoadContext_(r, i);
		const s = ++this.nextBufferId_;
		const c = p(a?.trim, o.duration);
		this.buffers_.set(s, {
			buffer: o,
			url: e,
			...c ? { span: c } : {}
		});
		if (this.sources_.get(e) === n) n.bufferId = s;
		return this.handleOf_(s, this.buffers_.get(s));
	}
	/**
	* Keep a clip as its compressed bytes behind an object URL, and learn its length from the element
	* (the header estimate when the browser will not say). Nothing is decoded: this is the memory the
	* clip does not take.
	*/
	async streamBuffer_(e, t, n, r, i, a) {
		const o = URL.createObjectURL(new Blob([t], { type: I(e) }));
		const s = await L(o, m(t));
		if (this.context_ !== r || this.contextGeneration_ !== i) {
			URL.revokeObjectURL(o);
			throw new Error("AudioContext changed while loading audio");
		}
		const c = ++this.nextBufferId_;
		const l = p(a?.trim, s);
		this.buffers_.set(c, {
			buffer: null,
			url: e,
			stream: {
				objectUrl: o,
				duration: l ? l.end - l.lead : s,
				...l?.lead ? { lead: l.lead } : {}
			}
		});
		if (this.sources_.get(e) === n) n.bufferId = c;
		return this.handleOf_(c, this.buffers_.get(c));
	}
	releaseStream_(e) {
		for (const [t, n] of this.streams_) if (n === e) this.streams_.delete(t);
		this.heldStreams_ = this.heldStreams_.filter((t) => t !== e);
		const t = this.retiredStreams_.get(e);
		if (t !== void 0) {
			this.retiredStreams_.delete(e);
			URL.revokeObjectURL(t);
		}
	}
	playStream_(e, t, n) {
		const r = this.context_;
		const i = this.pool_;
		const a = this.mixer_;
		this.streams_.get(e)?.stop();
		const o = new Audio();
		o.preload = "auto";
		o.src = t.objectUrl;
		o.loop = n.loop ?? false;
		o.playbackRate = n.playbackRate ?? 1;
		const s = i.acquire();
		let c;
		try {
			c = r.createMediaElementSource(o);
			c.connect(s.gain);
			s.gain.gain.value = n.volume ?? 1;
			s.panner.pan.value = n.pan ?? 0;
			const e = a.getBus(n.bus ?? "sfx") ?? a.sfx;
			s.panner.connect(e.input);
		} catch (e) {
			i.release(s);
			throw e;
		}
		const l = new M(++this.nextHandleId_, o, c, s, i, t.duration, (e) => this.releaseStream_(e), () => this.ensureResumed(), n.loop && (n.loopStart && n.loopStart < t.duration || t.lead) ? (t.lead ?? 0) + (n.loopStart ?? 0) : 0);
		this.streams_.set(e, l);
		l.begin((t.lead ?? 0) + (n.startOffset ?? 0));
		return l;
	}
	invalidateSource(e) {
		this.sources_.delete(e);
		this.loadingUrls_.delete(e);
	}
	unloadBuffer(e) {
		const t = this.buffers_.get(e.id);
		if (!t) return;
		this.buffers_.delete(e.id);
		if (t.stream) {
			const n = this.streams_.get(e.id);
			if (n) this.retiredStreams_.set(n, t.stream.objectUrl);
			else URL.revokeObjectURL(t.stream.objectUrl);
		}
		const n = this.sources_.get(t.url);
		if (n?.bufferId === e.id) {
			delete n.bufferId;
			if (n.pending === 0) this.sources_.delete(t.url);
		}
	}
	play(e, t) {
		if (!this.context_ || !this.pool_ || !this.mixer_) throw new Error("Audio system not initialized");
		const n = this.buffers_.get(e.id);
		if (n?.stream) return this.playStream_(e.id, n.stream, t);
		const r = n?.buffer;
		if (!r) throw new Error(`Buffer ${e.id} not found`);
		const [i, a] = [n.span?.lead ?? 0, n.span?.end ?? r.duration];
		const o = i + (t.startOffset ?? 0);
		const s = i + (t.loop && t.loopStart && t.loopStart > 0 && i + t.loopStart < a ? t.loopStart : 0);
		const c = !!t.loop && (s > 0 || a < r.duration);
		let l = 0;
		if (t.together) {
			l = this.together_.get(t.together) ?? this.context_.currentTime + .03;
			this.together_.set(t.together, l);
		}
		const u = this.pool_.acquire();
		let d;
		try {
			d = this.context_.createBufferSource();
			u.source = d;
			d.buffer = r;
			d.loop = t.loop ?? false;
			if (c) {
				d.loopStart = s;
				d.loopEnd = a;
			}
			d.playbackRate.value = t.playbackRate ?? 1;
			d.connect(u.gain);
			u.gain.gain.value = t.volume ?? 1;
			u.panner.pan.value = t.pan ?? 0;
			const e = t.bus ?? "sfx";
			const i = this.mixer_.getBus(e) ?? this.mixer_.sfx;
			u.panner.connect(i.input);
			if (n.span && !t.loop) d.start(l, o, Math.max(0, a - o));
			else d.start(l, o);
		} catch (e) {
			this.pool_.release(u);
			throw e;
		}
		const f = ++this.nextHandleId_;
		return new j(f, d, r, u, this.pool_, this.context_, o, s, i, a, l || this.context_.currentTime);
	}
	getFrequencyData(e) {
		if (!this.analyser_) return false;
		this.analyser_.getByteFrequencyData(e);
		return true;
	}
	suspend() {
		for (const e of this.streams_.values()) if (e.holdForSuspend()) this.heldStreams_.push(e);
		this.fireDeviceIntent_(true);
	}
	resume() {
		this.fireDeviceIntent_(false);
		const e = this.heldStreams_;
		this.heldStreams_ = [];
		for (const t of e) t.continueAfterSuspend();
	}
	dispose() {
		this.contextGeneration_++;
		this.deviceIntentRevision_++;
		this.explicitlySuspended_ = false;
		if (this.resumeHandler_) {
			document.removeEventListener("touchstart", this.resumeHandler_);
			document.removeEventListener("mousedown", this.resumeHandler_);
			document.removeEventListener("keydown", this.resumeHandler_);
			this.resumeHandler_ = null;
		}
		for (const e of [...this.streams_.values()]) e.stop();
		for (const e of this.buffers_.values()) if (e.stream) URL.revokeObjectURL(e.stream.objectUrl);
		for (const e of this.retiredStreams_.values()) URL.revokeObjectURL(e);
		this.retiredStreams_.clear();
		this.streams_.clear();
		this.heldStreams_ = [];
		this.analyser_ = null;
		this.pool_ = null;
		this.mixer_ = null;
		this.buffers_.clear();
		this.sources_.clear();
		this.loadingUrls_.clear();
		this.context_?.close();
		this.context_ = null;
	}
};
//#endregion
//#region src/video/WebVideoBackend.ts
let z = 1;
const B = (e) => e < 0 ? 0 : e > 1 ? 1 : e;
var V = class {
	constructor(e, t) {
		this.id = z++;
		this.gl_ = null;
		this.pathChosen_ = false;
		this.canvas_ = null;
		this.ctx_ = null;
		this.texture_ = 0;
		this.width_ = 0;
		this.height_ = 0;
		this.ready_ = false;
		this.disposed_ = false;
		this.newFrame_ = true;
		this.lastUploadTime_ = -1;
		this.rvfcId_ = 0;
		this.onLoadedMetadata_ = () => {
			this.width_ = this.video_.videoWidth | 0;
			this.height_ = this.video_.videoHeight | 0;
			this.scheduleFrame_();
		};
		this.onEndedEvent_ = () => {
			if (!this.video_.loop) this.onEnded?.();
		};
		this.onErrorEvent_ = () => {
			const e = this.video_.error;
			n.warn("video", `decode error (code ${e?.code ?? "?"}): ${e?.message ?? "unknown"}`);
			this.onError?.(e ?? /* @__PURE__ */ new Error("video decode error"));
		};
		const r = document.createElement("video");
		this.rvfcSupported_ = typeof r.requestVideoFrameCallback === "function";
		r.crossOrigin = "anonymous";
		r.playsInline = true;
		r.setAttribute("playsinline", "");
		r.loop = t.loop ?? false;
		r.muted = t.muted ?? false;
		r.volume = B(t.volume ?? 1);
		r.playbackRate = t.playbackRate ?? 1;
		r.preload = "auto";
		this.wantsPlay_ = t.autoplay ?? true;
		r.addEventListener("loadedmetadata", this.onLoadedMetadata_);
		r.addEventListener("ended", this.onEndedEvent_);
		r.addEventListener("error", this.onErrorEvent_);
		r.src = e;
		r.load();
		this.video_ = r;
		if (this.wantsPlay_) this.tryPlay_();
	}
	tryPlay_() {
		const e = this.video_.play();
		if (e && typeof e.catch === "function") e.catch((e) => n.warn("video", "autoplay blocked (mute the video or start on input)", e));
	}
	scheduleFrame_() {
		if (this.disposed_ || !this.rvfcSupported_) return;
		this.rvfcId_ = this.video_.requestVideoFrameCallback(() => {
			this.newFrame_ = true;
			this.scheduleFrame_();
		});
	}
	ensureCanvas_() {
		if (this.canvas_ || this.width_ <= 0 || this.height_ <= 0) return;
		const e = document.createElement("canvas");
		e.width = this.width_;
		e.height = this.height_;
		this.canvas_ = e;
		this.ctx_ = e.getContext("2d", { willReadFrequently: true });
	}
	pump(e) {
		if (!e) return;
		if (this.disposed_ || this.width_ <= 0 || this.height_ <= 0) return;
		if (this.video_.readyState < 2) return;
		const t = this.video_.currentTime !== this.lastUploadTime_;
		if (this.ready_ && !this.newFrame_ && !t) return;
		if (!this.pathChosen_) {
			this.gl_ = x(e.GL);
			this.pathChosen_ = true;
		}
		try {
			if (this.gl_) this.uploadGL_(e, this.gl_);
			else this.uploadCPU_(e);
		} catch (e) {
			this.onError?.(e);
			this.disposed_ = true;
			return;
		}
		this.newFrame_ = false;
		this.lastUploadTime_ = this.video_.currentTime;
		if (!this.ready_) {
			this.ready_ = true;
			this.onReady?.();
		}
	}
	uploadGL_(e, t) {
		if (this.texture_) {
			S(e, this.texture_, (e) => {
				e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL, 1);
				e.texSubImage2D(e.TEXTURE_2D, 0, 0, 0, e.RGBA, e.UNSIGNED_BYTE, this.video_);
				e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL, 0);
			});
			return;
		}
		this.texture_ = C(e, t, (e) => {
			b(e, this.video_, true);
			w(e, {
				filter: "linear",
				wrap: "clamp",
				mipmaps: false
			});
		}, {
			width: this.width_,
			height: this.height_,
			content: _.Video
		});
		u(this.texture_, () => this.refillFrame_(e));
	}
	/**
	* Puts the frame on screen back after a device loss. The whole image, not a
	* sub-rectangle: the device rebuilt its texture from a description that does
	* not carry the color space this upload chose, so the storage is respecified
	* here — a paused video would otherwise come back washed out in linear mode.
	*/
	refillFrame_(e) {
		if (this.disposed_ || !this.texture_) return false;
		if (!this.gl_) {
			this.uploadCPU_(e);
			return true;
		}
		if (this.video_.readyState < 2) return false;
		if (!S(e, this.texture_, (e) => {
			b(e, this.video_, true);
			w(e, {
				filter: "linear",
				wrap: "clamp",
				mipmaps: false
			});
		})) return false;
		f().restoreTextureContent?.(this.texture_);
		return true;
	}
	uploadCPU_(e) {
		this.ensureCanvas_();
		const t = this.ctx_;
		if (!t) return;
		t.save();
		t.translate(0, this.height_);
		t.scale(1, -1);
		t.drawImage(this.video_, 0, 0, this.width_, this.height_);
		t.restore();
		const n = t.getImageData(0, 0, this.width_, this.height_);
		const r = new Uint8Array(n.data.buffer, n.data.byteOffset, n.data.byteLength);
		if (!this.texture_) {
			this.texture_ = y(e, {
				width: this.width_,
				height: this.height_,
				pixels: r
			}, _.Video, false, {
				filterMode: "linear",
				wrapMode: "clamp"
			});
			u(this.texture_, () => this.refillFrame_(e));
		} else v(e, this.texture_, 0, 0, this.width_, this.height_, r);
	}
	get textureHandle() {
		return this.texture_;
	}
	get width() {
		return this.width_;
	}
	get height() {
		return this.height_;
	}
	get bytes() {
		return this.width_ * this.height_ * 4;
	}
	get isReady() {
		return this.ready_;
	}
	get isPlaying() {
		return !this.video_.paused && !this.video_.ended;
	}
	get currentTime() {
		return this.video_.currentTime;
	}
	get duration() {
		return Number.isFinite(this.video_.duration) ? this.video_.duration : 0;
	}
	play() {
		this.wantsPlay_ = true;
		this.tryPlay_();
	}
	pause() {
		this.wantsPlay_ = false;
		this.video_.pause();
	}
	seek(e) {
		try {
			this.video_.currentTime = e;
			this.newFrame_ = true;
		} catch {}
	}
	setVolume(e) {
		this.video_.volume = B(e);
	}
	setMuted(e) {
		this.video_.muted = e;
	}
	setLoop(e) {
		this.video_.loop = e;
	}
	setPlaybackRate(e) {
		this.video_.playbackRate = e > 0 ? e : 0;
	}
	stop() {
		if (this.disposed_) return;
		this.disposed_ = true;
		if (this.rvfcId_ && this.rvfcSupported_) this.video_.cancelVideoFrameCallback(this.rvfcId_);
		this.video_.removeEventListener("loadedmetadata", this.onLoadedMetadata_);
		this.video_.removeEventListener("ended", this.onEndedEvent_);
		this.video_.removeEventListener("error", this.onErrorEvent_);
		try {
			this.video_.pause();
		} catch {}
		this.video_.removeAttribute("src");
		try {
			this.video_.load();
		} catch {}
		if (this.texture_) {
			d(this.texture_);
			f().releaseTexture(this.texture_);
			this.texture_ = 0;
		}
		this.canvas_ = null;
		this.ctx_ = null;
	}
};
var H = class {
	constructor() {
		this.name = "web";
	}
	createStream(e, t) {
		return new V(e, t);
	}
	dispose() {}
};
//#endregion
//#region src/platform/webRecorder.ts
const U = 30;
function W() {
	if (typeof document === "undefined") return null;
	return document.getElementById("canvas") ?? document.querySelector("canvas");
}
function G(e) {
	if (typeof MediaRecorder === "undefined") return null;
	const t = W();
	if (!t || typeof t.captureStream !== "function") return null;
	const n = new te(e);
	let r = null;
	let i = [];
	let a = null;
	let o = 0;
	const s = () => {
		a = setTimeout(() => {
			a = null;
			if (r?.state === "recording") r.pause();
			n.pause();
		}, Math.max(0, o - n.elapsedMs()));
	};
	const c = () => {
		if (a !== null) clearTimeout(a);
		a = null;
	};
	const l = (e, t) => new Promise((n, i) => {
		const a = r;
		if (!a) {
			i(/* @__PURE__ */ new Error("not recording"));
			return;
		}
		a.addEventListener(e, () => n(), { once: true });
		try {
			t(a);
		} catch (e) {
			i(e instanceof Error ? e : new Error(String(e)));
		}
	});
	return {
		limits: {
			minSeconds: 1,
			maxSeconds: 7200
		},
		canShare: false,
		async start(e, a) {
			if (r) throw new Error("already recording");
			const u = new MediaRecorder(t.captureStream(U));
			r = u;
			i = [];
			u.addEventListener("dataavailable", (e) => {
				if (e.data.size > 0) i.push(e.data);
			});
			u.addEventListener("error", (e) => {
				c();
				r = null;
				const t = e.error;
				a(t instanceof Error ? t : /* @__PURE__ */ new Error("the browser stopped recording"));
			});
			await l("start", (e) => e.start());
			n.start();
			o = e * 1e3;
			s();
		},
		async pause() {
			c();
			if (r?.state === "recording") await l("pause", (e) => e.pause());
			n.pause();
		},
		async resume() {
			if (r?.state === "paused") await l("resume", (e) => e.resume());
			n.resume();
			s();
		},
		async stop() {
			c();
			const e = r?.mimeType || "video/webm";
			await l("stop", (e) => e.stop());
			r = null;
			const t = n.elapsedMs();
			return {
				durationMs: t,
				blob: new Blob(i, { type: e }),
				highlights: n.highlights(t)
			};
		},
		async abort() {
			c();
			if (r) await l("stop", (e) => e.stop());
			r = null;
			i = [];
		},
		highlight(e, t) {
			if (r) n.mark(e, t);
		},
		share() {
			return Promise.reject(/* @__PURE__ */ new Error("a browser has nowhere to publish a recording"));
		}
	};
}
//#endregion
//#region src/device/web.ts
var ae = class {
	constructor(e = window, t = document, n = navigator) {
		this.win = e;
		this.doc = t;
		this.nav = n;
		this.events = new ne();
		this.options = null;
		this.motionEpoch = 0;
		this.wakeEpoch = 0;
		this.wakeWanted = false;
		this.wake = null;
		this.disposed = false;
		this.lastMotion = 0;
		this.battery = null;
		this.pressure = null;
		this.pressureObserver = null;
		this.powerStarted = false;
		this.motion = (e) => {
			const t = e.timeStamp;
			const n = this.options?.rate === "normal" ? 200 : this.options?.rate === "ui" ? 60 : 16;
			if (this.lastMotion && t - this.lastMotion < n) return;
			this.lastMotion = t;
			const r = (e) => e && e.x !== null && e.y !== null && e.z !== null ? {
				x: e.x,
				y: e.y,
				z: e.z
			} : null;
			const i = e.rotationRate;
			const a = Math.PI / 180;
			this.events.emit({
				...O(),
				timestamp: t,
				acceleration: this.options?.accelerometer ? r(e.acceleration) : null,
				accelerationIncludingGravity: this.options?.accelerometer ? r(e.accelerationIncludingGravity) : null,
				gyroscope: this.options?.gyroscope && i && i.alpha !== null && i.beta !== null && i.gamma !== null ? {
					x: i.beta * a,
					y: i.gamma * a,
					z: i.alpha * a
				} : null
			});
		};
		this.orientation = (e) => {
			if (e.alpha === null || e.beta === null || e.gamma === null) return;
			this.events.emit({
				...O(),
				timestamp: e.timeStamp,
				orientation: {
					x: e.beta,
					y: e.gamma,
					z: e.alpha
				}
			});
		};
		this.screenChanged = () => {
			this.events.update({
				fullscreen: !!this.doc.fullscreenElement,
				pointerLocked: !!this.doc.pointerLockElement
			});
		};
		this.hide = () => {
			this.unbindMotion();
			this.events.reset();
			++this.wakeEpoch;
			this.releaseWake();
		};
		this.visibility = () => {
			if (this.doc.hidden) this.hide();
			else {
				this.bindMotion();
				if (this.wakeWanted) this.keepScreenOn(true);
			}
		};
		t.addEventListener("visibilitychange", this.visibility);
		e.addEventListener("pagehide", this.hide);
		e.addEventListener("pageshow", this.visibility);
		t.addEventListener("fullscreenchange", this.screenChanged);
		t.addEventListener("pointerlockchange", this.screenChanged);
	}
	capabilities() {
		const e = this.win;
		return {
			accelerometer: !!e.DeviceMotionEvent,
			gyroscope: !!e.DeviceMotionEvent,
			orientation: !!e.DeviceOrientationEvent,
			vibration: typeof this.nav.vibrate === "function",
			vibrationIntensity: false,
			keepScreenOn: !!this.nav.wakeLock,
			fullscreen: typeof this.doc.documentElement?.requestFullscreen === "function",
			pointerLock: typeof this.doc.documentElement?.requestPointerLock === "function"
		};
	}
	state() {
		return { ...this.events.state };
	}
	/** What the browser has said so far: the battery (Chromium) and the processor's pressure (Chromium). Both arrive a moment after the first call. */
	power() {
		this.startPower();
		const e = this.battery;
		return {
			level: e ? e.level : null,
			charging: e ? e.charging : null,
			thermal: this.pressure
		};
	}
	startPower() {
		if (this.powerStarted || this.disposed) return;
		this.powerStarted = true;
		try {
			this.nav.getBattery?.().then((e) => {
				if (!this.disposed) this.battery = e;
			}, () => void 0);
		} catch {}
		try {
			const e = this.win.PressureObserver;
			if (e) {
				const t = new e((e) => {
					const t = e[e.length - 1];
					if (t) this.pressure = t.state;
				});
				this.pressureObserver = t;
				t.observe("cpu").catch(() => void 0);
			}
		} catch {}
	}
	onMotion(e) {
		return this.events.onMotion(e);
	}
	onStateChange(e) {
		return this.events.onStateChange(e);
	}
	async startMotion(e = {}) {
		const t = {
			accelerometer: true,
			gyroscope: true,
			orientation: false,
			rate: "game",
			...e
		};
		const n = this.capabilities();
		if (this.disposed || !t.accelerometer && !t.gyroscope && !t.orientation || t.accelerometer && !n.accelerometer || t.gyroscope && !n.gyroscope || t.orientation && !n.orientation) return E;
		const r = ++this.motionEpoch;
		const i = this.win;
		try {
			const e = [];
			if (t.accelerometer || t.gyroscope) {
				const t = i.DeviceMotionEvent;
				if (t?.requestPermission) e.push(t.requestPermission());
			}
			if (t.orientation) {
				const t = i.DeviceOrientationEvent;
				if (t?.requestPermission) e.push(t.requestPermission());
			}
			const n = await Promise.all(e);
			if (r !== this.motionEpoch || this.disposed) return {
				status: "failed",
				reason: "Motion request cancelled"
			};
			if (n.some((e) => e !== "granted")) return { status: "denied" };
			this.unbindMotion();
			this.events.reset();
			this.lastMotion = 0;
			this.options = t;
			if (!this.doc.hidden) this.bindMotion();
			return D;
		} catch (e) {
			return T(e);
		}
	}
	async stopMotion() {
		++this.motionEpoch;
		this.options = null;
		this.unbindMotion();
		this.events.reset();
		return D;
	}
	async vibrate(e = {}) {
		if (this.disposed || !this.capabilities().vibration) return E;
		try {
			return this.nav.vibrate(e.duration === "long" ? 400 : 15) ? D : { status: "denied" };
		} catch (e) {
			return T(e);
		}
	}
	async keepScreenOn(e) {
		if (this.disposed || !this.nav.wakeLock) return E;
		this.wakeWanted = e;
		const t = ++this.wakeEpoch;
		if (!e) {
			await this.releaseWake();
			return D;
		}
		if (this.doc.hidden) return {
			status: "denied",
			reason: "Document is hidden"
		};
		if (this.wake && !this.wake.released) return D;
		try {
			const e = await this.nav.wakeLock.request("screen");
			if (t !== this.wakeEpoch || !this.wakeWanted || this.doc.hidden || this.disposed) {
				await e.release();
				return {
					status: "failed",
					reason: "Screen wake request cancelled"
				};
			}
			this.wake = e;
			this.events.update({ screenOn: !e.released });
			e.addEventListener("release", () => {
				if (this.wake !== e) return;
				this.wake = null;
				this.events.update({ screenOn: false });
			});
			return D;
		} catch (e) {
			return T(e);
		}
	}
	async fullscreen(e, t) {
		const n = t ?? this.doc.documentElement;
		if (this.disposed || (e ? typeof n?.requestFullscreen !== "function" : typeof this.doc.exitFullscreen !== "function")) return E;
		try {
			if (e) await n.requestFullscreen();
			else if (this.doc.fullscreenElement) await this.doc.exitFullscreen();
			this.screenChanged();
			return D;
		} catch (e) {
			return T(e);
		}
	}
	pointerLock(e, t) {
		const n = t ?? this.doc.documentElement;
		if (this.disposed || (e ? typeof n?.requestPointerLock !== "function" : typeof this.doc.exitPointerLock !== "function")) return Promise.resolve(E);
		if (e && this.doc.pointerLockElement === n || !e && !this.doc.pointerLockElement) return Promise.resolve(D);
		return new Promise((t) => {
			let r = false;
			const i = (e) => {
				if (r) return;
				r = true;
				clearTimeout(s);
				this.doc.removeEventListener("pointerlockchange", a);
				this.doc.removeEventListener("pointerlockerror", o);
				this.screenChanged();
				t(e);
			};
			const a = () => i((e ? this.doc.pointerLockElement === n : !this.doc.pointerLockElement) ? D : {
				status: "failed",
				reason: "Pointer lock request interrupted"
			});
			const o = () => i({
				status: "denied",
				reason: "Pointer lock requires a player gesture"
			});
			const s = setTimeout(() => i({
				status: "failed",
				reason: "Pointer lock request timed out"
			}), 2e3);
			this.doc.addEventListener("pointerlockchange", a);
			this.doc.addEventListener("pointerlockerror", o);
			try {
				if (e) n.requestPointerLock()?.catch((e) => i(T(e)));
				else this.doc.exitPointerLock();
			} catch (e) {
				i(T(e));
			}
		});
	}
	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		this.stopMotion();
		this.wakeWanted = false;
		++this.wakeEpoch;
		this.releaseWake();
		this.doc.removeEventListener("visibilitychange", this.visibility);
		this.win.removeEventListener("pagehide", this.hide);
		this.win.removeEventListener("pageshow", this.visibility);
		this.doc.removeEventListener("fullscreenchange", this.screenChanged);
		this.doc.removeEventListener("pointerlockchange", this.screenChanged);
		this.events.dispose();
		this.pressureObserver?.disconnect();
		this.pressureObserver = null;
		this.battery = null;
	}
	bindMotion() {
		if (!this.options || this.disposed) return;
		if (this.options.accelerometer || this.options.gyroscope) this.win.addEventListener("devicemotion", this.motion);
		if (this.options.orientation) this.win.addEventListener("deviceorientation", this.orientation);
		this.events.update({ motionActive: true });
	}
	unbindMotion() {
		this.win.removeEventListener("devicemotion", this.motion);
		this.win.removeEventListener("deviceorientation", this.orientation);
		this.events.update({ motionActive: false });
	}
	async releaseWake() {
		const e = this.wake;
		this.wake = null;
		this.events.update({ screenOn: false });
		try {
			await e?.release();
		} catch {}
	}
};
//#endregion
//#region src/platform/webCacheStore.ts
/**
* @file    webCacheStore.ts
* @brief   The browser's content cache: files by name in IndexedDB, behind the platform's cache-file methods.
*
* @details The content cache holds bytes that never go stale (a key says what the bytes are). A browser keeps what a page
*          downloads itself, but not what the page makes: a texture drawn from its recipe is made again every visit unless it is
*          kept here. Entries are stored under the cache's own file names (cacheEntryName), with the time each was last read.
*/
const K = "estella-content-cache";
const q = "files";
let J = null;
/** Whether this browser has a store at all (a worker-less or storage-less realm has none). */
function Y() {
	return typeof indexedDB !== "undefined";
}
function X() {
	J ??= new Promise((e, t) => {
		const n = indexedDB.open(K, 1);
		n.onupgradeneeded = () => {
			n.result.createObjectStore(q);
		};
		n.onsuccess = () => e(n.result);
		n.onerror = () => {
			J = null;
			t(n.error ?? /* @__PURE__ */ new Error("the content cache cannot be opened"));
		};
		n.onblocked = () => {
			J = null;
			t(/* @__PURE__ */ new Error("the content cache is held by another page"));
		};
	});
	return J;
}
/** One request against the store, settled when its transaction is. */
async function Z(e, t) {
	const n = await X();
	return new Promise((r, i) => {
		const a = n.transaction(q, e);
		const o = t(a.objectStore(q));
		a.oncomplete = () => r(o.result);
		a.onerror = () => i(a.error ?? /* @__PURE__ */ new Error("the content cache refused a request"));
		a.onabort = () => i(a.error ?? /* @__PURE__ */ new Error("the content cache gave up a request"));
	});
}
async function oe(e) {
	const t = await Z("readonly", (t) => t.get(e));
	return t ? t.bytes : null;
}
async function se(e, t) {
	await Z("readwrite", (n) => n.put({
		bytes: t,
		size: t.byteLength,
		lastAccess: Date.now()
	}, e));
}
async function ce() {
	const e = await X();
	return new Promise((t, n) => {
		const r = [];
		const i = e.transaction(q, "readonly");
		const a = i.objectStore(q).openCursor();
		a.onsuccess = () => {
			const e = a.result;
			if (!e) return;
			const t = e.value;
			r.push({
				name: String(e.key),
				size: t.size,
				lastAccess: t.lastAccess
			});
			e.continue();
		};
		i.oncomplete = () => t(r);
		i.onerror = () => n(i.error ?? /* @__PURE__ */ new Error("the content cache cannot be listed"));
	});
}
async function le(e) {
	await Z("readwrite", (t) => t.delete(e));
}
//#endregion
//#region src/platform/web.ts
const Q = 16;
var $ = class {
	constructor() {
		this.device_ = null;
		this.name = "web";
		this.inputCleanup_ = null;
	}
	device() {
		return this.device_ ??= new ae();
	}
	/** Resolved on first ask: the canvas exists by the time a game records. */
	screenRecorder() {
		if (this.recorder_ === void 0) this.recorder_ = G();
		return this.recorder_;
	}
	hasTouch() {
		return typeof navigator !== "undefined" && ((navigator.maxTouchPoints ?? 0) > 0 || "ontouchstart" in globalThis);
	}
	async fetch(e, t) {
		const n = await globalThis.fetch(e, {
			method: t?.method ?? "GET",
			headers: t?.headers,
			body: t?.body
		});
		const r = {};
		n.headers.forEach((e, t) => {
			r[t] = e;
		});
		return {
			ok: n.ok,
			status: n.status,
			statusText: n.statusText,
			headers: r,
			json: () => n.json(),
			text: () => n.text(),
			arrayBuffer: () => n.arrayBuffer()
		};
	}
	async readFile(e) {
		const t = await this.fetch(e);
		if (!t.ok) throw new Error(`Failed to read file: ${e} (${t.status})`);
		return t.arrayBuffer();
	}
	async readTextFile(e) {
		const t = await this.fetch(e);
		if (!t.ok) throw new Error(`Failed to read file: ${e} (${t.status})`);
		return t.text();
	}
	async fileExists(e) {
		try {
			const t = await globalThis.fetch(e);
			const n = t.ok;
			t.body?.cancel();
			return n;
		} catch {
			return false;
		}
	}
	async loadImagePixels(e) {
		const t = this.createImage();
		await new Promise((n, r) => {
			t.crossOrigin = "anonymous";
			t.onload = () => n();
			t.onerror = () => r(/* @__PURE__ */ new Error(`Failed to load image: ${e}`));
			t.src = e;
		});
		const n = this.createCanvas(t.width, t.height).getContext("2d");
		n.drawImage(t, 0, 0);
		const r = n.getImageData(0, 0, t.width, t.height);
		return {
			width: t.width,
			height: t.height,
			pixels: new Uint8Array(r.data.buffer)
		};
	}
	async instantiateWasm(e, t) {
		let n;
		if (typeof e === "string") n = await this.readFile(e);
		else n = e;
		const r = await WebAssembly.instantiate(n, t);
		return {
			instance: r.instance,
			module: r.module
		};
	}
	createImage() {
		return new Image();
	}
	/** A hidden textarea: the browser's own field, borrowed for its keyboard
	*  layouts, IME and selection gestures (see platform/webTextEditor.ts). */
	createTextEditor() {
		return A();
	}
	/** Hand a shipped font to the browser's font stack, which is what Canvas2D
	*  resolves `ctx.font` families against. `document.fonts` is the only route:
	*  a file on disk (or behind `estella://`) is invisible to Canvas2D until a
	*  FontFace for it is added to the document. */
	async registerFont(e, t) {
		if (typeof FontFace === "undefined" || typeof document === "undefined") return;
		const n = new FontFace(e, t);
		await n.load();
		document.fonts.add(n);
	}
	createCanvas(e, t) {
		let n;
		if (typeof OffscreenCanvas !== "undefined") n = new OffscreenCanvas(e, t);
		else n = document.createElement("canvas");
		n.width = e;
		n.height = t;
		return n;
	}
	now() {
		return performance.now();
	}
	bindInputEvents(e, t) {
		if (this.inputCleanup_) {
			this.inputCleanup_();
			this.inputCleanup_ = null;
		}
		const n = t ?? document.querySelector("canvas") ?? document.body;
		const r = /* @__PURE__ */ new Set();
		const i = /* @__PURE__ */ new Set();
		const a = /* @__PURE__ */ new Set();
		const o = (t) => {
			const n = t;
			const i = n.target instanceof HTMLElement ? n.target : null;
			if (i?.closest("input, textarea, select, button, a[href], [contenteditable]") && i.dataset.estellaTextEditor !== "true") return;
			if (n.isComposing || n.keyCode === 229) return;
			if ((n.ctrlKey || n.metaKey || n.altKey) && [
				"Tab",
				"Enter",
				"Space"
			].includes(n.code)) return;
			r.add(n.code);
			if (e.onKeyDown(n.code) === true) n.preventDefault();
		};
		const s = (t) => {
			const n = t.code;
			if (r.delete(n)) e.onKeyUp(n);
		};
		const c = () => {
			for (const t of r) e.onKeyUp(t);
			r.clear();
			for (const t of i) e.onPointerUp(t);
			i.clear();
			for (const e of a) p.cancel(e);
			a.clear();
			e.onInputCancel?.();
		};
		const l = () => {
			if (document.hidden) c();
		};
		const u = (t) => {
			const n = t;
			e.onPointerMove(n.offsetX, n.offsetY, n.movementX, n.movementY);
		};
		const d = (t) => {
			const n = t;
			i.add(n.button);
			e.onPointerDown(n.button, n.offsetX, n.offsetY);
		};
		const f = (t) => {
			const n = t.button;
			if (i.delete(n)) e.onPointerUp(n);
		};
		const p = ee(e);
		const m = (e) => {
			e.preventDefault();
			const t = e;
			const r = n.getBoundingClientRect();
			for (let e = 0; e < t.changedTouches.length; e++) {
				const n = t.changedTouches[e];
				a.add(n.identifier);
				p.start(n.identifier, n.clientX - r.left, n.clientY - r.top);
			}
		};
		const h = (e) => {
			e.preventDefault();
			const t = e;
			const r = n.getBoundingClientRect();
			for (let e = 0; e < t.changedTouches.length; e++) {
				const n = t.changedTouches[e];
				p.move(n.identifier, n.clientX - r.left, n.clientY - r.top);
			}
		};
		const g = (e) => {
			e.preventDefault();
			const t = e;
			for (let e = 0; e < t.changedTouches.length; e++) {
				const n = t.changedTouches[e].identifier;
				if (a.delete(n)) p.end(n);
			}
		};
		const _ = (e) => {
			const t = e;
			for (let e = 0; e < t.changedTouches.length; e++) {
				const n = t.changedTouches[e].identifier;
				if (a.delete(n)) p.cancel(n);
			}
		};
		const v = (t) => {
			const n = t;
			let r = n.deltaX;
			let i = n.deltaY;
			if (n.deltaMode === 1) {
				r *= Q;
				i *= Q;
			} else if (n.deltaMode === 2) {
				r *= window.innerWidth;
				i *= window.innerHeight;
			}
			e.onWheel(r, i);
		};
		window.addEventListener("blur", c);
		document.addEventListener("visibilitychange", l);
		document.addEventListener("keydown", o);
		document.addEventListener("keyup", s);
		n.addEventListener("mousemove", u);
		n.addEventListener("mousedown", d);
		document.addEventListener("mouseup", f);
		n.addEventListener("touchstart", m, { passive: false });
		n.addEventListener("touchmove", h, { passive: false });
		n.addEventListener("touchend", g, { passive: false });
		n.addEventListener("touchcancel", _);
		n.addEventListener("wheel", v);
		this.inputCleanup_ = () => {
			window.removeEventListener("blur", c);
			document.removeEventListener("visibilitychange", l);
			c();
			document.removeEventListener("keydown", o);
			document.removeEventListener("keyup", s);
			n.removeEventListener("mousemove", u);
			n.removeEventListener("mousedown", d);
			document.removeEventListener("mouseup", f);
			n.removeEventListener("touchstart", m);
			n.removeEventListener("touchmove", h);
			n.removeEventListener("touchend", g);
			n.removeEventListener("touchcancel", _);
			n.removeEventListener("wheel", v);
		};
	}
	unbindInputEvents() {
		if (this.inputCleanup_) {
			this.inputCleanup_();
			this.inputCleanup_ = null;
		}
	}
	pollGamepads() {
		const e = typeof navigator !== "undefined" ? navigator : void 0;
		if (!e || typeof e.getGamepads !== "function") return [];
		const t = [];
		for (const n of e.getGamepads()) {
			if (!n) continue;
			t.push({
				index: n.index,
				connected: n.connected,
				buttons: n.buttons.map((e) => e.value),
				axes: n.axes.slice(),
				mapping: n.mapping
			});
		}
		return t;
	}
	createAudioBackend() {
		return new R();
	}
	createVideoBackend() {
		return new H();
	}
	createSocket(e) {
		return new l(e);
	}
	hasCacheStorage() {
		return Y();
	}
	canManageCache() {
		return Y();
	}
	readCacheFile(e) {
		return oe(o(e));
	}
	writeCacheFile(e, t) {
		return se(o(e), t);
	}
	listCacheFiles() {
		return ce();
	}
	removeCacheFile(e) {
		if (!/^[0-9a-f]{16}$/.test(e)) throw Error("invalid cache entry");
		return le(e);
	}
	getStorageItem(e) {
		return localStorage.getItem(e);
	}
	setStorageItem(e, t) {
		localStorage.setItem(e, t);
	}
	removeStorageItem(e) {
		localStorage.removeItem(e);
	}
	devicePixelRatio() {
		return typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
	}
	deviceName() {
		return typeof navigator !== "undefined" ? fe(navigator.userAgent) : "";
	}
	isHandheld() {
		return typeof navigator !== "undefined" && de(navigator.userAgent, navigator.maxTouchPoints ?? 0);
	}
	deviceQualityInfo() {
		if (typeof navigator === "undefined") return {};
		return {
			memoryGB: navigator.deviceMemory,
			cores: navigator.hardwareConcurrency
		};
	}
	/**
	* Both ways an error reaches the browser with nobody holding it.
	*
	* `error` carries the thrown value on the event; `unhandledrejection`
	* carries the rejection reason, which is the more common one in practice —
	* a promise chain in game code with no `.catch` fails completely silently
	* otherwise. Neither is prevented: this observes, and the browser still
	* logs to the console the way the developer expects.
	*/
	onUnhandledError(e) {
		if (typeof window === "undefined") return () => {};
		const t = (t) => {
			e(t.error ?? t.message);
		};
		const n = (t) => {
			e(t.reason);
		};
		window.addEventListener("error", t);
		window.addEventListener("unhandledrejection", n);
		return () => {
			window.removeEventListener("error", t);
			window.removeEventListener("unhandledrejection", n);
		};
	}
	/**
	* Context loss, without needing to be told which canvas.
	*
	* `webglcontextlost` does not bubble, so a listener on `window` looks like
	* it could not work — but a non-bubbling event still travels the CAPTURE
	* phase down to its target, and `window` is the first stop. One listener
	* therefore sees every canvas on the page, including one the engine did not
	* create, and the plugin needs no canvas handed to it.
	*/
	onContextLost(e) {
		if (typeof window === "undefined") return () => {};
		const t = (t) => {
			t.preventDefault();
			e();
		};
		window.addEventListener("webglcontextlost", t, true);
		return () => window.removeEventListener("webglcontextlost", t, true);
	}
	clearStorage(e) {
		const t = [];
		for (let n = 0; n < localStorage.length; n++) {
			const r = localStorage.key(n);
			if (r !== null && r.startsWith(e)) t.push(r);
		}
		for (const e of t) localStorage.removeItem(e);
	}
};
const ue = new $();
/** A browser and the system it runs on, from its user agent. Chrome on Android
*  no longer names the phone's model there, so this is as close as a page gets. */
/** A phone or a tablet, by its browser. An iPad's Safari says it is a Mac by default; only its touch screen tells them apart. */
function de(e, t) {
	return /Android|iPhone|iPad|iPod/.test(e) || /Macintosh/.test(e) && t > 1;
}
function fe(e) {
	const t = /Android/.test(e) ? "Android" : /iPhone/.test(e) ? "iPhone" : /iPad/.test(e) ? "iPad" : /Mac OS X/.test(e) ? "Mac" : /Windows/.test(e) ? "Windows" : /Linux/.test(e) ? "Linux" : "";
	return [/Electron\//.test(e) ? "Electron" : /Edg\//.test(e) ? "Edge" : /Firefox\//.test(e) ? "Firefox" : /Chrome\//.test(e) ? "Chrome" : /Safari\//.test(e) ? "Safari" : "", t].filter(Boolean).join(" · ");
}
//#endregion
//#region src/runtime/webEntry.ts
/**
* @file  webEntry.ts — what every web entry does before it hands the SDK over.
*
* A CALL, not a module side effect. `sideEffects` in package.json is a list of
* FILES, and which file a statement ends up in is the bundler's choice: put
* this in a module the entries share and it lands in a chunk nobody whitelisted,
* where tree-shaking drops it. The editor booted to "Platform not initialized".
*/
/**
* Idempotent, and deferential about the platform: a host-specific entry
* (`esengine/node`) claims one outright, and one process can hold both — the
* build pipeline reads a project through modules a browser also runs. Whichever
* order they load in, the host that declared itself keeps the platform.
*/
function pe() {
	if (!a()) r(ue);
	t();
	re();
	e();
}
//#endregion
export { pe as t };

//# sourceMappingURL=webEntry.js.map