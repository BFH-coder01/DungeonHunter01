import { $t as e, b as t, c as n, n as r, t as i } from "./system.js";
import { i as a, s as o, t as s } from "./resource.js";
import { s as c } from "./env.js";
import { o as l } from "./SpriteAnimator.js";
import { r as u } from "./input.js";
import { n as d, t as f } from "./registryLookup.js";
import { d as p, n as m, p as h, r as g, t as _ } from "./worldView.js";
import { c as v, n as y, t as b } from "./AiContext.js";
//#region src/ai/fsm/types.ts
/** Registry name of an action ref ('' for none). */
function x(e) {
	return typeof e === "string" ? e : e?.name ?? "";
}
/** Argument of an action ref, if any. */
function S(e) {
	return typeof e === "object" && e !== null ? e.arg : void 0;
}
/** Declared parameters of an action ref, if it was authored with them. */
function C(e) {
	return typeof e === "object" && e !== null ? e.params : void 0;
}
//#endregion
//#region src/ai/fsm/FsmRunner.ts
/**
* @file    FsmRunner.ts
* @brief   The state-machine interpreter — pure, generic, unit-testable.
*
* `compileFsm` indexes a definition once (per loaded asset); `stepFsm` advances
* one runtime instance one tick. Semantics: at most one transition per tick;
* `onEnter` runs the tick a state becomes active, `onExit` when it is left,
* `onUpdate` on ticks where no transition fires.
*/
function w(e) {
	const t = /* @__PURE__ */ new Map();
	for (const n of e.states) t.set(n.name, n);
	return {
		initial: e.initial,
		states: t
	};
}
function T(e) {
	return {
		current: e.initial,
		previous: null,
		entered: false
	};
}
/**
* Advance one tick. Returns true if a transition was taken. The new state's
* `onEnter` runs on the following tick (via `entered=false`), so a pass-through
* state cleanly enters-then-exits across two ticks rather than looping.
*/
function E(e, t, n, r, i) {
	const a = e.states.get(t.current);
	if (!a) return false;
	if (!t.entered) {
		O(i, a.onEnter, n, r);
		t.entered = true;
	}
	for (const e of a.transitions ?? []) if (D(e, n, r, i)) {
		if (e.trigger) r.consume(e.trigger);
		O(i, a.onExit, n, r);
		t.previous = t.current;
		t.current = e.to;
		t.entered = false;
		return true;
	}
	O(i, a.onUpdate, n, r);
	return false;
}
function D(e, t, n, r) {
	if (e.trigger && !n.isFired(e.trigger)) return false;
	if (e.condition) {
		const i = r.getCondition(e.condition);
		if (!i || !i(t, n)) return false;
	}
	if (e.guard && !h(n, e.guard)) return false;
	return true;
}
function O(e, t, n, r) {
	const i = x(t);
	if (!i) return;
	v(e, i, n, r, {
		arg: S(t),
		params: C(t)
	});
}
//#endregion
//#region src/ai/fsm/StateMachineAgent.ts
/**
* @file    StateMachineAgent.ts
* @brief   StateMachineAgent component + the compiled-FSM store.
*
* The component is the authorable half: which FSM to run (a registered name or a
* `.esfsm` asset key) plus the observable current state. Named `StateMachineAgent`
* to stay clear of the UI-owned `StateMachine` component.
*/
const k = e("StateMachineAgent", {
	fsm: "",
	current: ""
}, {
	assetFields: [{
		field: "fsm",
		type: "statemachine"
	}],
	discoverAssets: (e) => {
		const t = e.fsm;
		return typeof t === "string" && (t.endsWith(".esfsm") || l(t)) ? [{
			type: "statemachine",
			path: t
		}] : [];
	},
	fields: { current: {
		advanced: true,
		tooltip: "Active state (runtime, read-only)."
	} }
});
/**
* FSMs a game registered in CODE, process-wide. An `.esfsm` does not land here —
* it belongs to the realm that loaded it, which a lookup asks first. Live rather
* than copied per App: hot reload re-imports the bundle into a RUNNING app, so a
* copy taken at build would answer with the version from before the edit.
*/
const A = /* @__PURE__ */ new Map();
/** Register (compile) an FSM under `key` — the code half of the registry. */
function j(e, t) {
	const n = w(t);
	A.set(e, n);
	return n;
}
function M(e) {
	return A.get(e);
}
/** Every registered FSM. What the schedule reads to learn what the FSM system
*  reaches for — that answer lives in the loaded graphs, not in the system. */
function N() {
	return A.values();
}
/** Drop all registered FSMs (tests / hot-reload). */
function P() {
	A.clear();
}
//#endregion
//#region src/ai/fsm/FsmPlugin.ts
/** Get (creating if needed) an agent's blackboard — lets game code seed data / fire triggers early. */
function F(e, t) {
	let n = e.get(t);
	if (!n) {
		n = {
			bb: new p(),
			run: null,
			fsmKey: null
		};
		e.set(t, n);
	}
	return n.bb;
}
/** Advance every StateMachineAgent one tick. `states` carries per-entity runtime across frames. */
function I(e, t, n, r, i, a = y()) {
	if (n <= 0) return;
	const o = {
		entity: 0,
		dt: n,
		blackboard: null,
		input: a,
		world: e,
		commands: t,
		get: (t) => e.get(o.entity, t),
		set: (t, n) => e.set(o.entity, t, n),
		has: (t) => e.has(o.entity, t)
	};
	for (const t of e.getEntitiesWithComponents([k])) {
		const a = e.get(t, k);
		if (!a.fsm) continue;
		const s = i?.(a.fsm) ?? M(a.fsm);
		if (!s) continue;
		let c = r.get(t);
		if (!c) {
			c = {
				bb: new p(),
				run: null,
				fsmKey: null
			};
			r.set(t, c);
		}
		if (c.run === null || c.fsmKey !== a.fsm) {
			c.run = T(s);
			c.fsmKey = a.fsm;
		}
		o.entity = t;
		o.dt = n;
		o.blackboard = c.bb;
		E(s, c.run, o, c.bb, b);
		if (a.current !== c.run.current) {
			a.current = c.run.current;
			e.set(t, k, a);
		}
	}
}
/** Every leaf a compiled FSM names: the three state hooks and the transition
*  conditions. Blackboard guards reach no component, so they are not leaves. */
function* L(e) {
	for (const t of e.states.values()) {
		for (const e of [
			t.onEnter,
			t.onUpdate,
			t.onExit
		]) {
			const t = x(e);
			if (!t) continue;
			yield {
				kind: "action",
				name: t,
				input: {
					arg: S(e),
					params: C(e)
				}
			};
		}
		for (const e of t.transitions ?? []) if (e.condition) yield {
			kind: "condition",
			name: e.condition
		};
	}
}
/**
* What the FSM system reaches for: the union over the graphs THIS app has —
* the ones its realm published, plus the ones code registered.
*
* Read per app, because a schedule is per app: a module-global store had one
* app's asset deciding what another app's system declares it touches.
*/
function R(e) {
	const t = new _().writing(k._name);
	const n = [...d(e, "statemachine"), ...N()];
	for (const e of n) m(b, L(e), t);
	return t.build();
}
/** Resource for game code to reach an agent's blackboard / current state. */
var z = class {
	constructor(e) {
		this.states = e;
	}
	blackboard(e) {
		return F(this.states, e);
	}
	/** Fire a one-shot trigger consumed by the agent's next enabled transition. */
	fire(e, t) {
		F(this.states, e).fire(t);
	}
	/** The agent's active state name, or null before its first tick. */
	state(e) {
		return this.states.get(e)?.run?.current ?? null;
	}
};
const B = o(null, "AiFsm");
var V = class {
	constructor() {
		this.name = "fsm";
		this.activeWhen = [k];
	}
	build(e) {
		g();
		const r = /* @__PURE__ */ new Map();
		e.world.onDespawn((e) => r.delete(e));
		e.insertResource(B, new z(r));
		const o = (t) => f(e, "statemachine", t);
		e.addSystemToSchedule(3, n([
			s(a),
			s(u),
			t(),
			i()
		], (e, t, n, i) => {
			I(i, n, e.delta, r, o, t);
		}, {
			name: "StateMachineSystem",
			touches: () => R(e)
		}), { runIf: c });
	}
};
const H = new V();
//#endregion
//#region src/stateGraph.ts
function U(e, t) {
	const n = [];
	for (const r of e.states(t)) e.transitions(r).forEach((e, t) => {
		n.push({
			id: `${r.name}->${e.to}#${t}`,
			from: r.name,
			to: e.to,
			index: t,
			transition: e
		});
	});
	return n;
}
function W(e, t, n, r = 0, i = 0) {
	const a = e.states(t);
	if (a.some((e) => e.name === n)) return t;
	const o = e.withStates(t, [...a, e.makeState(n, r, i)]);
	return a.length === 0 ? e.withInitial(o, n) : o;
}
function G(e, t, n) {
	const r = e.states(t).filter((e) => e.name !== n).map((t) => e.transitions(t).some((e) => e.to === n) ? e.withTransitions(t, e.transitions(t).filter((e) => e.to !== n)) : t);
	const i = e.withStates(t, r);
	return e.initial(t) === n ? e.withInitial(i, r[0]?.name ?? "") : i;
}
function K(e, t, n, r, i) {
	return e.withStates(t, e.states(t).map((e) => e.name === n ? {
		...e,
		x: r,
		y: i
	} : e));
}
/** Rename a state, rewiring `initial` and every state transition that targets it. */
function q(e, t, n, r) {
	if (n === r || !r) return t;
	const i = e.states(t);
	if (i.some((e) => e.name === r)) return t;
	const a = i.map((t) => {
		const i = t.name === n ? {
			...t,
			name: r
		} : t;
		return e.transitions(i).some((e) => e.to === n) ? e.withTransitions(i, e.transitions(i).map((e) => e.to === n ? {
			...e,
			to: r
		} : e)) : i;
	});
	const o = e.withStates(t, a);
	return e.initial(t) === n ? e.withInitial(o, r) : o;
}
function J(e, t, n) {
	return e.states(t).some((e) => e.name === n) ? e.withInitial(t, n) : t;
}
function Y(e, t, n, r) {
	return e.withStates(t, e.states(t).map((t) => t.name === n ? e.withTransitions(t, [...e.transitions(t), e.makeTransition(r)]) : t));
}
function X(e, t, n, r) {
	return e.withStates(t, e.states(t).map((t) => t.name === n ? e.withTransitions(t, e.transitions(t).filter((e, t) => t !== r)) : t));
}
function Z(e, t, n, r, i) {
	return e.withStates(t, e.states(t).map((t) => t.name === n ? e.withTransitions(t, e.transitions(t).map((e, t) => t === r ? {
		...e,
		...i
	} : e)) : t));
}
//#endregion
export { S as C, E as S, C as T, P as _, G as a, w as b, J as c, V as d, z as f, k as g, I as h, K as i, Z as l, H as m, Y as n, X as o, F as p, U as r, q as s, W as t, B as u, M as v, x as w, T as x, j as y };

//# sourceMappingURL=stateGraph.js.map