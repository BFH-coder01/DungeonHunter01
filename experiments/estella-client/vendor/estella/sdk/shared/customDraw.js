import { Z as e } from "./system.js";
import { s as t } from "./logger.js";
import { a as n, r, s as i } from "./material.js";
import { t as a } from "./CoreApiBridge.js";
//#region src/render/draw.ts
const o = new a("draw");
let s = null;
let c = 0;
let l = 0;
let u = 0;
const d = 256;
const f = new Float32Array(d);
const p = new Float32Array([
	1,
	0,
	0,
	0,
	0,
	1,
	0,
	0,
	0,
	0,
	1,
	0,
	0,
	0,
	0,
	1
]);
/** @internal Wired by the engine plugins — not part of the public API. */
/**
* Whether an engine core with a Draw API is installed. A core built without one
* (a headless or minimal build) still runs every plugin, and a plugin that
* registers a draw callback must not turn that into a thrown frame.
*/
function m() {
	return s !== null;
}
function h(e) {
	o.connect(e);
	s = o.module;
	c = s._malloc(64);
	l = s._malloc(64);
	u = s._malloc(d * 4);
}
function g() {
	if (s) {
		if (c) {
			s._free(c);
			c = 0;
		}
		if (l) {
			s._free(l);
			l = 0;
		}
		if (u) {
			s._free(u);
			u = 0;
		}
	}
	o.disconnect();
	s = null;
}
/** @internal Collect primitive batches for the owning renderer pass. */
function _(e, t, n) {
	x.begin(e, t, n);
	y().draw_deferBegin?.();
}
/** @internal Close custom overlay collection for the owning renderer pass. */
function v() {
	try {
		y().draw_deferEnd();
	} catch (t) {
		e(t, "Draw.endPresented");
	}
}
function y() {
	if (!s) throw new Error("Draw API not initialized. Call initDrawAPI() first.");
	return s;
}
const b = {
	r: 1,
	g: 1,
	b: 1,
	a: 1
};
const x = {
	begin(t, n = 0, r = 0) {
		const i = y();
		try {
			i.HEAPF32.set(t, c / 4);
			i.draw_begin(c, n, r);
		} catch (t) {
			e(t, "Draw.begin");
		}
	},
	end() {
		try {
			y().draw_end();
		} catch (t) {
			e(t, "Draw.end");
		}
	},
	line(t, n, r, i = 1) {
		try {
			y().draw_line(t.x, t.y, n.x, n.y, r.r, r.g, r.b, r.a, i);
		} catch (t) {
			e(t, "Draw.line");
		}
	},
	line3D(t, n, r, i = 1) {
		try {
			y().draw_line3D(t.x, t.y, t.z, n.x, n.y, n.z, r.r, r.g, r.b, r.a, i);
		} catch (t) {
			e(t, "Draw.line3D");
		}
	},
	line3DScreen(t, n, r, i = 1) {
		try {
			y().draw_line3DScreen(t.x, t.y, t.z, n.x, n.y, n.z, r.r, r.g, r.b, r.a, i);
		} catch (t) {
			e(t, "Draw.line3DScreen");
		}
	},
	line3DScreenOffset(t, n, r, i, a = 1) {
		try {
			y().draw_line3DScreenOffset(t.x, t.y, t.z, n.x, n.y, r.x, r.y, i.r, i.g, i.b, i.a, a);
		} catch (t) {
			e(t, "Draw.line3DScreenOffset");
		}
	},
	rect(t, n, r, i = true) {
		try {
			y().draw_rect(t.x, t.y, n.x, n.y, r.r, r.g, r.b, r.a, i);
		} catch (t) {
			e(t, "Draw.rect");
		}
	},
	rectOutline(t, n, r, i = 1) {
		try {
			y().draw_rectOutline(t.x, t.y, n.x, n.y, r.r, r.g, r.b, r.a, i);
		} catch (t) {
			e(t, "Draw.rectOutline");
		}
	},
	circle(t, n, r, i = true, a = 32) {
		try {
			y().draw_circle(t.x, t.y, n, r.r, r.g, r.b, r.a, i, a);
		} catch (t) {
			e(t, "Draw.circle");
		}
	},
	circleOutline(t, n, r, i = 1, a = 32) {
		try {
			y().draw_circleOutline(t.x, t.y, n, r.r, r.g, r.b, r.a, i, a);
		} catch (t) {
			e(t, "Draw.circleOutline");
		}
	},
	texture(t, n, r, i = b) {
		try {
			y().draw_texture(t.x, t.y, n.x, n.y, r, i.r, i.g, i.b, i.a);
		} catch (t) {
			e(t, "Draw.texture");
		}
	},
	textureRotated(t, n, r, i, a = b) {
		try {
			y().draw_textureRotated(t.x, t.y, n.x, n.y, r, i, a.r, a.g, a.b, a.a);
		} catch (t) {
			e(t, "Draw.textureRotated");
		}
	},
	setLayer(e) {
		y().draw_setLayer(e);
	},
	setDepth(e) {
		y().draw_setDepth(e);
	},
	getDrawCallCount() {
		if (!s) return 0;
		return s.draw_getDrawCallCount();
	},
	getPrimitiveCount() {
		if (!s) return 0;
		return s.draw_getPrimitiveCount();
	},
	setBlendMode(e) {
		y().draw_setBlendMode(e);
	},
	setDepthTest(e) {
		y().draw_setDepthTest(e);
	},
	withDepthState(e, t) {
		const n = y();
		if (!n.draw_getDepthState || !n.draw_setDepthState) return false;
		const r = n.draw_getDepthState();
		n.draw_setDepthState((e.test ? 1 : 0) | (e.write ? 2 : 0));
		try {
			t();
		} finally {
			n.draw_setDepthState(r);
		}
		return true;
	},
	drawMesh(t, n, r) {
		try {
			const e = y();
			e.HEAPF32.set(r, l / 4);
			e.draw_mesh(t, n, l);
		} catch (r) {
			e(r, `Draw.drawMesh(geometry=${t}, shader=${n})`);
		}
	},
	drawMeshWithMaterial(a, o, s) {
		try {
			const e = y();
			const c = r.get(o);
			if (!c) return;
			if (e.draw_meshWithMaterial(a, o)) return;
			const d = r.getRenderState(o);
			if (!d) return;
			x.setBlendMode(d.blendMode);
			x.setDepthTest(d.depthTest);
			if (s) e.HEAPF32.set(s, l / 4);
			else e.HEAPF32.set(p, l / 4);
			let m;
			if (!c.dirty_ && c.cachedBuffer_) m = c.cachedIdx_;
			else {
				m = 0;
				let e = 0;
				for (const [a, s] of r.getUniforms(o)) {
					if (m > 250) {
						t.warn("draw", "Uniform buffer overflow, some uniforms will be ignored");
						break;
					}
					const r = w(a);
					if (r < 0) continue;
					if (i(s)) {
						f[m++] = 10;
						f[m++] = r;
						f[m++] = s.slot ?? e++;
						f[m++] = s.textureId;
					} else {
						const { arity: e, values: t } = n(s);
						f[m++] = e;
						f[m++] = r;
						for (let n = 0; n < e; n++) f[m++] = t[n];
					}
				}
				if (!c.cachedBuffer_ || c.cachedBuffer_.length < m) c.cachedBuffer_ = new Float32Array(m);
				c.cachedBuffer_.set(f.subarray(0, m));
				c.cachedIdx_ = m;
				c.dirty_ = false;
			}
			if (m === 0) {
				e.draw_mesh(a, d.shader, l);
				return;
			}
			e.HEAPF32.set(c.cachedBuffer_.subarray(0, m), u / 4);
			e.draw_meshWithUniforms(a, d.shader, l, u, m);
		} catch (t) {
			e(t, `Draw.drawMeshWithMaterial(geometry=${a}, material=${o})`);
		}
	}
};
const S = {
	"u_time": 0,
	"u_color": 1,
	"u_intensity": 2,
	"u_scale": 3,
	"u_offset": 4,
	"u_param0": 5,
	"u_param1": 6,
	"u_param2": 7,
	"u_param3": 8,
	"u_param4": 9,
	"u_vec0": 10,
	"u_vec1": 11,
	"u_vec2": 12,
	"u_vec3": 13,
	"u_texture0": 14,
	"u_texture1": 15,
	"u_texture2": 16,
	"u_texture3": 17
};
const C = /* @__PURE__ */ new Set();
function w(e) {
	const n = S[e];
	if (n !== void 0) return n;
	if (!C.has(e)) {
		C.add(e);
		t.warn("draw", `Unknown uniform name "${e}" - supported: ${Object.keys(S).join(", ")}`);
	}
	return -1;
}
//#endregion
//#region src/render/customDraw.ts
const T = /* @__PURE__ */ new Map();
function E(e, t, n) {
	T.set(e, {
		fn: t,
		scene: n ?? ""
	});
}
/** An engine-owned overlay belongs to one world's render passes. @internal */
function D(e, t, n) {
	T.set(e, {
		fn: n,
		scene: "",
		registry: t
	});
}
function O(e) {
	T.delete(e);
}
function k() {
	T.clear();
}
function A() {
	return T;
}
const j = /* @__PURE__ */ new Map();
function M(e, t) {
	j.set(e, t);
}
function N(e) {
	j.delete(e);
}
function P() {
	return j;
}
//#endregion
export { M as a, N as c, v as d, h as f, E as i, x as l, g as m, A as n, D as o, m as p, P as r, O as s, k as t, _ as u };

//# sourceMappingURL=customDraw.js.map