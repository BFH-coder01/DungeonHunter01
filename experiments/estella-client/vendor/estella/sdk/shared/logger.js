//#region src/util/logger.ts
/**
* @file    logger.ts
* @brief   Centralized logging system for SDK
*/
let e = /* @__PURE__ */ function(e) {
	e[e["Debug"] = 0] = "Debug";
	e[e["Info"] = 1] = "Info";
	e[e["Warn"] = 2] = "Warn";
	e[e["Error"] = 3] = "Error";
	return e;
}({});
var t = class {
	handle(t) {
		let n = `[${new Date(t.timestamp).toISOString().substring(11, 23)}] [${e[t.level].toUpperCase().padEnd(5)}] [${t.category}] ${t.message}`;
		let r;
		if (t.data !== void 0) {
			const e = t.data;
			if (t.data instanceof Error) r = t.data;
			else if (e && (typeof e.stack === "string" || typeof e.message === "string")) n += ` ${String(e.stack ?? e.message)}`;
			else try {
				n += ` ${JSON.stringify(t.data)}`;
			} catch {
				n += ` ${String(t.data)}`;
			}
		}
		const i = [n];
		if (r) i.push(r);
		switch (t.level) {
			case 0:
				console.debug(...i);
				break;
			case 1:
				console.log(...i);
				break;
			case 2:
				console.warn(...i);
				break;
			case 3: console.error(...i);
		}
	}
};
var n = class {
	constructor() {
		this.handlers_ = [];
		this.minLevel_ = 1;
		this.addHandler(new t());
	}
	setMinLevel(e) {
		this.minLevel_ = e;
	}
	addHandler(e) {
		this.handlers_.push(e);
	}
	removeHandler(e) {
		const t = this.handlers_.indexOf(e);
		if (t !== -1) this.handlers_.splice(t, 1);
	}
	clearHandlers() {
		this.handlers_ = [];
	}
	debug(e, t, n) {
		this.log(0, e, t, n);
	}
	info(e, t, n) {
		this.log(1, e, t, n);
	}
	warn(e, t, n) {
		this.log(2, e, t, n);
	}
	error(e, t, n) {
		this.log(3, e, t, n);
	}
	log(e, t, n, r) {
		if (e < this.minLevel_) return;
		const i = {
			timestamp: Date.now(),
			level: e,
			category: t,
			message: n,
			data: r
		};
		for (const e of this.handlers_) try {
			e.handle(i);
		} catch (e) {
			console.error("[Logger] Handler threw error:", e);
		}
	}
};
const r = new n();
/**
* Default logger singleton. Prefer this over `console.*` inside the SDK
* so consumers can install a handler (e.g. an editor log panel) and
* receive structured `LogEntry`s with category + level.
*
* Usage: `import { log } from './logger'; log.warn('physics', 'foo', err);`
*/
const i = r;
function a() {
	return r;
}
function o(e) {
	r.setMinLevel(e);
}
function s(e, t, n) {
	r.debug(e, t, n);
}
function c(e, t, n) {
	r.info(e, t, n);
}
function l(e, t, n) {
	r.warn(e, t, n);
}
function u(e, t, n) {
	r.error(e, t, n);
}
//#endregion
export { a, o as c, u as i, l, n, c as o, s as r, i as s, e as t };

//# sourceMappingURL=logger.js.map