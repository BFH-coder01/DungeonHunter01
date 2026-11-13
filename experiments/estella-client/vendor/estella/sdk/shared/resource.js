import { or as e } from "./system.js";
//#region src/ecs/resourceShapes.ts
/**
* @file    resourceShapes.ts
* @brief   The built-in resources a compiled system can read, and their layout.
*
* @details A compiled system reaches a resource by ADDRESS, so it needs a
*          layout, and a layout needs exactly one author. This is that author:
*          `resource.ts` builds `Time` from it, the AOT compiler derives offsets
*          from it, and the runtime mirrors a resource into a block shaped by it.
*
*          A member is a SCALAR or a BIT SET. Scalars are the fields a system
*          reads by name. A bit set is how a SERVICE becomes memory: a method
*          whose argument is a compile-time key is one bit, so `isKeyDown('KeyW')`
*          is a load and a mask rather than a call the contract has no way to
*          make. `methods` is that mapping, and it is the only thing that makes
*          such a call lowerable.
*
*          Order is the layout, in both directions: adding a member moves every
*          member after it, and adding a key renumbers every key after it.
*
*          `fields` carries a value per scalar. For `Time` that value IS the
*          default the resource is built with; for a service the resource builds
*          itself, and the value only says which of the two scalar types the
*          field is. `resource-shape.test.ts` holds the declaration against the
*          real object either way.
*
*          NO IMPORTS. A build tool reads this without pulling in the engine.
*/
/**
* The keys a compiled system may name, and the bit each one is. `KeyboardEvent.
* code` values: physical keys, so they do not move with the layout the player
* types in. A key outside this list is not a lowering failure to work around —
* the system falls back to its closure and runs interpreted.
*/
const t = [
	"KeyA",
	"KeyB",
	"KeyC",
	"KeyD",
	"KeyE",
	"KeyF",
	"KeyG",
	"KeyH",
	"KeyI",
	"KeyJ",
	"KeyK",
	"KeyL",
	"KeyM",
	"KeyN",
	"KeyO",
	"KeyP",
	"KeyQ",
	"KeyR",
	"KeyS",
	"KeyT",
	"KeyU",
	"KeyV",
	"KeyW",
	"KeyX",
	"KeyY",
	"KeyZ",
	"Digit0",
	"Digit1",
	"Digit2",
	"Digit3",
	"Digit4",
	"Digit5",
	"Digit6",
	"Digit7",
	"Digit8",
	"Digit9",
	"F1",
	"F2",
	"F3",
	"F4",
	"F5",
	"F6",
	"F7",
	"F8",
	"F9",
	"F10",
	"F11",
	"F12",
	"ArrowUp",
	"ArrowDown",
	"ArrowLeft",
	"ArrowRight",
	"ShiftLeft",
	"ShiftRight",
	"ControlLeft",
	"ControlRight",
	"AltLeft",
	"AltRight",
	"MetaLeft",
	"MetaRight",
	"Space",
	"Enter",
	"Escape",
	"Tab",
	"Backspace",
	"Delete",
	"Insert",
	"Home",
	"End",
	"PageUp",
	"PageDown",
	"Minus",
	"Equal",
	"BracketLeft",
	"BracketRight",
	"Backslash",
	"Semicolon",
	"Quote",
	"Backquote",
	"Comma",
	"Period",
	"Slash",
	"Numpad0",
	"Numpad1",
	"Numpad2",
	"Numpad3",
	"Numpad4",
	"Numpad5",
	"Numpad6",
	"Numpad7",
	"Numpad8",
	"Numpad9",
	"NumpadAdd",
	"NumpadSubtract",
	"NumpadMultiply",
	"NumpadDivide",
	"NumpadDecimal",
	"NumpadEnter",
	"CapsLock",
	"NumLock",
	"ScrollLock",
	"PrintScreen",
	"Pause",
	"ContextMenu"
];
/** Mouse buttons, where the button NUMBER is the bit: 0 left, 1 middle, 2 right. */
const n = 8;
const r = {
	Time: { fields: {
		delta: 0,
		elapsed: 0,
		frameCount: 0,
		fixedDelta: 1 / 60,
		fixedAlpha: 0,
		fixedTick: 0,
		scale: 1,
		unscaledDelta: 0
	} },
	/**
	* The edge sets are the ones a call would have RESOLVED, not the raw state:
	* `isKeyPressed` reads a different set inside a fixed step, and the host
	* mirrors whichever one applies. Compiled code reads one bit either way.
	*/
	Input: {
		fields: {
			mouseX: 0,
			mouseY: 0,
			scrollDeltaX: 0,
			scrollDeltaY: 0,
			touchAvailable: false
		},
		bits: {
			keyDown: { keys: t },
			keyPressed: { keys: t },
			keyReleased: { keys: t },
			mouseDown: { count: n },
			mousePressed: { count: n },
			mouseReleased: { count: n }
		},
		methods: {
			isKeyDown: "keyDown",
			isKeyPressed: "keyPressed",
			isKeyReleased: "keyReleased",
			isMouseButtonDown: "mouseDown",
			isMouseButtonPressed: "mousePressed",
			isMouseButtonReleased: "mouseReleased"
		}
	},
	/**
	* The UI surface. `viewProjection` is a Float32Array and is deliberately
	* absent: a member has to have a fixed width, and a system reading it is
	* refused by name rather than handed something else at that offset.
	*/
	UICameraInfo: { fields: {
		vpX: 0,
		vpY: 0,
		vpW: 0,
		vpH: 0,
		screenW: 0,
		screenH: 0,
		worldLeft: 0,
		worldBottom: 0,
		worldRight: 0,
		worldTop: 0,
		worldMouseX: 0,
		worldMouseY: 0,
		valid: false
	} }
};
/** Names of the resources with a layout — what tells a host shape from a component. */
const i = Object.keys(r);
/** A scalar is one f64, so a bit set is padded to the same step. */
const a = 8;
/**
* `name`'s block, member by member, or null if it has no layout. Scalars first
* in declaration order, then bit sets: two groups so that adding a key to a set
* cannot move a scalar, which is the field an offset is most often read at.
*/
function o(e) {
	const t = r[e];
	if (!t) return null;
	const n = [];
	let i = 0;
	for (const e of Object.keys(t.fields)) {
		n.push({
			kind: "scalar",
			name: e,
			offset: i
		});
		i += a;
	}
	for (const [e, r] of Object.entries(t.bits ?? {})) {
		const t = r.keys ? r.keys.length : r.count ?? 0;
		n.push({
			kind: "bits",
			name: e,
			offset: i,
			bits: t
		});
		i += Math.ceil(t / 8 / a) * a;
	}
	return n;
}
/** How many bytes `name`'s block takes. */
function s(e) {
	const t = o(e);
	if (!t) return 0;
	const n = t[t.length - 1];
	if (!n) return 0;
	return n.kind === "scalar" ? n.offset + a : n.offset + Math.ceil(n.bits / 8 / a) * a;
}
/**
* How a host FILLS a bit set: the method to ask, and every key to ask it about.
* Asking the method rather than reading the state behind it is what keeps the
* mirror honest — `isKeyPressed` answers from a different set inside a fixed
* step, and that decision lives in the method.
*/
function c(e, t) {
	const n = r[e];
	const i = Object.entries(n?.methods ?? {}).find(([, e]) => e === t)?.[0];
	const a = n?.bits?.[t];
	if (!i || !a) return null;
	return {
		method: i,
		keys: a.keys ?? Array.from({ length: a.count ?? 0 }, (e, t) => t)
	};
}
//#endregion
//#region src/ecs/resource.ts
/**
* @file    resource.ts
* @brief   Resource system for global singleton data
*/
let l = 0;
const u = /* @__PURE__ */ new Map();
function d(e) {
	let t = u.get(e);
	if (t === void 0) {
		t = Symbol(`Resource_${e}`);
		u.set(e, t);
	}
	return t;
}
/**
* Declare a resource: one value the whole world shares. A NAMED one is addressed
* by its name, so two declarations of one name are one resource; an unnamed one
* is addressed by the definition, and two calls answer two.
*
* An empty slot materialises the LATEST declaration's `defaultValue`.
*
* @public
*/
function f(e, t) {
	const n = `Resource_${++l}`;
	const i = {
		_id: t === void 0 ? Symbol(n) : d(t),
		_name: t ?? n,
		_default: e
	};
	if (t && r[t]) p.set(t, i);
	else if (t !== void 0) m.set(t, i);
	return i;
}
/** Registered by `defineResource` for the names `resourceShapes.ts` declares. */
const p = /* @__PURE__ */ new Map();
/** And for the names a PROJECT declares, which a manifest also carries. */
const m = /* @__PURE__ */ new Map();
/**
* The engine resource a manifest's NAME refers to, or undefined when the module
* that declared it was never loaded — a trimmed build without the input plugin
* would be one, and a twin reading a resource with no address is not something
* to discover at the first row.
*
* @internal
*/
function h(e) {
	return p.get(e);
}
/**
* A named resource a project DECLARED, whether or not anything has inserted one.
*
* The storage learns a name on INSERT, so a resource nothing had touched was
* invisible to the AOT handshake.
*
* @internal
*/
function g(e) {
	return m.get(e);
}
/**
* Ask a system for read access to a resource: the world's single instance of
* `resource`, passed to the system body as the stored value itself.
*
* Not a copy — an object resource's fields are reachable through it. Replacing
* the value, and the change tick recording it, is what {@link ResMut} is for.
*
* @public
*/
function _(e) {
	return {
		_type: "res",
		_resource: e
	};
}
/**
* Ask a system for write access to a resource. The body receives a
* {@link ResMutInstance}, not the value: `set` or `modify` is what stores it back
* and stamps the change tick a `Changed` filter reads.
*
* @public
*/
function v(e) {
	return {
		_type: "res_mut",
		_resource: e
	};
}
/**
* Write access to a resource, as {@link ResMut} asked for. `get` reads,
* `set` replaces, `modify` edits in place — and both writers store the value
* back and bump the change tick, which is the part `Res` cannot do.
*
* @public
*/
var y = class {
	constructor(e, t) {
		this.value_ = e;
		this.setter_ = t;
	}
	get() {
		return this.value_;
	}
	set(e) {
		this.value_ = e;
		this.setter_(e);
	}
	modify(e) {
		e(this.value_);
		this.setter_(this.value_);
	}
	/** @internal */
	updateValue(e) {
		this.value_ = e;
	}
};
var b = class {
	constructor() {
		this.resources_ = /* @__PURE__ */ new Map();
		this.resMutPool_ = /* @__PURE__ */ new Map();
		this.ticks_ = /* @__PURE__ */ new Map();
		this.globalTick_ = 0;
		this.nameRegistry_ = /* @__PURE__ */ new Map();
		this.defaulted_ = /* @__PURE__ */ new Set();
		this.names_ = /* @__PURE__ */ new Map();
	}
	/** Record what a slot is called, whichever door reached it. */
	note_(e) {
		this.names_.set(e._id, e._name);
		if (e._name && !e._name.startsWith("Resource_")) this.nameRegistry_.set(e._name, e);
	}
	insert(e, t) {
		this.resources_.set(e._id, t);
		this.defaulted_.delete(e._id);
		this.ticks_.set(e._id, ++this.globalTick_);
		this.note_(e);
	}
	get(t) {
		if (!this.resources_.has(t._id)) {
			this.resources_.set(t._id, e(t._default));
			this.defaulted_.add(t._id);
			this.names_.set(t._id, t._name);
		}
		return this.resources_.get(t._id);
	}
	set(e, t) {
		this.resources_.set(e._id, t);
		this.defaulted_.delete(e._id);
		this.ticks_.set(e._id, ++this.globalTick_);
		this.note_(e);
	}
	has(e) {
		return this.resources_.has(e._id) && !this.defaulted_.has(e._id);
	}
	remove(e) {
		this.resources_.delete(e._id);
		this.defaulted_.delete(e._id);
		this.resMutPool_.delete(e._id);
		this.ticks_.delete(e._id);
		this.names_.delete(e._id);
		this.nameRegistry_.delete(e._name);
	}
	/**
	* Every slot this storage holds, as `[name, value]` — including one only a
	* read has materialised, which is most of them in a running game.
	*
	* The name is the declaration's. Reconstructing it from the id's
	* description is a second author of what a resource is called.
	*/
	entries() {
		return [...this.resources_].map(([e, t]) => [this.names_.get(e) ?? "", t]);
	}
	getChangeTick(e) {
		return this.ticks_.get(e._id) ?? 0;
	}
	getByName(e) {
		return this.nameRegistry_.get(e);
	}
	getRegisteredNames() {
		return Array.from(this.nameRegistry_.keys());
	}
	getResMut(e) {
		let t = this.resMutPool_.get(e._id);
		if (t) {
			t.updateValue(this.get(e));
			return t;
		}
		t = new y(this.get(e), (t) => this.set(e, t));
		this.resMutPool_.set(e._id, t);
		return t;
	}
};
/**
* The frame clock, as `Res(Time)`. The engine writes it once per frame before
* any system runs; `scale` is the one field a project sets.
*
* @public
*/
const x = f({ ...r["Time"].fields }, "Time");
//#endregion
export { h as a, i as c, s as d, o as f, x as i, r as l, v as n, g as o, b as r, f as s, _ as t, c as u };

//# sourceMappingURL=resource.js.map