import { s as e } from "./resource.js";
//#region src/physics/Physics2DRuntime.ts
/**
* @file    Physics2DRuntime.ts
* @brief   Resource holding the physics wasm module + its load promise
*
* Decoupling this from App as a resource (instead of dynamic
* properties) lets Physics2DPlugin own the lifetime of the module
* without mutating App, and lets other systems read readiness
* state in the same way they read any other resource.
*/
const t = e({
	module: null,
	initPromise: null
}, "Physics2DRuntime");
//#endregion
export { t };

//# sourceMappingURL=Physics2DRuntime.js.map