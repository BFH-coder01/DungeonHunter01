import { s as e } from "./logger.js";
import { n as t } from "./context.js";
import { a as n, t as r } from "./worldUnits.js";
import { n as i, t as a } from "./disposeAll.js";
import { i as o, n as s, r as c, t as l } from "./moduleHealth.js";
import { n as u } from "./wasmScratch.js";
//#region src/util/ownProperties.ts
/** ES-compatible own-field lookup for schema records, including null prototypes. */
function d(e, t) {
	return Object.prototype.hasOwnProperty.call(e, t);
}
/** Write a data member on a fresh record without invoking __proto__'s setter. */
function f(e, t, n) {
	if (t === "__proto__") Object.defineProperty(e, t, {
		value: n,
		enumerable: true,
		writable: true,
		configurable: true
	});
	else e[t] = n;
}
//#endregion
//#region src/util/deepClone.ts
/**
* @file    deepClone.ts
* @brief   Structural deep clone for plain data (objects, arrays, primitives)
*/
/**
* Recursively clone plain objects and arrays; primitives AND class instances
* (Map, Date, a custom class with methods, …) pass through by reference.
*
* Used to materialise per-instance copies of shared default templates (component
* defaults, resource defaults) so mutating one instance never leaks into the
* shared definition or a sibling world. Class instances pass through because
* cloning them into a bare object would strip their prototype (and methods) — a
* resource whose default is a stateful singleton keeps its identity. Avoids
* `structuredClone`, which is absent in some minigame runtimes.
*/
function p(e) {
	if (e === null || typeof e !== "object") return e;
	if (Array.isArray(e)) return e.map(p);
	const t = Object.getPrototypeOf(e);
	if (t !== Object.prototype && t !== null) return e;
	const n = {};
	for (const t of Object.keys(e)) f(n, t, p(e[t]));
	return n;
}
//#endregion
//#region src/ecs/component.generated.ts
/**
* Single-source-of-truth hash of the C++/TS boundary ABI (component
* schema + pointer layouts). The WASM module exposes the same digest via
* getAbiLayoutHash(); BuiltinBridge.connect() compares them and refuses to
* run on mismatch, because mismatched offsets read the wrong heap bytes.
*/
const m = "cb0184ba3431d6f9";
const h = {
	Billboard: {
		defaults: {
			mode: 0,
			enabled: true
		},
		assetFields: [],
		entityFields: [],
		colorFields: [],
		animatableFields: [],
		fields: {
			mode: {
				enum: [{
					label: "ViewPlane",
					value: 0
				}, {
					label: "Upright",
					value: 1
				}],
				tooltip: "View plane lies flat in the view, like a particle. Upright turns about world up only, so it stays standing as the camera looks down."
			},
			enabled: { tooltip: "Off: the mesh keeps the entity's own rotation." }
		}
	},
	BitmapText: {
		defaults: {
			text: "",
			color: {
				r: 1,
				g: 1,
				b: 1,
				a: 1
			},
			fontSize: 1,
			align: 0,
			spacing: 0,
			parallax: {
				x: 1,
				y: 1
			},
			layer: 0,
			font: 0,
			enabled: true
		},
		renderableField: "enabled",
		assetFields: [{
			field: "font",
			type: "font"
		}],
		entityFields: [],
		colorFields: ["color"],
		animatableFields: [
			"color.r",
			"color.g",
			"color.b",
			"color.a"
		],
		fields: {
			fontSize: { min: 1 },
			align: { enum: [
				{
					label: "Left",
					value: 0
				},
				{
					label: "Center",
					value: 1
				},
				{
					label: "Right",
					value: 2
				}
			] },
			parallax: {
				tooltip: "Parallax scroll factor (1 = with world, <1 = slower, 0 = locked to camera).",
				advanced: true
			},
			layer: { step: 1 }
		}
	},
	BoxCollider2D: {
		defaults: {
			halfExtents: {
				x: .5,
				y: .5
			},
			offset: {
				x: 0,
				y: 0
			},
			density: 1,
			friction: .3,
			restitution: 0,
			isSensor: false,
			enabled: true,
			categoryBits: 1,
			maskBits: 65535
		},
		assetFields: [],
		entityFields: [],
		colorFields: [],
		animatableFields: []
	},
	BoxCollider3D: {
		defaults: {
			halfExtents: {
				x: 50,
				y: 50,
				z: 50
			},
			center: {
				x: 0,
				y: 0,
				z: 0
			},
			friction: .3,
			restitution: 0,
			isSensor: false,
			enabled: true
		},
		assetFields: [],
		entityFields: [],
		colorFields: [],
		animatableFields: [],
		fields: {
			friction: { min: 0 },
			restitution: {
				min: 0,
				max: 1
			}
		}
	},
	Camera: {
		defaults: {
			projectionType: 0,
			fov: 60,
			orthoSize: 5,
			nearPlane: .1,
			farPlane: 1e3,
			aspectRatio: 0,
			isActive: false,
			priority: 0,
			viewport: {
				x: 0,
				y: 0,
				z: 1,
				w: 1
			},
			clearFlags: 3,
			pixelPerfect: false,
			cullingMask: 4294967295,
			renderTarget: 0
		},
		editorDefaults: {
			projectionType: 1,
			orthoSize: 540,
			aspectRatio: 1.77,
			isActive: true
		},
		assetFields: [],
		entityFields: [],
		colorFields: [],
		animatableFields: ["orthoSize"],
		fields: {
			projectionType: {
				enum: [{
					label: "Perspective",
					value: 0
				}, {
					label: "Orthographic",
					value: 1
				}],
				tooltip: "Orthographic (2D) or Perspective projection."
			},
			fov: {
				min: 1,
				max: 179,
				unit: "°",
				shownWhen: {
					field: "projectionType",
					values: [0]
				}
			},
			orthoSize: {
				min: 0,
				tooltip: "Half the visible height in world units (Orthographic).",
				shownWhen: {
					field: "projectionType",
					values: [1]
				}
			},
			nearPlane: {
				min: 0,
				advanced: true
			},
			farPlane: {
				min: 0,
				advanced: true
			},
			aspectRatio: { advanced: true },
			priority: {
				step: 1,
				advanced: true
			},
			clearFlags: { tooltip: "Which buffers to clear before rendering this camera." },
			pixelPerfect: {
				tooltip: "Snap the camera to the pixel grid for crisp pixel-art (Orthographic).",
				advanced: true,
				shownWhen: {
					field: "projectionType",
					values: [1]
				}
			},
			cullingMask: {
				tooltip: "Which sorting layers this camera renders.",
				bitmask: { source: "sortingLayers" }
			},
			renderTarget: {
				tooltip: "Render into a RenderTexture instead of the screen (0 = screen). Set at run time.",
				advanced: true
			}
		}
	},
	Canvas: {
		defaults: {
			designResolution: {
				x: 1920,
				y: 1080
			},
			pixelsPerUnit: 100,
			scaleMode: 1,
			matchWidthOrHeight: .5,
			backgroundColor: {
				r: 0,
				g: 0,
				b: 0,
				a: 1
			},
			layer: 0
		},
		assetFields: [],
		entityFields: [],
		colorFields: ["backgroundColor"],
		animatableFields: [],
		fields: {
			pixelsPerUnit: {
				min: 1,
				tooltip: "World pixels per physics meter (Box2D + tile collider scale)."
			},
			scaleMode: {
				enum: [
					{
						label: "FixedWidth",
						value: 0
					},
					{
						label: "FixedHeight",
						value: 1
					},
					{
						label: "Expand",
						value: 2
					},
					{
						label: "Shrink",
						value: 3
					},
					{
						label: "Match",
						value: 4
					}
				],
				tooltip: "How the canvas adapts the design resolution to the screen."
			},
			matchWidthOrHeight: {
				min: 0,
				max: 1,
				slider: true,
				tooltip: "0 matches width, 1 matches height (Match mode only)."
			},
			layer: {
				step: 1,
				tooltip: "Sorting layer this UI belongs to — cameras cull by it.",
				enumSource: "sortingLayers"
			}
		}
	},
	CapsuleCollider2D: {
		defaults: {
			radius: .25,
			halfHeight: .5,
			offset: {
				x: 0,
				y: 0
			},
			density: 1,
			friction: .3,
			restitution: 0,
			isSensor: false,
			enabled: true,
			categoryBits: 1,
			maskBits: 65535
		},
		assetFields: [],
		entityFields: [],
		colorFields: [],
		animatableFields: []
	},
	CapsuleCollider3D: {
		defaults: {
			radius: 30,
			halfHeight: 50,
			center: {
				x: 0,
				y: 0,
				z: 0
			},
			friction: .3,
			restitution: 0,
			isSensor: false,
			enabled: true
		},
		assetFields: [],
		entityFields: [],
		colorFields: [],
		animatableFields: [],
		fields: {
			radius: { min: 0 },
			halfHeight: { min: 0 },
			friction: { min: 0 },
			restitution: {
				min: 0,
				max: 1
			}
		}
	},
	CharacterController3D: {
		defaults: {
			velocity: {
				x: 0,
				y: 0,
				z: 0
			},
			radius: 30,
			halfHeight: 50,
			maxSlope: .87,
			stepHeight: 40,
			snapDown: 50,
			mass: 70,
			pushForce: 5e3,
			enabled: true,
			layer: 0,
			isOnFloor: false,
			floorNormal: {
				x: 0,
				y: 0,
				z: 0
			},
			realVelocity: {
				x: 0,
				y: 0,
				z: 0
			}
		},
		assetFields: [],
		entityFields: [],
		colorFields: [],
		animatableFields: [],
		fields: {
			radius: { min: 0 },
			halfHeight: { min: 0 },
			maxSlope: {
				min: 0,
				max: 1.5708,
				unit: "rad"
			},
			stepHeight: {
				min: 0,
				advanced: true
			},
			snapDown: {
				min: 0,
				advanced: true
			},
			mass: {
				min: 0,
				advanced: true
			},
			pushForce: {
				min: 0,
				advanced: true
			},
			layer: {
				min: 0,
				max: 15,
				advanced: true
			},
			isOnFloor: { advanced: true },
			floorNormal: { advanced: true },
			realVelocity: { advanced: true }
		}
	},
	Children: {
		defaults: { entities: [] },
		assetFields: [],
		entityFields: ["entities"],
		colorFields: [],
		animatableFields: []
	},
	CircleCollider2D: {
		defaults: {
			radius: .5,
			offset: {
				x: 0,
				y: 0
			},
			density: 1,
			friction: .3,
			restitution: 0,
			isSensor: false,
			enabled: true,
			categoryBits: 1,
			maskBits: 65535
		},
		assetFields: [],
		entityFields: [],
		colorFields: [],
		animatableFields: []
	},
	ContentRect: {
		defaults: {
			size: {
				x: 100,
				y: 100
			},
			pivot: {
				x: .5,
				y: .5
			}
		},
		assetFields: [],
		entityFields: [],
		colorFields: [],
		animatableFields: [],
		fields: {
			size: {
				min: 0,
				tooltip: "Width and height of the content in local units (before scale)."
			},
			pivot: {
				tooltip: "The point of the rectangle the entity sits on, as a fraction of its size (0.5,0.5 = centre). Rotation and scale turn about it.",
				normalizedOf: "size"
			}
		}
	},
	ConvexCollider3D: {
		defaults: {
			mesh: 0,
			friction: .3,
			restitution: 0,
			isSensor: false,
			enabled: true
		},
		assetFields: [{
			field: "mesh",
			type: "mesh"
		}],
		entityFields: [],
		colorFields: [],
		animatableFields: [],
		fields: {
			mesh: { tooltip: "Geometry (.esmesh) whose convex hull collides." },
			friction: { min: 0 },
			restitution: {
				min: 0,
				max: 1
			}
		}
	},
	Draggable: {
		defaults: {
			enabled: true,
			dragThreshold: 5,
			lockX: false,
			lockY: false,
			constrainMin: false,
			constraintMin: {
				x: 0,
				y: 0
			},
			constrainMax: false,
			constraintMax: {
				x: 0,
				y: 0
			}
		},
		assetFields: [],
		entityFields: [],
		colorFields: [],
		animatableFields: [],
		fields: {
			enabled: { tooltip: "Whether this entity can be dragged at all." },
			dragThreshold: {
				min: 0,
				unit: "px",
				tooltip: "Pointer travel before a press becomes a drag."
			},
			lockX: {
				tooltip: "Pin the X axis; the drag only moves in Y.",
				category: "Axis"
			},
			lockY: {
				tooltip: "Pin the Y axis; the drag only moves in X.",
				category: "Axis"
			},
			constrainMin: {
				tooltip: "Apply the lower bound below.",
				category: "Bounds"
			},
			constraintMin: {
				tooltip: "Lowest world position the drag may reach.",
				category: "Bounds"
			},
			constrainMax: {
				tooltip: "Apply the upper bound below.",
				category: "Bounds"
			},
			constraintMax: {
				tooltip: "Highest world position the drag may reach.",
				category: "Bounds"
			}
		}
	},
	DragonBonesAnimation: {
		defaults: {
			skeletonPath: "",
			atlasPath: "",
			armature: "",
			animation: "",
			timeScale: 1,
			loop: true,
			playing: true,
			fadeInTime: 0,
			flipX: false,
			flipY: false,
			color: {
				r: 1,
				g: 1,
				b: 1,
				a: 1
			},
			layer: 0,
			skeletonScale: 1,
			material: 0,
			enabled: true
		},
		renderableField: "enabled",
		assetFields: [{
			field: "material",
			type: "material"
		}],
		skeletal: {
			skeletonField: "skeletonPath",
			atlasField: "atlasPath",
			runtime: "dragonbones"
		},
		entityFields: [],
		colorFields: ["color"],
		animatableFields: [],
		fields: {
			armature: { enumSource: "dragonbonesArmatures" },
			animation: { enumSource: "dragonbonesAnimations" },
			timeScale: { min: 0 },
			fadeInTime: {
				min: 0,
				step: .05
			},
			layer: {
				step: 1,
				enumSource: "sortingLayers"
			},
			skeletonScale: { min: 0 }
		}
	},
	FlexContainer: {
		defaults: {
			direction: 0,
			wrap: 0,
			justifyContent: 0,
			alignItems: 3,
			alignContent: 0,
			gap: {
				x: 0,
				y: 0
			},
			padding: {
				left: 0,
				top: 0,
				right: 0,
				bottom: 0
			}
		},
		assetFields: [],
		entityFields: [],
		colorFields: [],
		animatableFields: [],
		fields: {
			direction: { enum: [
				{
					label: "Row",
					value: 0
				},
				{
					label: "Column",
					value: 1
				},
				{
					label: "RowReverse",
					value: 2
				},
				{
					label: "ColumnReverse",
					value: 3
				}
			] },
			wrap: { enum: [{
				label: "NoWrap",
				value: 0
			}, {
				label: "Wrap",
				value: 1
			}] },
			justifyContent: { enum: [
				{
					label: "Start",
					value: 0
				},
				{
					label: "Center",
					value: 1
				},
				{
					label: "End",
					value: 2
				},
				{
					label: "SpaceBetween",
					value: 3
				},
				{
					label: "SpaceAround",
					value: 4
				},
				{
					label: "SpaceEvenly",
					value: 5
				}
			] },
			alignItems: { enum: [
				{
					label: "Start",
					value: 0
				},
				{
					label: "Center",
					value: 1
				},
				{
					label: "End",
					value: 2
				},
				{
					label: "Stretch",
					value: 3
				}
			] },
			alignContent: { enum: [
				{
					label: "Start",
					value: 0
				},
				{
					label: "Center",
					value: 1
				},
				{
					label: "End",
					value: 2
				},
				{
					label: "Stretch",
					value: 3
				},
				{
					label: "SpaceBetween",
					value: 4
				},
				{
					label: "SpaceAround",
					value: 5
				}
			] }
		}
	},
	GroupOpacity: {
		defaults: {
			opacity: 1,
			enabled: true
		},
		assetFields: [],
		entityFields: [],
		colorFields: [],
		animatableFields: [],
		fields: { opacity: {
			min: 0,
			max: 1,
			step: .01,
			tooltip: "Opacity of this entity and everything under it, multiplied with the opacity of every group above it."
		} }
	},
	Impostor: {
		defaults: {
			screenSize: .06,
			frames: 8,
			resolution: 1024,
			enabled: true
		},
		assetFields: [],
		entityFields: [],
		colorFields: [],
		animatableFields: [],
		fields: {
			screenSize: {
				min: 0,
				max: 1,
				tooltip: "Screen height fraction below which the card replaces the mesh."
			},
			frames: {
				min: 2,
				max: 16,
				step: 1,
				tooltip: "Pictures along each side of the atlas (frames x frames in all). More is smoother as the view goes round, and smaller each."
			},
			resolution: {
				min: 128,
				max: 4096,
				step: 128,
				tooltip: "The atlas's side in pixels; each picture is this divided by frames."
			},
			enabled: { tooltip: "Off: the mesh is always drawn as itself." }
		}
	},
	Interactable: {
		defaults: {
			enabled: true,
			blockRaycast: true,
			raycastTarget: true
		},
		assetFields: [],
		entityFields: [],
		colorFields: [],
		animatableFields: []
	},
	LODGroup: {
		defaults: {
			lod1: 0,
			lod2: 0,
			lod3: 0,
			lod1Size: .5,
			lod2Size: .25,
			lod3Size: .1,
			cullSize: .02,
			hysteresis: .1,
			enabled: true
		},
		assetFields: [
			{
				field: "lod1",
				type: "mesh"
			},
			{
				field: "lod2",
				type: "mesh"
			},
			{
				field: "lod3",
				type: "mesh"
			}
		],
		entityFields: [],
		colorFields: [],
		animatableFields: [],
		fields: {
			lod1: { tooltip: "Geometry drawn below the LOD 1 screen size." },
			lod2: { tooltip: "Geometry drawn below the LOD 2 screen size." },
			lod3: { tooltip: "Geometry drawn below the LOD 3 screen size." },
			lod1Size: {
				min: 0,
				max: 1,
				tooltip: "Screen height fraction below which LOD 1 takes over."
			},
			lod2Size: {
				min: 0,
				max: 1,
				tooltip: "Screen height fraction below which LOD 2 takes over."
			},
			lod3Size: {
				min: 0,
				max: 1,
				tooltip: "Screen height fraction below which LOD 3 takes over."
			},
			cullSize: {
				min: 0,
				max: 1,
				tooltip: "Screen height fraction below which nothing is drawn (0 = never)."
			},
			hysteresis: {
				min: 0,
				max: 1,
				tooltip: "Extra fraction to grow past a threshold before the finer level returns.",
				advanced: true
			},
			enabled: { tooltip: "Off: the MeshRenderer's own mesh is always drawn." }
		}
	},
	Light: {
		defaults: {
			type: 0,
			color: {
				r: 1,
				g: 1,
				b: 1,
				a: 1
			},
			intensity: 1,
			radius: 200,
			innerRadius: 0,
			falloff: 1,
			inverseSquare: false,
			shadowStrength: 1,
			layerMin: -128,
			layerMax: 127,
			cookie: 0,
			cookieSize: {
				x: 0,
				y: 0
			},
			innerAngle: 30,
			outerAngle: 45,
			shadowSoftness: 0,
			sourceAngle: .53,
			shadowDistance: 0,
			meshShadows: false,
			shadowExtent: 0,
			followEnvironmentSun: false,
			aimFollowedSun: false,
			environment: 0,
			environmentRotation: 0,
			drawEnvironment: false,
			reflectionScale: 1,
			reflectionSaturation: 1,
			bakedTint: {
				r: 1,
				g: 1,
				b: 1,
				a: 1
			},
			hemisphere: false,
			groundColor: {
				r: .35,
				g: .3,
				b: .25,
				a: 1
			},
			enabled: true
		},
		renderableField: "enabled",
		assetFields: [{
			field: "cookie",
			type: "texture"
		}, {
			field: "environment",
			type: "environment"
		}],
		entityFields: [],
		colorFields: [
			"color",
			"bakedTint",
			"groundColor"
		],
		animatableFields: [
			"color.r",
			"color.g",
			"color.b",
			"color.a",
			"intensity",
			"radius",
			"innerRadius",
			"falloff",
			"shadowStrength",
			"cookieSize.x",
			"cookieSize.y",
			"innerAngle",
			"outerAngle",
			"shadowSoftness",
			"sourceAngle",
			"shadowDistance",
			"groundColor.r",
			"groundColor.g",
			"groundColor.b",
			"groundColor.a"
		],
		fields: {
			type: {
				enum: [
					{
						label: "Point",
						value: 0
					},
					{
						label: "Directional",
						value: 1
					},
					{
						label: "Ambient",
						value: 2
					},
					{
						label: "Spot",
						value: 3
					}
				],
				tooltip: "Point, Directional, Ambient, or Spot."
			},
			intensity: {
				min: 0,
				tooltip: "Brightness multiplier of the light."
			},
			radius: {
				min: 0,
				tooltip: "Falloff reach in world units (Point / Spot).",
				shownWhen: {
					field: "type",
					values: [0, 3]
				}
			},
			innerRadius: {
				min: 0,
				tooltip: "Radius held at full strength before the falloff starts.",
				shownWhen: {
					field: "type",
					values: [0, 3]
				}
			},
			falloff: {
				min: 0,
				max: 8,
				tooltip: "Falloff shape: 1 = linear, higher pools near the light, lower reaches further.",
				shownWhen: {
					field: "type",
					values: [0, 3]
				}
			},
			inverseSquare: {
				tooltip: "Fall off as 1/distance² in metres (a real lamp): intensity is the light 1 m away, radius only where it ends.",
				shownWhen: {
					field: "type",
					values: [0, 3]
				}
			},
			shadowStrength: {
				min: 0,
				max: 1,
				slider: true,
				tooltip: "How much of this light its shadows remove (1 = all of it).",
				shownWhen: {
					field: "type",
					values: [
						0,
						1,
						3
					]
				}
			},
			layerMin: {
				min: -128,
				max: 127,
				step: 1,
				tooltip: "The lowest sprite layer this light reaches (default: every layer).",
				shownWhen: {
					field: "type",
					values: [
						0,
						1,
						3
					]
				}
			},
			layerMax: {
				min: -128,
				max: 127,
				step: 1,
				tooltip: "The highest sprite layer this light reaches (default: every layer).",
				shownWhen: {
					field: "type",
					values: [
						0,
						1,
						3
					]
				}
			},
			cookie: {
				tooltip: "A texture whose alpha shapes this light (a cookie).",
				shownWhen: {
					field: "type",
					values: [0, 3]
				}
			},
			cookieSize: {
				min: 0,
				tooltip: "Cookie size in world units; 0 = the light's own reach.",
				shownWhen: {
					field: "type",
					values: [0, 3]
				}
			},
			innerAngle: {
				min: 0,
				max: 180,
				unit: "°",
				advanced: true,
				shownWhen: {
					field: "type",
					values: [3]
				}
			},
			outerAngle: {
				min: 0,
				max: 180,
				unit: "°",
				advanced: true,
				shownWhen: {
					field: "type",
					values: [3]
				}
			},
			shadowSoftness: {
				min: 0,
				tooltip: "Shadow softness (light-source size); 0 = hard edge.",
				shownWhen: {
					field: "type",
					values: [
						0,
						1,
						3
					]
				}
			},
			sourceAngle: {
				min: 0,
				max: 90,
				unit: "°",
				tooltip: "Angular size of a Directional light's source (the sun is 0.53); 0 = hard edge.",
				advanced: true,
				shownWhen: {
					field: "type",
					values: [1]
				}
			},
			shadowDistance: {
				min: 0,
				tooltip: "Directional shadow distance; 0 = no directional shadow.",
				advanced: true,
				shownWhen: {
					field: "type",
					values: [1]
				}
			},
			meshShadows: {
				tooltip: "Cast a shadow map over 3D meshes (Directional, Spot, Point).",
				shownWhen: {
					field: "type",
					values: [
						0,
						1,
						3
					]
				}
			},
			shadowExtent: {
				min: 0,
				tooltip: "Shadow map coverage radius; 0 = fit the view.",
				advanced: true,
				shownWhen: {
					field: "type",
					values: [1]
				}
			},
			followEnvironmentSun: {
				tooltip: "Take direction and strength from the environment's sun, and light the sky without it.",
				shownWhen: {
					field: "type",
					values: [1]
				}
			},
			aimFollowedSun: {
				tooltip: "With Follow Environment Sun: aim by this light's Transform, not by the panorama.",
				advanced: true,
				shownWhen: {
					field: "type",
					values: [1]
				}
			},
			environment: {
				tooltip: "Baked environment (.esenv) this Ambient light casts.",
				shownWhen: {
					field: "type",
					values: [2]
				}
			},
			environmentRotation: {
				unit: "deg",
				tooltip: "Turn the environment about the up axis, in degrees.",
				shownWhen: {
					field: "type",
					values: [2]
				}
			},
			drawEnvironment: {
				tooltip: "Draw this environment as the sky behind the scene.",
				shownWhen: {
					field: "type",
					values: [2]
				}
			},
			reflectionScale: {
				min: 0,
				tooltip: "Scale what baked reflection probes show (1 = as baked).",
				advanced: true,
				shownWhen: {
					field: "type",
					values: [2]
				}
			},
			reflectionSaturation: {
				min: 0,
				max: 1,
				tooltip: "How much colour baked reflection probes keep (0 = grey).",
				advanced: true,
				shownWhen: {
					field: "type",
					values: [2]
				}
			},
			bakedTint: {
				tooltip: "Multiply baked indirect light (lightmaps, probe volumes) by this colour (1 = as baked).",
				advanced: true,
				shownWhen: {
					field: "type",
					values: [2]
				}
			},
			hemisphere: {
				tooltip: "Light from above in Color, from below in Ground Color, blended by which way a surface faces.",
				shownWhen: {
					field: "type",
					values: [2]
				}
			},
			groundColor: {
				tooltip: "The ambient colour a surface facing straight down receives (Hemisphere).",
				shownWhen: {
					field: "type",
					values: [2]
				}
			}
		}
	},
	LightProbeVolume: {
		defaults: {
			probes: 0,
			capture: false,
			captureInterval: 0,
			halfExtents: {
				x: 100,
				y: 100,
				z: 100
			},
			spacing: 100,
			enabled: true
		},
		assetFields: [{
			field: "probes",
			type: "probeVolume"
		}],
		entityFields: [],
		colorFields: [],
		animatableFields: [],
		fields: {
			probes: { tooltip: "Baked probe grid (.esprobes) filling this box." },
			capture: { tooltip: "Fill this box at run time from a capture at its centre (the room as lit now), not from a bake." },
			captureInterval: {
				min: 0,
				tooltip: "Seconds between captures (0 = once). Each one adds a bounce.",
				shownWhen: {
					field: "capture",
					values: [1]
				}
			},
			halfExtents: {
				min: 0,
				tooltip: "Half the box this volume covers, from the entity's position."
			},
			spacing: {
				min: 1,
				tooltip: "World units between probes the next bake lays down."
			}
		}
	},
	MeshCollider3D: {
		defaults: {
			mesh: 0,
			friction: .3,
			restitution: 0,
			layer: 0,
			enabled: true
		},
		assetFields: [{
			field: "mesh",
			type: "mesh"
		}],
		entityFields: [],
		colorFields: [],
		animatableFields: [],
		fields: {
			mesh: { tooltip: "Geometry (.esmesh) to collide against." },
			friction: { min: 0 },
			restitution: {
				min: 0,
				max: 1
			},
			layer: {
				min: 0,
				max: 15,
				advanced: true
			}
		}
	},
	MeshInstances: {
		defaults: {
			lod1Mesh: 0,
			lodDistance: 0,
			minDistance: 0,
			drawDistance: 0,
			shadowDistance: 0
		},
		assetFields: [{
			field: "lod1Mesh",
			type: "mesh"
		}],
		entityFields: [],
		colorFields: [],
		animatableFields: [],
		fields: {
			lod1Mesh: { tooltip: "The cheaper mesh used past the LOD distance. Needs the same channels as the mesh." },
			lodDistance: { tooltip: "Distance (metres) past which the cheaper mesh is used. 0 = never." },
			minDistance: { tooltip: "Distance (metres) nearer than which an instance is not drawn. 0 = from the eye." },
			drawDistance: { tooltip: "Distance (metres) past which an instance is not drawn. 0 = unlimited." },
			shadowDistance: { tooltip: "Distance (metres) past which an instance casts no shadow. 0 = as far as it is drawn." }
		}
	},
	MeshLightmap: {
		defaults: {
			lightmap: 0,
			scaleOffset: {
				x: 1,
				y: 1,
				z: 0,
				w: 0
			}
		},
		assetFields: [{
			field: "lightmap",
			type: "texture"
		}],
		entityFields: [],
		colorFields: [],
		animatableFields: [],
		fields: {
			lightmap: { tooltip: "Baked lightmap atlas. Needs a mesh with a second UV set." },
			scaleOffset: {
				tooltip: "Atlas rectangle: xy scales the second UV set, zw offsets it.",
				advanced: true
			}
		}
	},
	MeshMorph: {
		defaults: { weights: [] },
		assetFields: [],
		entityFields: [],
		listFields: ["weights"],
		numberListFields: ["weights"],
		colorFields: [],
		animatableFields: ["weights"],
		fields: { weights: {
			tooltip: "Weight per morph target of the mesh, in the order the mesh carries them.",
			labelSource: "meshMorphTargets"
		} }
	},
	MeshRenderer: {
		defaults: {
			texture: 0,
			normalMap: 0,
			color: {
				r: 1,
				g: 1,
				b: 1,
				a: 1
			},
			layer: 0,
			opaque: false,
			cullBackfaces: false,
			lit: false,
			castShadows: true,
			parallax: {
				x: 1,
				y: 1
			},
			material: 0,
			enabled: true,
			mesh: 0
		},
		renderableField: "enabled",
		assetFields: [
			{
				field: "texture",
				type: "texture"
			},
			{
				field: "normalMap",
				type: "texture"
			},
			{
				field: "material",
				type: "material"
			},
			{
				field: "mesh",
				type: "mesh"
			}
		],
		entityFields: [],
		colorFields: ["color"],
		animatableFields: [
			"color.r",
			"color.g",
			"color.b",
			"color.a"
		],
		fields: {
			normalMap: { tooltip: "Normal map (tangent space). Needs a mesh with normals." },
			color: { tooltip: "Tint multiplied into the vertex colors (white = unchanged)." },
			layer: {
				step: 1,
				tooltip: "Sorting layer — controls draw order across renderables.",
				enumSource: "sortingLayers"
			},
			opaque: { tooltip: "Opaque: no blending; writes and tests depth, so meshes occlude each other." },
			cullBackfaces: { tooltip: "Cull back faces: triangles facing away from the camera are skipped." },
			lit: { tooltip: "Receive 2D lights: Light entities light this mesh (flat normal). A custom material overrides this." },
			castShadows: { tooltip: "Cast shadows: whether this mesh blocks the light. Water and other surfaces light passes through say no." },
			parallax: {
				tooltip: "Parallax scroll factor (1 = with world, <1 = slower, 0 = locked to camera).",
				advanced: true
			},
			material: { advanced: true }
		}
	},
	MeshSkin: {
		defaults: { joints: [] },
		assetFields: [],
		entityFields: ["joints"],
		colorFields: [],
		animatableFields: [],
		fields: { joints: { tooltip: "Joint entities, in the order the mesh's bind matrices are in." } }
	},
	Occluder: {
		defaults: {
			halfExtents: {
				x: 50,
				y: 50,
				z: 50
			},
			enabled: true
		},
		assetFields: [],
		entityFields: [],
		colorFields: [],
		animatableFields: [],
		fields: {
			halfExtents: {
				min: 0,
				tooltip: "Half the solid box, in world units, from the entity's position."
			},
			enabled: { tooltip: "Off: this box hides nothing." }
		}
	},
	Parent: {
		defaults: { entity: 0 },
		assetFields: [],
		entityFields: ["entity"],
		colorFields: [],
		animatableFields: []
	},
	ParticleCollider: {
		defaults: {
			shape: 0,
			radius: 50,
			halfHeight: 50,
			halfExtents: {
				x: 50,
				y: 50,
				z: 50
			},
			inverted: false,
			mask: 65535,
			enabled: true
		},
		assetFields: [],
		entityFields: [],
		colorFields: [],
		animatableFields: [],
		fields: {
			shape: {
				enum: [
					{
						label: "Sphere",
						value: 0
					},
					{
						label: "Box",
						value: 1
					},
					{
						label: "Capsule",
						value: 2
					}
				],
				category: "Shape"
			},
			radius: {
				min: 0,
				category: "Shape"
			},
			halfHeight: {
				min: 0,
				category: "Shape"
			},
			halfExtents: { category: "Shape" },
			inverted: { category: "Shape" },
			mask: {
				min: 0,
				max: 65535,
				step: 1,
				category: "Shape",
				bitmask: { source: "collisionLayers" }
			}
		}
	},
	ParticleEmitter: {
		defaults: {
			rate: 10,
			burstCount: 0,
			burstInterval: 1,
			duration: 5,
			simulationSpeed: 1,
			startDelay: 0,
			looping: true,
			playOnStart: true,
			maxParticles: 1e3,
			gpuSimulation: false,
			lifetimeMin: 5,
			lifetimeMax: 5,
			shape: 3,
			shapeRadius: 100,
			shapeSize: {
				x: 100,
				y: 100,
				z: 0
			},
			shapeAngle: 25,
			speedMin: 500,
			speedMax: 500,
			angleSpreadMin: 0,
			angleSpreadMax: 360,
			startSizeMin: 100,
			startSizeMax: 100,
			endSizeMin: 100,
			endSizeMax: 100,
			sizeEasing: 0,
			startColor: {
				r: 1,
				g: 1,
				b: 1,
				a: 1
			},
			endColor: {
				r: 1,
				g: 1,
				b: 1,
				a: 0
			},
			colorEasing: 0,
			rotationMin: 0,
			rotationMax: 0,
			angularVelocityMin: 0,
			angularVelocityMax: 0,
			gravity: {
				x: 0,
				y: 0,
				z: 0
			},
			damping: 0,
			addedVelocityMin: {
				x: 0,
				y: 0,
				z: 0
			},
			addedVelocityMax: {
				x: 0,
				y: 0,
				z: 0
			},
			speedLimit: 0,
			limitDampen: 1,
			noiseStrength: 0,
			noiseFrequency: .01,
			noiseScrollSpeed: 0,
			noiseOctaves: 1,
			texture: 0,
			spriteColumns: 1,
			spriteRows: 1,
			spriteFPS: 10,
			spriteLoop: true,
			blendMode: 1,
			layer: 0,
			material: 0,
			simulationSpace: 0,
			renderMode: 0,
			velocityScale: 0,
			lengthScale: 1,
			enabled: true,
			subEmitterTrigger: 0,
			subEmitterChance: 1,
			subEmitterInheritVelocity: 0,
			subEmitter: 0,
			trailEnabled: false,
			trailWidth: 8,
			trailPoints: 6,
			trailMinDistance: 6,
			collisionEnabled: false,
			collisionFloor: 0,
			collisionMode: 0,
			collisionMask: 65535,
			collisionQueryBudget: 128,
			collisionMaxDistance: 0,
			collisionFallback: 0,
			collisionEvents: false,
			collisionEventBudget: 32,
			collisionThickness: 30,
			collisionBounce: .5,
			collisionFriction: .1,
			collisionLifetimeLoss: 0
		},
		renderableField: "enabled",
		assetFields: [{
			field: "texture",
			type: "texture"
		}, {
			field: "material",
			type: "material"
		}],
		entityFields: ["subEmitter"],
		colorFields: ["startColor", "endColor"],
		animatableFields: [],
		fields: {
			rate: {
				min: 0,
				category: "Emission"
			},
			burstCount: {
				min: 0,
				step: 1,
				category: "Emission"
			},
			burstInterval: {
				min: 0,
				category: "Emission"
			},
			duration: {
				min: 0,
				category: "Emission"
			},
			simulationSpeed: {
				min: 0,
				tooltip: "How fast this emitter's own time runs: 2 plays it twice as fast, 0.5 at half, 0 holds it. Scales emission, lifetimes and motion alike.",
				category: "Emission"
			},
			startDelay: {
				min: 0,
				tooltip: "Seconds after the emitter starts playing before it emits anything. The duration counts from the end of the delay.",
				category: "Emission"
			},
			looping: { category: "Emission" },
			playOnStart: { category: "Emission" },
			maxParticles: {
				min: 1,
				step: 1,
				category: "Emission"
			},
			gpuSimulation: {
				tooltip: "Simulate on the GPU (WebGPU compute). Falls back to a capped CPU simulation elsewhere. Sub-emitters, trails and physics collision are CPU-only.",
				category: "Emission"
			},
			lifetimeMin: {
				min: 0,
				category: "Lifetime"
			},
			lifetimeMax: {
				min: 0,
				category: "Lifetime"
			},
			shape: {
				enum: [
					{
						label: "Point",
						value: 0
					},
					{
						label: "Circle",
						value: 1
					},
					{
						label: "Box",
						value: 2
					},
					{
						label: "Cone",
						value: 3
					},
					{
						label: "Sphere",
						value: 4
					},
					{
						label: "Hemisphere",
						value: 5
					}
				],
				category: "Shape"
			},
			shapeRadius: {
				min: 0,
				category: "Shape",
				shownWhen: {
					field: "shape",
					values: [
						1,
						3,
						4,
						5
					]
				}
			},
			shapeSize: {
				category: "Shape",
				shownWhen: {
					field: "shape",
					values: [2]
				}
			},
			shapeAngle: {
				unit: "°",
				category: "Shape",
				shownWhen: {
					field: "shape",
					values: [3]
				}
			},
			speedMin: { category: "Velocity" },
			speedMax: { category: "Velocity" },
			angleSpreadMin: {
				unit: "°",
				category: "Velocity",
				shownWhen: {
					field: "shape",
					values: [0, 2]
				}
			},
			angleSpreadMax: {
				unit: "°",
				category: "Velocity",
				shownWhen: {
					field: "shape",
					values: [0, 2]
				}
			},
			startSizeMin: {
				min: 0,
				category: "Size"
			},
			startSizeMax: {
				min: 0,
				category: "Size"
			},
			endSizeMin: {
				min: 0,
				category: "Size"
			},
			endSizeMax: {
				min: 0,
				category: "Size"
			},
			sizeEasing: {
				enum: [
					{
						label: "Linear",
						value: 0
					},
					{
						label: "EaseIn",
						value: 1
					},
					{
						label: "EaseOut",
						value: 2
					},
					{
						label: "EaseInOut",
						value: 3
					}
				],
				category: "Size"
			},
			startColor: { category: "Color" },
			endColor: { category: "Color" },
			colorEasing: {
				enum: [
					{
						label: "Linear",
						value: 0
					},
					{
						label: "EaseIn",
						value: 1
					},
					{
						label: "EaseOut",
						value: 2
					},
					{
						label: "EaseInOut",
						value: 3
					}
				],
				category: "Color"
			},
			rotationMin: {
				unit: "°",
				category: "Rotation"
			},
			rotationMax: {
				unit: "°",
				category: "Rotation"
			},
			angularVelocityMin: { category: "Rotation" },
			angularVelocityMax: { category: "Rotation" },
			gravity: { category: "Velocity" },
			damping: {
				min: 0,
				category: "Velocity"
			},
			addedVelocityMin: {
				tooltip: "A velocity each particle carries on top of its own, chosen between the two ends when it is born. Gravity, damping, noise and the speed limit do not act on it. Run by the CPU simulation.",
				category: "Velocity"
			},
			addedVelocityMax: { category: "Velocity" },
			speedLimit: {
				min: 0,
				tooltip: "The fastest a particle may move under its own velocity; 0 is no limit. A faster particle is pulled back toward the limit. Run by the CPU simulation.",
				category: "Velocity"
			},
			limitDampen: {
				min: 0,
				max: 1,
				tooltip: "How much of the excess over the limit is removed per 1/60 s: 1 clamps at once, a small value brakes gently.",
				category: "Velocity"
			},
			noiseStrength: {
				min: 0,
				category: "Noise"
			},
			noiseFrequency: {
				min: 0,
				category: "Noise"
			},
			noiseScrollSpeed: { category: "Noise" },
			noiseOctaves: {
				min: 1,
				max: 8,
				step: 1,
				category: "Noise"
			},
			texture: { category: "Texture" },
			spriteColumns: {
				min: 1,
				step: 1,
				category: "Texture"
			},
			spriteRows: {
				min: 1,
				step: 1,
				category: "Texture"
			},
			spriteFPS: {
				min: 0,
				category: "Texture"
			},
			spriteLoop: { category: "Texture" },
			blendMode: { category: "Rendering" },
			layer: {
				step: 1,
				category: "Rendering",
				enumSource: "sortingLayers"
			},
			material: { category: "Rendering" },
			simulationSpace: {
				enum: [{
					label: "World",
					value: 0
				}, {
					label: "Local",
					value: 1
				}],
				category: "Rendering"
			},
			renderMode: {
				enum: [{
					label: "Billboard",
					value: 0
				}, {
					label: "Stretched",
					value: 1
				}],
				tooltip: "Billboard faces the view. Stretched lays the quad's long axis (its Y) along the particle's velocity and lengthens it with speed. Drawn by the CPU simulation; a GPU-simulated emitter draws as Billboard.",
				category: "Rendering"
			},
			velocityScale: {
				min: 0,
				tooltip: "Stretched: how much of the particle's speed is added to the quad's length, in world units per unit of speed.",
				category: "Rendering",
				shownWhen: {
					field: "renderMode",
					values: [1]
				}
			},
			lengthScale: {
				min: 0,
				tooltip: "Stretched: the quad's own length is its size times this.",
				category: "Rendering",
				shownWhen: {
					field: "renderMode",
					values: [1]
				}
			},
			subEmitterTrigger: {
				enum: [
					{
						label: "Death",
						value: 0
					},
					{
						label: "Birth",
						value: 1
					},
					{
						label: "Collision",
						value: 2
					}
				],
				category: "SubEmitter"
			},
			subEmitterChance: {
				min: 0,
				max: 1,
				category: "SubEmitter"
			},
			subEmitterInheritVelocity: {
				min: 0,
				max: 1,
				category: "SubEmitter"
			},
			subEmitter: { category: "SubEmitter" },
			trailEnabled: { category: "Trail" },
			trailWidth: {
				min: 0,
				category: "Trail",
				shownWhen: {
					field: "trailEnabled",
					values: [1]
				}
			},
			trailPoints: {
				min: 2,
				max: 12,
				step: 1,
				category: "Trail",
				shownWhen: {
					field: "trailEnabled",
					values: [1]
				}
			},
			trailMinDistance: {
				min: 0,
				category: "Trail",
				shownWhen: {
					field: "trailEnabled",
					values: [1]
				}
			},
			collisionEnabled: { category: "Collision" },
			collisionFloor: {
				category: "Collision",
				shownWhen: {
					field: "collisionEnabled",
					values: [1]
				}
			},
			collisionMode: {
				enum: [
					{
						label: "Floor",
						value: 0
					},
					{
						label: "Physics2D",
						value: 1
					},
					{
						label: "Physics3D",
						value: 2
					},
					{
						label: "Depth",
						value: 3
					},
					{
						label: "Sdf",
						value: 4
					}
				],
				category: "Collision",
				shownWhen: {
					field: "collisionEnabled",
					values: [1]
				}
			},
			collisionMask: {
				min: 0,
				max: 65535,
				step: 1,
				category: "Collision",
				bitmask: { source: "collisionLayers" },
				shownWhen: {
					field: "collisionEnabled",
					values: [1]
				}
			},
			collisionQueryBudget: {
				min: 0,
				max: 4096,
				step: 1,
				category: "Collision",
				shownWhen: {
					field: "collisionEnabled",
					values: [1]
				}
			},
			collisionMaxDistance: {
				min: 0,
				category: "Collision",
				shownWhen: {
					field: "collisionEnabled",
					values: [1]
				}
			},
			collisionFallback: {
				enum: [{
					label: "Floor",
					value: 0
				}, {
					label: "Skip",
					value: 1
				}],
				category: "Collision",
				shownWhen: {
					field: "collisionEnabled",
					values: [1]
				}
			},
			collisionEvents: {
				category: "Collision",
				shownWhen: {
					field: "collisionEnabled",
					values: [1]
				}
			},
			collisionEventBudget: {
				min: 0,
				max: 1024,
				step: 1,
				category: "Collision",
				shownWhen: {
					field: "collisionEnabled",
					values: [1]
				}
			},
			collisionThickness: {
				min: 0,
				category: "Collision",
				shownWhen: {
					field: "collisionEnabled",
					values: [1]
				}
			},
			collisionBounce: {
				min: 0,
				max: 1,
				category: "Collision",
				shownWhen: {
					field: "collisionEnabled",
					values: [1]
				}
			},
			collisionFriction: {
				min: 0,
				max: 1,
				category: "Collision",
				shownWhen: {
					field: "collisionEnabled",
					values: [1]
				}
			},
			collisionLifetimeLoss: {
				min: 0,
				max: 1,
				category: "Collision",
				shownWhen: {
					field: "collisionEnabled",
					values: [1]
				}
			}
		}
	},
	ParticleForceField: {
		defaults: {
			type: 0,
			strength: 200,
			radius: 0,
			direction: {
				x: 1,
				y: 0,
				z: 0
			},
			falloff: true,
			enabled: true
		},
		assetFields: [],
		entityFields: [],
		colorFields: [],
		animatableFields: [],
		fields: {
			type: {
				enum: [
					{
						label: "Directional",
						value: 0
					},
					{
						label: "Point",
						value: 1
					},
					{
						label: "Vortex",
						value: 2
					},
					{
						label: "Drag",
						value: 3
					}
				],
				category: "Field"
			},
			strength: { category: "Field" },
			radius: {
				min: 0,
				category: "Field"
			},
			direction: { category: "Field" },
			falloff: { category: "Field" }
		}
	},
	PlanarReflection: {
		defaults: {
			axis: 1,
			clipOffset: .02,
			cullingMask: 4294967295,
			quality: 0,
			resolutionScale: .5,
			maxSize: 1024,
			update: 0,
			updatesPerSecond: 30,
			revision: 0,
			enabled: true
		},
		assetFields: [],
		entityFields: [],
		colorFields: [],
		animatableFields: [],
		fields: {
			axis: {
				enum: [
					{
						label: "X",
						value: 0
					},
					{
						label: "Y",
						value: 1
					},
					{
						label: "Z",
						value: 2
					}
				],
				tooltip: "Local normal axis, transformed with the entity. Y for a floor, Z for a mirror.",
				category: "Capture"
			},
			clipOffset: {
				min: 0,
				step: .005,
				tooltip: "Clip offset in world units; excludes geometry behind the reflecting plane.",
				category: "Capture"
			},
			cullingMask: {
				tooltip: "Sorting-layer bits captured by the reflection. The receiving surface and screen UI are excluded.",
				category: "Capture",
				bitmask: { source: "sortingLayers" }
			},
			quality: {
				enum: [{
					label: "Project",
					value: 0
				}, {
					label: "Custom",
					value: 1
				}],
				category: "Quality"
			},
			resolutionScale: {
				min: .125,
				max: 1,
				step: .125,
				category: "Quality",
				shownWhen: {
					field: "quality",
					values: [1]
				}
			},
			maxSize: {
				min: 64,
				max: 4096,
				step: 64,
				category: "Quality",
				shownWhen: {
					field: "quality",
					values: [1]
				}
			},
			update: {
				enum: [
					{
						label: "EveryFrame",
						value: 0
					},
					{
						label: "FixedRate",
						value: 1
					},
					{
						label: "OnDemand",
						value: 2
					}
				],
				tooltip: "Only the reflection capture; never limits the main scene frame rate.",
				category: "Quality",
				shownWhen: {
					field: "quality",
					values: [1]
				}
			},
			updatesPerSecond: {
				min: 1,
				max: 120,
				category: "Quality",
				shownWhen: {
					field: "update",
					values: [1]
				}
			},
			revision: { advanced: true }
		}
	},
	ReflectionProbe: {
		defaults: {
			reflection: 0,
			halfExtents: {
				x: 200,
				y: 200,
				z: 200
			},
			slot: 0,
			enabled: true
		},
		assetFields: [{
			field: "reflection",
			type: "environment"
		}],
		entityFields: [],
		colorFields: [],
		animatableFields: [],
		fields: {
			reflection: { tooltip: "The scene's baked reflections (the baker writes this)." },
			halfExtents: {
				min: 0,
				tooltip: "Half the box this probe answers inside, from the entity's position."
			},
			slot: {
				min: 0,
				tooltip: "Which column of the atlas this probe occupies (the baker writes this).",
				advanced: true
			},
			enabled: { tooltip: "Off: what stands inside this box reflects the sky again." }
		}
	},
	RigidBody2D: {
		defaults: {
			bodyType: 2,
			gravityScale: 1,
			linearDamping: 0,
			angularDamping: 0,
			fixedRotation: false,
			bullet: false,
			enabled: true
		},
		assetFields: [],
		entityFields: [],
		colorFields: [],
		animatableFields: [],
		fields: { bodyType: { enum: [
			{
				label: "Static",
				value: 0
			},
			{
				label: "Kinematic",
				value: 1
			},
			{
				label: "Dynamic",
				value: 2
			}
		] } }
	},
	RigidBody3D: {
		defaults: {
			bodyType: 2,
			gravityScale: 1,
			linearDamping: .05,
			angularDamping: .05,
			fixedRotation: false,
			layer: 0,
			continuousCollision: false,
			enabled: true
		},
		assetFields: [],
		entityFields: [],
		colorFields: [],
		animatableFields: [],
		fields: {
			bodyType: { enum: [
				{
					label: "Static",
					value: 0
				},
				{
					label: "Kinematic",
					value: 1
				},
				{
					label: "Dynamic",
					value: 2
				}
			] },
			gravityScale: { min: 0 },
			linearDamping: { min: 0 },
			angularDamping: { min: 0 },
			layer: {
				min: 0,
				max: 15,
				advanced: true
			},
			continuousCollision: { advanced: true }
		}
	},
	SegmentCollider2D: {
		defaults: {
			point1: {
				x: -.5,
				y: 0
			},
			point2: {
				x: .5,
				y: 0
			},
			density: 1,
			friction: .3,
			restitution: 0,
			isSensor: false,
			enabled: true,
			categoryBits: 1,
			maskBits: 65535
		},
		assetFields: [],
		entityFields: [],
		colorFields: [],
		animatableFields: []
	},
	ShadowCaster2D: {
		defaults: {
			size: {
				x: 32,
				y: 32
			},
			path: [],
			enabled: true
		},
		renderableField: "enabled",
		assetFields: [],
		entityFields: [],
		listFields: ["path"],
		colorFields: [],
		animatableFields: ["size.x", "size.y"],
		fields: { size: {
			min: 0,
			tooltip: "Occluder box size in world units (centred on the entity, turning with it). Unused when the caster has an outline."
		} }
	},
	ShapeRenderer: {
		defaults: {
			shapeType: 0,
			color: {
				r: 1,
				g: 1,
				b: 1,
				a: 1
			},
			size: {
				x: 100,
				y: 100
			},
			cornerRadius: 0,
			layer: 0,
			parallax: {
				x: 1,
				y: 1
			},
			enabled: true
		},
		renderableField: "enabled",
		assetFields: [],
		entityFields: [],
		colorFields: ["color"],
		animatableFields: [],
		fields: {
			shapeType: { enum: [
				{
					label: "Circle",
					value: 0
				},
				{
					label: "Capsule",
					value: 1
				},
				{
					label: "RoundedRect",
					value: 2
				}
			] },
			cornerRadius: { min: 0 },
			layer: {
				step: 1,
				enumSource: "sortingLayers"
			},
			parallax: {
				tooltip: "Parallax scroll factor (1 = with world, <1 = slower, 0 = locked to camera).",
				advanced: true
			}
		}
	},
	SortingGroup: {
		defaults: {
			layer: 0,
			order: 0,
			enabled: true
		},
		assetFields: [],
		entityFields: [],
		colorFields: [],
		animatableFields: [],
		fields: {
			layer: {
				step: 1,
				tooltip: "Sorting layer for the entire group — members no longer state their own.",
				enumSource: "sortingLayers"
			},
			order: {
				min: -128,
				max: 127,
				step: 1,
				tooltip: "Draw order of the whole group inside its sorting layer — higher draws on top."
			}
		}
	},
	SphereCollider3D: {
		defaults: {
			radius: 50,
			center: {
				x: 0,
				y: 0,
				z: 0
			},
			friction: .3,
			restitution: 0,
			isSensor: false,
			enabled: true
		},
		assetFields: [],
		entityFields: [],
		colorFields: [],
		animatableFields: [],
		fields: {
			radius: { min: 0 },
			friction: { min: 0 },
			restitution: {
				min: 0,
				max: 1
			}
		}
	},
	SpineAnimation: {
		defaults: {
			skeletonPath: "",
			atlasPath: "",
			skin: "",
			animation: "",
			timeScale: 1,
			loop: true,
			playing: true,
			flipX: false,
			flipY: false,
			color: {
				r: 1,
				g: 1,
				b: 1,
				a: 1
			},
			layer: 0,
			skeletonScale: 1,
			material: 0,
			enabled: true
		},
		renderableField: "enabled",
		assetFields: [{
			field: "material",
			type: "material"
		}],
		skeletal: {
			skeletonField: "skeletonPath",
			atlasField: "atlasPath",
			runtime: "spine"
		},
		entityFields: [],
		colorFields: ["color"],
		animatableFields: [],
		fields: {
			skin: { enumSource: "spineSkins" },
			animation: { enumSource: "spineAnimations" },
			timeScale: { min: 0 },
			layer: {
				step: 1,
				enumSource: "sortingLayers"
			},
			skeletonScale: { min: 0 }
		}
	},
	SpringBone: {
		defaults: {
			enabled: true,
			stiffness: .1,
			drag: .5,
			gravity: {
				x: 0,
				y: -980,
				z: 0
			},
			wind: {
				x: 0,
				y: 0,
				z: 0
			},
			windGust: 0,
			windFrequency: .5,
			endLength: 0,
			radius: 0,
			weight: 1,
			colliders: []
		},
		assetFields: [],
		entityFields: ["colliders"],
		listFields: ["colliders"],
		colorFields: [],
		animatableFields: [],
		fields: {
			enabled: { tooltip: "Off leaves the chain exactly as the animation poses it." },
			stiffness: {
				min: 0,
				max: 1,
				step: .01,
				slider: true,
				tooltip: "How hard each bone is pulled back toward its animated pose. 0 hangs free, 1 follows the animation exactly.",
				category: "Motion"
			},
			drag: {
				min: 0,
				max: 1,
				step: .01,
				slider: true,
				tooltip: "How much of its speed a bone loses each frame. Higher settles sooner.",
				category: "Motion"
			},
			gravity: {
				tooltip: "Gravity on the chain, in world units a second squared (world y is up).",
				category: "Motion"
			},
			wind: {
				tooltip: "A steady wind on the chain, in world units a second squared. Zero is still air.",
				category: "Wind"
			},
			windGust: {
				min: 0,
				max: 1,
				step: .01,
				slider: true,
				tooltip: "How far gusts swing the wind's strength. 0 is a steady wind, 1 takes it from calm to twice its strength.",
				category: "Wind"
			},
			windFrequency: {
				min: 0,
				step: .05,
				tooltip: "Gusts a second.",
				category: "Wind"
			},
			endLength: {
				min: 0,
				step: .1,
				tooltip: "Length of the tip past each end bone, in world units. 0 leaves the end bones unsimulated.",
				category: "Chain"
			},
			radius: {
				min: 0,
				step: .1,
				tooltip: "Thickness of the strand, in world units, kept clear of the colliders.",
				category: "Chain"
			},
			weight: {
				min: 0,
				max: 1,
				step: .01,
				slider: true,
				tooltip: "How much of the simulation is used. 0 is the animation alone.",
				category: "Chain"
			},
			colliders: {
				tooltip: "Entities with a SpringBoneCollider that this chain is kept out of (the head, the shoulders).",
				category: "Collision"
			}
		}
	},
	SpringBoneCollider: {
		defaults: {
			shape: 0,
			radius: 10,
			height: 20,
			offset: {
				x: 0,
				y: 0,
				z: 0
			}
		},
		assetFields: [],
		entityFields: [],
		colorFields: [],
		animatableFields: [],
		fields: {
			shape: {
				enum: [{
					label: "Sphere",
					value: 0
				}, {
					label: "Capsule",
					value: 1
				}],
				tooltip: "Sphere, or a capsule along the entity's own Y axis.",
				category: "Shape"
			},
			radius: {
				min: 0,
				step: .1,
				tooltip: "Radius in world units, before the entity's scale.",
				category: "Shape"
			},
			height: {
				min: 0,
				step: .1,
				tooltip: "A capsule's length between the centres of its end spheres, in world units before scale.",
				category: "Shape",
				shownWhen: {
					field: "shape",
					values: [1]
				}
			},
			offset: {
				tooltip: "Where the centre of the shape is, in the entity's own space.",
				category: "Shape"
			}
		}
	},
	Sprite: {
		defaults: {
			texture: 0,
			color: {
				r: 1,
				g: 1,
				b: 1,
				a: 1
			},
			size: {
				x: 1,
				y: 1
			},
			pivot: {
				x: .5,
				y: .5
			},
			uvOffset: {
				x: 0,
				y: 0
			},
			uvScale: {
				x: 1,
				y: 1
			},
			layer: 0,
			order: 0,
			maskInteraction: 0,
			lit: false,
			flipX: false,
			flipY: false,
			drawMode: 0,
			tileSize: {
				x: 0,
				y: 0
			},
			tileSpacing: {
				x: 0,
				y: 0
			},
			parallax: {
				x: 1,
				y: 1
			},
			material: 0,
			enabled: true
		},
		editorDefaults: { size: {
			x: 100,
			y: 100
		} },
		renderableField: "enabled",
		assetFields: [{
			field: "texture",
			type: "texture"
		}, {
			field: "material",
			type: "material"
		}],
		entityFields: [],
		colorFields: ["color"],
		animatableFields: [
			"color.r",
			"color.g",
			"color.b",
			"color.a",
			"size.x",
			"size.y"
		],
		fields: {
			color: { tooltip: "Tint multiplied into the texture (white = unchanged)." },
			pivot: {
				tooltip: "Anchor point the sprite rotates and scales about, as a fraction of its size (0.5,0.5 = centre). Values outside 0–1 sit off the sprite.",
				normalizedOf: "size"
			},
			uvOffset: { advanced: true },
			uvScale: { advanced: true },
			layer: {
				step: 1,
				tooltip: "Sorting layer — controls draw order across sprites.",
				enumSource: "sortingLayers"
			},
			order: {
				min: -128,
				max: 127,
				step: 1,
				tooltip: "Draw order inside the sorting layer — higher draws on top. Overrides the layer's Y-sort or depth ordering; leave 0 to keep it."
			},
			maskInteraction: {
				enum: [
					{
						label: "None",
						value: 0
					},
					{
						label: "VisibleInside",
						value: 1
					},
					{
						label: "VisibleOutside",
						value: 2
					}
				],
				tooltip: "Whether a SpriteMask drawn before this sprite clips it, and which side survives."
			},
			lit: { tooltip: "Receive 2D lights: Light entities light this sprite (flat normal). A custom material overrides this." },
			drawMode: {
				enum: [
					{
						label: "Auto",
						value: 0
					},
					{
						label: "Simple",
						value: 1
					},
					{
						label: "Tiled",
						value: 2
					},
					{
						label: "NineSlice",
						value: 3
					}
				],
				tooltip: "Draw mode: Auto infers from tile size and the texture's 9-slice border; the others override it."
			},
			tileSize: { advanced: true },
			tileSpacing: { advanced: true },
			parallax: {
				tooltip: "Parallax scroll factor (1 = with world, <1 = slower, 0 = locked to camera).",
				advanced: true
			},
			material: { advanced: true }
		}
	},
	SpriteMask: {
		defaults: {
			alphaCutoff: 0,
			limitRange: false,
			rangeEndLayer: 0,
			rangeEndOrder: 0,
			enabled: true
		},
		renderableField: "enabled",
		assetFields: [],
		entityFields: [],
		colorFields: [],
		animatableFields: [],
		fields: {
			alphaCutoff: {
				min: 0,
				max: 1,
				slider: true,
				tooltip: "Cut to the sprite's shape instead of its box: fragments below this alpha do not mask."
			},
			limitRange: { tooltip: "Limit how far this mask reaches; off = every sprite drawn after it." },
			rangeEndLayer: {
				step: 1,
				tooltip: "Last sorting layer this mask reaches.",
				enumSource: "sortingLayers",
				shownWhen: {
					field: "limitRange",
					values: [1]
				}
			},
			rangeEndOrder: {
				min: -128,
				max: 127,
				step: 1,
				tooltip: "Last order inside that layer this mask reaches, inclusive.",
				shownWhen: {
					field: "limitRange",
					values: [1]
				}
			}
		}
	},
	TilemapLayer: {
		defaults: {
			cellSize: {
				x: 32,
				y: 32
			},
			orientation: 0,
			hexSideLength: 0,
			staggerAxis: 0,
			staggerIndex: 0,
			originOffset: {
				x: 0,
				y: 0
			},
			tileset: 0,
			tilesetColumns: 1,
			renderLayer: 0,
			tintColor: {
				r: 1,
				g: 1,
				b: 1,
				a: 1
			},
			opacity: 1,
			parallaxFactor: {
				x: 1,
				y: 1
			},
			visible: true,
			lit: false
		},
		renderableField: "visible",
		assetFields: [{
			field: "tileset",
			type: "texture"
		}],
		entityFields: [],
		colorFields: ["tintColor"],
		animatableFields: [
			"tintColor.r",
			"tintColor.g",
			"tintColor.b",
			"tintColor.a",
			"opacity"
		],
		fields: {
			orientation: {
				enum: [
					{
						label: "Orthogonal",
						value: 0
					},
					{
						label: "Isometric",
						value: 1
					},
					{
						label: "Staggered",
						value: 2
					},
					{
						label: "Hexagonal",
						value: 3
					}
				],
				tooltip: "Grid layout: orthogonal, isometric, staggered, or hexagonal."
			},
			hexSideLength: {
				min: 0,
				step: 1,
				tooltip: "Hexagonal side length in px (0 = a regular pointy hex = tileHeight/2). Ignored unless orientation is Hexagonal.",
				shownWhen: {
					field: "orientation",
					values: [3]
				}
			},
			staggerAxis: {
				enum: [{
					label: "Y",
					value: 0
				}, {
					label: "X",
					value: 1
				}],
				tooltip: "Stagger axis (staggered/hex): Y shifts rows, X shifts columns.",
				shownWhen: {
					field: "orientation",
					values: [2, 3]
				}
			},
			staggerIndex: {
				enum: [{
					label: "Odd",
					value: 0
				}, {
					label: "Even",
					value: 1
				}],
				tooltip: "Which lines carry the half-cell shift (staggered/hex).",
				shownWhen: {
					field: "orientation",
					values: [2, 3]
				}
			},
			tilesetColumns: {
				min: 1,
				step: 1
			},
			renderLayer: {
				step: 1,
				enumSource: "sortingLayers"
			},
			opacity: {
				min: 0,
				max: 1,
				slider: true,
				tooltip: "Layer transparency (0 = invisible, 1 = opaque)."
			},
			lit: { tooltip: "Receive 2D lights: Light entities light this layer's tiles (flat normal)." }
		}
	},
	TrailRenderer: {
		defaults: {
			time: .5,
			minVertexDistance: 5,
			emitting: true,
			startWidth: 20,
			endWidth: 0,
			startColor: {
				r: 1,
				g: 1,
				b: 1,
				a: 1
			},
			endColor: {
				r: 1,
				g: 1,
				b: 1,
				a: 0
			},
			texture: 0,
			blendMode: 0,
			layer: 0,
			material: 0,
			enabled: true
		},
		renderableField: "enabled",
		assetFields: [{
			field: "texture",
			type: "texture"
		}, {
			field: "material",
			type: "material"
		}],
		entityFields: [],
		colorFields: ["startColor", "endColor"],
		animatableFields: [
			"startColor.r",
			"startColor.g",
			"startColor.b",
			"startColor.a",
			"endColor.r",
			"endColor.g",
			"endColor.b",
			"endColor.a"
		],
		fields: {
			time: {
				min: 0,
				tooltip: "Seconds each trail point lives before it fades out of the tail.",
				category: "Trail"
			},
			minVertexDistance: {
				min: 0,
				tooltip: "Min world distance moved before a new trail point is recorded.",
				category: "Trail"
			},
			emitting: {
				tooltip: "Record new points. False = freeze and let the streak fade in place.",
				category: "Trail"
			},
			startWidth: {
				min: 0,
				tooltip: "Full ribbon width at the head (newest point).",
				category: "Width"
			},
			endWidth: {
				min: 0,
				tooltip: "Full ribbon width at the tail (oldest point).",
				category: "Width"
			},
			startColor: {
				tooltip: "Color at the head (newest point).",
				category: "Color"
			},
			endColor: {
				tooltip: "Color at the tail (oldest point) — usually alpha 0 to fade out.",
				category: "Color"
			},
			texture: { category: "Rendering" },
			blendMode: {
				tooltip: "Blend mode: 0 Normal, 1 Additive (glow), 2 Multiply, …",
				category: "Rendering"
			},
			layer: {
				step: 1,
				tooltip: "Sorting layer — controls draw order across renderables.",
				category: "Rendering",
				enumSource: "sortingLayers"
			},
			material: {
				category: "Rendering",
				advanced: true
			}
		}
	},
	Transform: {
		defaults: {
			position: {
				x: 0,
				y: 0,
				z: 0
			},
			rotation: {
				w: 1,
				x: 0,
				y: 0,
				z: 0
			},
			scale: {
				x: 1,
				y: 1,
				z: 1
			},
			worldPosition: {
				x: 0,
				y: 0,
				z: 0
			},
			worldRotation: {
				w: 1,
				x: 0,
				y: 0,
				z: 0
			},
			worldScale: {
				x: 1,
				y: 1,
				z: 1
			}
		},
		assetFields: [],
		entityFields: [],
		colorFields: [],
		animatableFields: [
			"position.x",
			"position.y",
			"position.z",
			"rotation.x",
			"rotation.y",
			"rotation.z",
			"rotation.w",
			"rotation.angle",
			"scale.x",
			"scale.y",
			"scale.z"
		],
		replicatedFields: [
			"position",
			"rotation",
			"scale"
		],
		readonlyFields: [
			"worldPosition",
			"worldRotation",
			"worldScale"
		],
		fields: {
			position: { tooltip: "Local position in world units, relative to the parent." },
			rotation: { tooltip: "Local rotation in degrees, applied X then Y then Z. 2D content turns about Z alone." },
			scale: { tooltip: "Local scale per axis (1 = original size; negative flips)." }
		}
	},
	UIInteraction: {
		defaults: {
			hovered: false,
			pressed: false,
			justPressed: false,
			justReleased: false
		},
		transient: true,
		assetFields: [],
		entityFields: [],
		colorFields: [],
		animatableFields: []
	},
	UIMask: {
		defaults: {
			enabled: true,
			mode: 0,
			alphaCutoff: 0
		},
		assetFields: [],
		entityFields: [],
		colorFields: [],
		animatableFields: [],
		fields: {
			mode: { enum: [{
				label: "Scissor",
				value: 0
			}, {
				label: "Stencil",
				value: 1
			}] },
			alphaCutoff: { tooltip: "Stencil only: above 0, clip to the mask sprite's shape instead of its box." }
		}
	},
	UINode: {
		defaults: {
			position: 0,
			display: 0,
			opacity: 1,
			pointerEvents: 0,
			width: {
				value: 0,
				unit: 2
			},
			height: {
				value: 0,
				unit: 2
			},
			minWidth: {
				value: 0,
				unit: 2
			},
			minHeight: {
				value: 0,
				unit: 2
			},
			maxWidth: {
				value: 0,
				unit: 2
			},
			maxHeight: {
				value: 0,
				unit: 2
			},
			flexGrow: 0,
			flexShrink: 1,
			flexBasis: {
				value: 0,
				unit: 2
			},
			alignSelf: 0,
			marginLeft: {
				value: 0,
				unit: 0
			},
			marginTop: {
				value: 0,
				unit: 0
			},
			marginRight: {
				value: 0,
				unit: 0
			},
			marginBottom: {
				value: 0,
				unit: 0
			},
			insetLeft: {
				value: 0,
				unit: 2
			},
			insetTop: {
				value: 0,
				unit: 2
			},
			insetRight: {
				value: 0,
				unit: 2
			},
			insetBottom: {
				value: 0,
				unit: 2
			}
		},
		assetFields: [],
		entityFields: [],
		colorFields: [],
		animatableFields: [],
		fields: {
			position: { enum: [{
				label: "Relative",
				value: 0
			}, {
				label: "Absolute",
				value: 1
			}] },
			display: {
				enum: [{
					label: "Flex",
					value: 0
				}, {
					label: "None",
					value: 1
				}],
				tooltip: "None removes this node and its whole subtree from layout, rendering and input."
			},
			opacity: {
				min: 0,
				max: 1,
				tooltip: "Subtree opacity, multiplied down the tree. Fades this node and everything under it."
			},
			pointerEvents: {
				enum: [
					{
						label: "Auto",
						value: 0
					},
					{
						label: "None",
						value: 1
					},
					{
						label: "Receive",
						value: 2
					}
				],
				tooltip: "None makes this node and its subtree transparent to the pointer — hits pass through to what is behind."
			},
			alignSelf: { enum: [
				{
					label: "Auto",
					value: 0
				},
				{
					label: "Start",
					value: 1
				},
				{
					label: "Center",
					value: 2
				},
				{
					label: "End",
					value: 3
				},
				{
					label: "Stretch",
					value: 4
				}
			] }
		}
	},
	UIScroll: {
		defaults: {
			enabled: true,
			content: 0,
			horizontal: false,
			vertical: true,
			movement: 0,
			wheelSpeed: 1,
			dragScroll: true,
			decelerationRate: .135
		},
		assetFields: [],
		entityFields: ["content"],
		colorFields: [],
		animatableFields: [],
		fields: {
			content: { tooltip: "The child that scrolls inside this node. Leave empty to use the first child." },
			movement: {
				enum: [{
					label: "Clamped",
					value: 0
				}, {
					label: "Elastic",
					value: 1
				}],
				tooltip: "Clamped stops at the ends; Elastic overshoots and springs back."
			},
			wheelSpeed: { min: 0 },
			decelerationRate: {
				min: 0,
				max: 1,
				tooltip: "Fraction of flick velocity kept per second. 0 stops on release."
			}
		}
	},
	UIVisual: {
		defaults: {
			visualType: 0,
			texture: 0,
			color: {
				r: 1,
				g: 1,
				b: 1,
				a: 1
			},
			fit: 0,
			uvOffset: {
				x: 0,
				y: 0
			},
			uvScale: {
				x: 1,
				y: 1
			},
			sliceBorder: {
				x: 0,
				y: 0,
				z: 0,
				w: 0
			},
			tileSize: {
				x: 32,
				y: 32
			},
			fillMethod: 0,
			fillOrigin: 0,
			fillAmount: 1,
			material: 0,
			enabled: true
		},
		renderableField: "enabled",
		assetFields: [{
			field: "texture",
			type: "texture"
		}, {
			field: "material",
			type: "material"
		}],
		entityFields: [],
		colorFields: ["color"],
		animatableFields: [
			"color.r",
			"color.g",
			"color.b",
			"color.a",
			"fillAmount"
		],
		fields: {
			visualType: { enum: [
				{
					label: "None",
					value: 0
				},
				{
					label: "SolidColor",
					value: 1
				},
				{
					label: "Image",
					value: 2
				},
				{
					label: "NineSlice",
					value: 3
				},
				{
					label: "Tiled",
					value: 4
				},
				{
					label: "Filled",
					value: 5
				}
			] },
			fit: {
				enum: [
					{
						label: "Fill",
						value: 0
					},
					{
						label: "Contain",
						value: 1
					},
					{
						label: "Cover",
						value: 2
					}
				],
				tooltip: "How the image fits its box: Fill stretches, Contain letterboxes it whole, Cover fills and crops."
			},
			fillMethod: { enum: [
				{
					label: "Horizontal",
					value: 0
				},
				{
					label: "Vertical",
					value: 1
				},
				{
					label: "Radial360",
					value: 2
				},
				{
					label: "Radial90",
					value: 3
				},
				{
					label: "Radial180",
					value: 4
				}
			] },
			fillOrigin: { enum: [
				{
					label: "Left",
					value: 0
				},
				{
					label: "Right",
					value: 1
				},
				{
					label: "Bottom",
					value: 2
				},
				{
					label: "Top",
					value: 3
				}
			] }
		}
	},
	Velocity: {
		defaults: {
			linear: {
				x: 0,
				y: 0,
				z: 0
			},
			angular: {
				x: 0,
				y: 0,
				z: 0
			}
		},
		assetFields: [],
		entityFields: [],
		colorFields: [],
		animatableFields: [],
		replicatedFields: ["linear", "angular"]
	}
};
//#endregion
//#region src/wasm/wasm.generated.ts
let g = /* @__PURE__ */ function(e) {
	e[e["Start"] = 0] = "Start";
	e[e["Center"] = 1] = "Center";
	e[e["End"] = 2] = "End";
	e[e["Stretch"] = 3] = "Stretch";
	e[e["SpaceBetween"] = 4] = "SpaceBetween";
	e[e["SpaceAround"] = 5] = "SpaceAround";
	return e;
}({});
let _ = /* @__PURE__ */ function(e) {
	e[e["Start"] = 0] = "Start";
	e[e["Center"] = 1] = "Center";
	e[e["End"] = 2] = "End";
	e[e["Stretch"] = 3] = "Stretch";
	return e;
}({});
let v = /* @__PURE__ */ function(e) {
	e[e["Auto"] = 0] = "Auto";
	e[e["Start"] = 1] = "Start";
	e[e["Center"] = 2] = "Center";
	e[e["End"] = 3] = "End";
	e[e["Stretch"] = 4] = "Stretch";
	return e;
}({});
/**
* The engine's `BillboardMode`, generated from the C++ enum.
*
* @beta
*/
let y = /* @__PURE__ */ function(e) {
	e[e["ViewPlane"] = 0] = "ViewPlane";
	e[e["Upright"] = 1] = "Upright";
	return e;
}({});
let ee = /* @__PURE__ */ function(e) {
	e[e["Static"] = 0] = "Static";
	e[e["Kinematic"] = 1] = "Kinematic";
	e[e["Dynamic"] = 2] = "Dynamic";
	return e;
}({});
/**
* The engine's `ClearFlags`, generated from the C++ enum.
*
* @beta
*/
let te = /* @__PURE__ */ function(e) {
	e[e["Nothing"] = 0] = "Nothing";
	e[e["Color"] = 1] = "Color";
	e[e["Depth"] = 2] = "Depth";
	e[e["ColorAndDepth"] = 3] = "ColorAndDepth";
	return e;
}({});
/**
* The engine's `EasingType`, generated from the C++ enum.
*
* @experimental
*/
let ne = /* @__PURE__ */ function(e) {
	e[e["Linear"] = 0] = "Linear";
	e[e["EaseInQuad"] = 1] = "EaseInQuad";
	e[e["EaseOutQuad"] = 2] = "EaseOutQuad";
	e[e["EaseInOutQuad"] = 3] = "EaseInOutQuad";
	e[e["EaseInCubic"] = 4] = "EaseInCubic";
	e[e["EaseOutCubic"] = 5] = "EaseOutCubic";
	e[e["EaseInOutCubic"] = 6] = "EaseInOutCubic";
	e[e["EaseInBack"] = 7] = "EaseInBack";
	e[e["EaseOutBack"] = 8] = "EaseOutBack";
	e[e["EaseInOutBack"] = 9] = "EaseInOutBack";
	e[e["EaseInElastic"] = 10] = "EaseInElastic";
	e[e["EaseOutElastic"] = 11] = "EaseOutElastic";
	e[e["EaseInOutElastic"] = 12] = "EaseInOutElastic";
	e[e["EaseOutBounce"] = 13] = "EaseOutBounce";
	e[e["CubicBezier"] = 14] = "CubicBezier";
	e[e["Step"] = 15] = "Step";
	e[e["EaseInSine"] = 16] = "EaseInSine";
	e[e["EaseOutSine"] = 17] = "EaseOutSine";
	e[e["EaseInOutSine"] = 18] = "EaseInOutSine";
	e[e["EaseInQuart"] = 19] = "EaseInQuart";
	e[e["EaseOutQuart"] = 20] = "EaseOutQuart";
	e[e["EaseInOutQuart"] = 21] = "EaseInOutQuart";
	e[e["EaseInQuint"] = 22] = "EaseInQuint";
	e[e["EaseOutQuint"] = 23] = "EaseOutQuint";
	e[e["EaseInOutQuint"] = 24] = "EaseInOutQuint";
	e[e["EaseInExpo"] = 25] = "EaseInExpo";
	e[e["EaseOutExpo"] = 26] = "EaseOutExpo";
	e[e["EaseInOutExpo"] = 27] = "EaseInOutExpo";
	e[e["EaseInCirc"] = 28] = "EaseInCirc";
	e[e["EaseOutCirc"] = 29] = "EaseOutCirc";
	e[e["EaseInOutCirc"] = 30] = "EaseInOutCirc";
	e[e["EaseInBounce"] = 31] = "EaseInBounce";
	e[e["EaseInOutBounce"] = 32] = "EaseInOutBounce";
	e[e["Smoothstep"] = 33] = "Smoothstep";
	e[e["Smootherstep"] = 34] = "Smootherstep";
	return e;
}({});
/**
* The engine's `EmitterShape`, generated from the C++ enum.
*
* @beta
*/
let re = /* @__PURE__ */ function(e) {
	e[e["Point"] = 0] = "Point";
	e[e["Circle"] = 1] = "Circle";
	e[e["Box"] = 2] = "Box";
	e[e["Cone"] = 3] = "Cone";
	e[e["Sphere"] = 4] = "Sphere";
	e[e["Hemisphere"] = 5] = "Hemisphere";
	return e;
}({});
let ie = /* @__PURE__ */ function(e) {
	e[e["Row"] = 0] = "Row";
	e[e["Column"] = 1] = "Column";
	e[e["RowReverse"] = 2] = "RowReverse";
	e[e["ColumnReverse"] = 3] = "ColumnReverse";
	return e;
}({});
let ae = /* @__PURE__ */ function(e) {
	e[e["NoWrap"] = 0] = "NoWrap";
	e[e["Wrap"] = 1] = "Wrap";
	return e;
}({});
let oe = /* @__PURE__ */ function(e) {
	e[e["Directional"] = 0] = "Directional";
	e[e["Point"] = 1] = "Point";
	e[e["Vortex"] = 2] = "Vortex";
	e[e["Drag"] = 3] = "Drag";
	return e;
}({});
let se = /* @__PURE__ */ function(e) {
	e[e["Start"] = 0] = "Start";
	e[e["Center"] = 1] = "Center";
	e[e["End"] = 2] = "End";
	e[e["SpaceBetween"] = 3] = "SpaceBetween";
	e[e["SpaceAround"] = 4] = "SpaceAround";
	e[e["SpaceEvenly"] = 5] = "SpaceEvenly";
	return e;
}({});
let ce = /* @__PURE__ */ function(e) {
	e[e["Point"] = 0] = "Point";
	e[e["Directional"] = 1] = "Directional";
	e[e["Ambient"] = 2] = "Ambient";
	e[e["Spot"] = 3] = "Spot";
	return e;
}({});
/**
* The engine's `LoopMode`, generated from the C++ enum.
*
* @experimental
*/
let le = /* @__PURE__ */ function(e) {
	e[e["None"] = 0] = "None";
	e[e["Restart"] = 1] = "Restart";
	e[e["PingPong"] = 2] = "PingPong";
	return e;
}({});
let ue = /* @__PURE__ */ function(e) {
	e[e["Scissor"] = 0] = "Scissor";
	e[e["Stencil"] = 1] = "Stencil";
	return e;
}({});
/**
* The engine's `ParticleColliderShape`, generated from the C++ enum.
*
* @beta
*/
let de = /* @__PURE__ */ function(e) {
	e[e["Sphere"] = 0] = "Sphere";
	e[e["Box"] = 1] = "Box";
	e[e["Capsule"] = 2] = "Capsule";
	return e;
}({});
/**
* The engine's `ParticleCollisionFallback`, generated from the C++ enum.
*
* @beta
*/
let fe = /* @__PURE__ */ function(e) {
	e[e["Floor"] = 0] = "Floor";
	e[e["Skip"] = 1] = "Skip";
	return e;
}({});
/**
* The engine's `ParticleCollisionMode`, generated from the C++ enum.
*
* @beta
*/
let pe = /* @__PURE__ */ function(e) {
	e[e["Floor"] = 0] = "Floor";
	e[e["Physics2D"] = 1] = "Physics2D";
	e[e["Physics3D"] = 2] = "Physics3D";
	e[e["Depth"] = 3] = "Depth";
	e[e["Sdf"] = 4] = "Sdf";
	return e;
}({});
/**
* The engine's `ParticleEasing`, generated from the C++ enum.
*
* @beta
*/
let me = /* @__PURE__ */ function(e) {
	e[e["Linear"] = 0] = "Linear";
	e[e["EaseIn"] = 1] = "EaseIn";
	e[e["EaseOut"] = 2] = "EaseOut";
	e[e["EaseInOut"] = 3] = "EaseInOut";
	return e;
}({});
/**
* The engine's `ParticleRenderMode`, generated from the C++ enum.
*
* @beta
*/
let he = /* @__PURE__ */ function(e) {
	e[e["Billboard"] = 0] = "Billboard";
	e[e["Stretched"] = 1] = "Stretched";
	return e;
}({});
/**
* The engine's `ProjectionType`, generated from the C++ enum.
*
* @beta
*/
let ge = /* @__PURE__ */ function(e) {
	e[e["Perspective"] = 0] = "Perspective";
	e[e["Orthographic"] = 1] = "Orthographic";
	return e;
}({});
let _e = /* @__PURE__ */ function(e) {
	e[e["X"] = 0] = "X";
	e[e["Y"] = 1] = "Y";
	e[e["Z"] = 2] = "Z";
	return e;
}({});
let ve = /* @__PURE__ */ function(e) {
	e[e["Project"] = 0] = "Project";
	e[e["Custom"] = 1] = "Custom";
	return e;
}({});
let ye = /* @__PURE__ */ function(e) {
	e[e["EveryFrame"] = 0] = "EveryFrame";
	e[e["FixedRate"] = 1] = "FixedRate";
	e[e["OnDemand"] = 2] = "OnDemand";
	return e;
}({});
let be = /* @__PURE__ */ function(e) {
	e[e["Circle"] = 0] = "Circle";
	e[e["Capsule"] = 1] = "Capsule";
	e[e["RoundedRect"] = 2] = "RoundedRect";
	return e;
}({});
/**
* The engine's `SimulationSpace`, generated from the C++ enum.
*
* @beta
*/
let xe = /* @__PURE__ */ function(e) {
	e[e["World"] = 0] = "World";
	e[e["Local"] = 1] = "Local";
	return e;
}({});
/**
* The engine's `SpriteDrawMode`, generated from the C++ enum.
*
* @public
*/
let Se = /* @__PURE__ */ function(e) {
	e[e["Auto"] = 0] = "Auto";
	e[e["Simple"] = 1] = "Simple";
	e[e["Tiled"] = 2] = "Tiled";
	e[e["NineSlice"] = 3] = "NineSlice";
	return e;
}({});
/**
* The engine's `SpriteMaskInteraction`, generated from the C++ enum.
*
* @public
*/
let Ce = /* @__PURE__ */ function(e) {
	e[e["None"] = 0] = "None";
	e[e["VisibleInside"] = 1] = "VisibleInside";
	e[e["VisibleOutside"] = 2] = "VisibleOutside";
	return e;
}({});
/**
* The engine's `SubEmitterTrigger`, generated from the C++ enum.
*
* @beta
*/
let we = /* @__PURE__ */ function(e) {
	e[e["Death"] = 0] = "Death";
	e[e["Birth"] = 1] = "Birth";
	e[e["Collision"] = 2] = "Collision";
	return e;
}({});
/**
* The engine's `TilemapOrientation`, generated from the C++ enum.
*
* @beta
*/
let Te = /* @__PURE__ */ function(e) {
	e[e["Orthogonal"] = 0] = "Orthogonal";
	e[e["Isometric"] = 1] = "Isometric";
	e[e["Staggered"] = 2] = "Staggered";
	e[e["Hexagonal"] = 3] = "Hexagonal";
	return e;
}({});
/**
* The engine's `TilemapStaggerAxis`, generated from the C++ enum.
*
* @beta
*/
let Ee = /* @__PURE__ */ function(e) {
	e[e["Y"] = 0] = "Y";
	e[e["X"] = 1] = "X";
	return e;
}({});
/**
* The engine's `TilemapStaggerIndex`, generated from the C++ enum.
*
* @beta
*/
let De = /* @__PURE__ */ function(e) {
	e[e["Odd"] = 0] = "Odd";
	e[e["Even"] = 1] = "Even";
	return e;
}({});
/**
* The engine's `TweenState`, generated from the C++ enum.
*
* @experimental
*/
let Oe = /* @__PURE__ */ function(e) {
	e[e["Running"] = 0] = "Running";
	e[e["Paused"] = 1] = "Paused";
	e[e["Completed"] = 2] = "Completed";
	e[e["Cancelled"] = 3] = "Cancelled";
	return e;
}({});
/**
* The engine's `TweenTarget`, generated from the C++ enum.
*
* @experimental
*/
let ke = /* @__PURE__ */ function(e) {
	e[e["PositionX"] = 0] = "PositionX";
	e[e["PositionY"] = 1] = "PositionY";
	e[e["PositionZ"] = 2] = "PositionZ";
	e[e["ScaleX"] = 3] = "ScaleX";
	e[e["ScaleY"] = 4] = "ScaleY";
	e[e["RotationZ"] = 5] = "RotationZ";
	e[e["ColorR"] = 6] = "ColorR";
	e[e["ColorG"] = 7] = "ColorG";
	e[e["ColorB"] = 8] = "ColorB";
	e[e["ColorA"] = 9] = "ColorA";
	e[e["SizeX"] = 10] = "SizeX";
	e[e["SizeY"] = 11] = "SizeY";
	e[e["CameraOrthoSize"] = 12] = "CameraOrthoSize";
	return e;
}({});
let Ae = /* @__PURE__ */ function(e) {
	e[e["Flex"] = 0] = "Flex";
	e[e["None"] = 1] = "None";
	return e;
}({});
/**
* The engine's `UIFillMethod`, generated from the C++ enum.
*
* @beta
*/
let je = /* @__PURE__ */ function(e) {
	e[e["Horizontal"] = 0] = "Horizontal";
	e[e["Vertical"] = 1] = "Vertical";
	e[e["Radial360"] = 2] = "Radial360";
	e[e["Radial90"] = 3] = "Radial90";
	e[e["Radial180"] = 4] = "Radial180";
	return e;
}({});
/**
* The engine's `UIFillOrigin`, generated from the C++ enum.
*
* @beta
*/
let Me = /* @__PURE__ */ function(e) {
	e[e["Left"] = 0] = "Left";
	e[e["Right"] = 1] = "Right";
	e[e["Bottom"] = 2] = "Bottom";
	e[e["Top"] = 3] = "Top";
	return e;
}({});
let Ne = /* @__PURE__ */ function(e) {
	e[e["Auto"] = 0] = "Auto";
	e[e["None"] = 1] = "None";
	e[e["Receive"] = 2] = "Receive";
	return e;
}({});
let Pe = /* @__PURE__ */ function(e) {
	e[e["Relative"] = 0] = "Relative";
	e[e["Absolute"] = 1] = "Absolute";
	return e;
}({});
/**
* The engine's `UIVisualFit`, generated from the C++ enum.
*
* @beta
*/
let Fe = /* @__PURE__ */ function(e) {
	e[e["Fill"] = 0] = "Fill";
	e[e["Contain"] = 1] = "Contain";
	e[e["Cover"] = 2] = "Cover";
	return e;
}({});
/**
* The engine's `UIVisualType`, generated from the C++ enum.
*
* @beta
*/
let Ie = /* @__PURE__ */ function(e) {
	e[e["None"] = 0] = "None";
	e[e["SolidColor"] = 1] = "SolidColor";
	e[e["Image"] = 2] = "Image";
	e[e["NineSlice"] = 3] = "NineSlice";
	e[e["Tiled"] = 4] = "Tiled";
	e[e["Filled"] = 5] = "Filled";
	return e;
}({});
//#endregion
//#region src/ecs/component.ts
/**
* Build dropdown options from an enum const, so the labels derive from the same
* definition the runtime uses (no hand-mirrored value→label drift). `only` curates
* the member set when an enum carries alias entries that share a value (e.g.
* ScaleMode); otherwise duplicate values are dropped, keeping the first label.
*/
function Le(e, t) {
	const n = /* @__PURE__ */ new Set();
	const r = [];
	for (const [i, a] of Object.entries(e)) {
		if (typeof a !== "number") continue;
		if (t ? !t.includes(i) : n.has(a)) continue;
		n.add(a);
		r.push({
			label: i,
			value: a
		});
	}
	return r;
}
/**
* `defaults` with `data` laid over it, ONE LEVEL INTO plain objects: a whole-object
* overwrite drops what the data does not carry, so a `{x, y}` written before that
* field grew a `z` would arrive with no depth. Arrays and nested defaults are
* copied, not shared — two entities taking the default would write into one array.
*/
function Re(e, t) {
	const n = { ...e };
	const r = e;
	for (const e of Object.keys(r)) {
		const t = r[e];
		if (Array.isArray(t)) n[e] = t.slice();
		else if (t !== null && typeof t === "object") n[e] = { ...t };
	}
	if (!t) return n;
	for (const [e, r] of Object.entries(t)) {
		if (r === void 0) continue;
		const t = d(n, e) ? n[e] : void 0;
		const i = t !== null && typeof t === "object" && !Array.isArray(t) && r !== null && typeof r === "object" && !Array.isArray(r) ? d(r, "__proto__") ? {
			...t,
			...r
		} : Object.assign(t, r) : r;
		f(n, e, i);
	}
	return n;
}
function ze(e) {
	const t = [];
	const n = [];
	const r = [];
	let i = false;
	for (const a of Object.keys(e)) {
		const o = e[a];
		if (o !== null && typeof o === "object") {
			i = true;
			if (Array.isArray(o)) r.push(a);
			else n.push(a);
		} else t.push(a);
	}
	return i ? {
		flatKeys: t,
		objectKeys: n,
		arrayKeys: r
	} : null;
}
const Be = /* @__PURE__ */ new Map();
function Ve(e) {
	let t = Be.get(e);
	if (t === void 0) {
		t = Symbol(`Component_${e}`);
		Be.set(e, t);
	}
	return t;
}
function He(e, t, r) {
	if (typeof e !== "string" || e === "") {
		const t = e === null ? "null" : Array.isArray(e) ? "an array" : typeof e === "object" ? `an object with keys ${Object.keys(e).join(", ")}` : `${typeof e} ${JSON.stringify(e)}`;
		throw new Error(`defineComponent takes the NAME first and the defaults second — defineComponent('MyThing', { speed: 100 }) — but was given ${t}. Each field's inspector control comes from the TYPE of its default value, so the second argument is real values (speed: 100), not a description of them ({ speed: 'number' }).`);
	}
	if (t === null || typeof t !== "object") throw new Error(`Component "${e}": the second argument is the defaults OBJECT — defineComponent('${e}', { speed: 100 }) — but was given ${t === void 0 ? "nothing" : JSON.stringify(t)}.`);
	const i = ze(t);
	const a = t;
	for (const t of r?.worldUnitFields ?? []) if (!d(a, t)) throw new Error(`Component "${e}": worldUnitFields names unknown field "${t}"`);
	const o = n(t, r?.worldUnitFields ?? []);
	for (const t of r?.replicatedFields ?? []) if (!d(a, t)) throw new Error(`Component "${e}": replicatedFields names unknown field "${t}"`);
	const s = r?.renderableField;
	if (s !== void 0 && (!d(a, s) || typeof a[s] !== "boolean")) throw new Error(`Component "${e}": renderableField "${s}" is not a boolean field of its defaults`);
	return {
		_id: Ve(e),
		_name: e,
		get _default() {
			return o();
		},
		_builtin: false,
		assetFields: r?.assetFields ?? [],
		skeletalFields: r?.skeletalFields,
		entityFields: r?.entityFields ?? [],
		colorKeys: st(t),
		animatableFields: r?.animatableFields ?? ct(t),
		replicatedFields: r?.replicatedFields ?? [],
		readonlyFields: r?.readonlyFields ?? [],
		fieldMeta: r?.fields ?? {},
		discoverAssets: r?.discoverAssets,
		transient: r?.transient ?? false,
		renderableField: s ?? null,
		create(e) {
			const t = o();
			if (i) return Re(t, e);
			return e ? {
				...t,
				...e
			} : { ...t };
		}
	};
}
function b() {
	return t().componentRegistry;
}
/**
* Declare a component type from its name and the defaults every instance starts
* with. `name` is the identity a scene file stores, so it is what a saved entity
* is rebound by; defining the same name twice returns the first definition
* rather than replacing it, so a hot reload cannot orphan live entities.
*
* @throws if `name` is already taken by a built-in engine component.
* @public
*/
function x(e, t, n) {
	const r = b().get(e);
	if (r) {
		const n = Object.keys(r._default).sort();
		const i = Object.keys(t).sort();
		if (n.length !== i.length || n.some((e, t) => e !== i[t])) throw new Error(`Component name collision: "${e}" is already defined with fields [${n.join(", ")}], and this declaration has [${i.join(", ")}]. One of them loses its fields wherever a scene carries them — rename one.`);
		return r;
	}
	if (T.has(e)) throw new Error(`Component name collision: user component "${e}" conflicts with an existing builtin component of the same name`);
	const i = He(e, t, n);
	b().set(e, i);
	k++;
	Je(e, t, false);
	return i;
}
/**
* Declare a component with no fields — a marker a query filters on. Returning
* the existing definition for a name already declared is deliberate: a tag
* carries no data, so re-declaring one cannot conflict with itself the way
* {@link defineComponent} can.
*
* @public
*/
function S(e) {
	const t = b().get(e);
	if (t) return t;
	if (T.has(e)) throw new Error(`Component name collision: tag "${e}" conflicts with an existing builtin component of the same name`);
	const n = He(e, {});
	b().set(e, n);
	k++;
	Je(e, {}, true);
	return n;
}
function Ue(e) {
	return b().get(e);
}
function We() {
	b().clear();
	k++;
}
function Ge(e) {
	b().delete(e);
	k++;
}
let C = null;
/** Snapshot the currently-registered components as the engine baseline. Called
*  once from the SDK entry after all engine `defineComponent`s have run and before
*  any project bundle registers its own. */
function Ke() {
	C = new Map(b());
}
/** Re-add the engine baseline to a registry (only where missing), so a context
*  that has never re-run the SDK's module-level registrations still has them.
*  No-op until {@link markEngineComponentBaseline} has run (e.g. unit tests that
*  never load the SDK entry). */
function qe(e = b()) {
	if (!C) return;
	for (const [t, n] of C) if (!e.has(t)) e.set(t, n);
}
function Je(e, n, r) {
	t().editorBridge?.registerComponent(e, n, r);
}
function w(e) {
	return e._builtin === true;
}
const T = /* @__PURE__ */ new Map();
let Ye = 0;
let E = null;
function Xe(e, t) {
	T.set(e, t);
	Ye++;
}
/** Complete catalogue: global builtins + the current context's user components. */
function Ze() {
	const e = new Map(T);
	for (const [t, n] of b()) e.set(t, n);
	return e;
}
/** @internal Shared builtin definitions, without constructing a merged catalogue. */
function Qe() {
	return T;
}
/** @internal Definitions outside the generated core catalogue, refreshed on registration. */
function $e() {
	if (E?.version === Ye) return E.definitions;
	const e = new Map([...T].filter(([e]) => !d(h, e)));
	E = {
		version: Ye,
		definitions: e
	};
	return e;
}
/** Just the current context's user/script components (excludes builtins). */
function D() {
	return b();
}
/**
* A stable digest of the current context's user component schemas — each component's
* name plus its default field shape (keys + value types, recursively). The hot-reload
* fast path compares this across a project-bundle re-import: an unchanged digest means
* only system logic changed (hot-swap, keep the live World); a changed digest means a
* component's fields changed and the live data no longer matches the new schema, so the
* realm must full-reload. Builtins are excluded (their C++-backed shape never changes).
* Default *values* are intentionally not hashed — only the shape gates a rebuild.
*/
function et() {
	const e = b();
	return [...e.keys()].sort().map((t) => `${t}:${tt(e.get(t)._default)}`).join("|");
}
function tt(e) {
	if (e === null || typeof e !== "object") return typeof e;
	if (Array.isArray(e)) return `[${e.length ? tt(e[0]) : ""}]`;
	const t = e;
	return `{${Object.keys(t).sort().map((e) => `${e}:${tt(t[e])}`).join(",")}}`;
}
function O(e) {
	return T.get(e) ?? b().get(e);
}
/** A component's per-field editor presentation metadata (empty if none declared). */
function nt(e) {
	return O(e)?.fieldMeta ?? {};
}
/**
* The fields the replication layer syncs for a component — builtin (C++
* `replicated` annotation) and user (`replicatedFields` metadata) through one
* accessor. Empty = the component never replicates.
*/
function rt(e) {
	return O(e)?.replicatedFields ?? [];
}
/** Bumped by every registry mutation in this module, so the derived views below
*  can tell "same components as last time" from "looks the same". */
let k = 0;
let it = null;
/**
* Every registered component taking part in an entity's visibility, with the field
* that gates each. Derived per call — a project's own component registers long
* after load. The memo key carries both registry sizes and the context's map
* identity, so a mutation outside this module (reset, hot reload) still misses it.
*/
function at() {
	const e = b();
	const t = it;
	if (t !== null && t.version === k && t.userMap === e && t.userSize === e.size && t.builtinSize === T.size) return t.list;
	const n = [];
	for (const e of T.values()) if (e.renderableField !== null) n.push(e);
	for (const t of e.values()) if (t.renderableField !== null) n.push(t);
	it = {
		version: k,
		userMap: e,
		userSize: e.size,
		builtinSize: T.size,
		list: n
	};
	return n;
}
/**
* Per-field merge of two FieldMeta maps: `override` wins key-by-key *within* a field
* (not whole-field replacement), so a builtin can author min/tooltip at the C++
* ES_PROPERTY site (→ `base`) and still add a runtime-only `enum`/`flags` override in
* TS without dropping the generated keys. See {@link defineBuiltin}.
*/
function ot(e, t) {
	const n = { ...e };
	for (const r of Object.keys(t)) n[r] = {
		...e[r],
		...t[r]
	};
	return n;
}
function st(e) {
	if (e === null || typeof e !== "object") return [];
	const t = [];
	for (const n of Object.keys(e)) {
		const r = e[n];
		if (r !== null && typeof r === "object" && !Array.isArray(r)) {
			const e = r;
			if ("r" in e && "g" in e && "b" in e && "a" in e) t.push(n);
		}
	}
	return t;
}
function ct(e) {
	if (e === null || typeof e !== "object") return [];
	const t = [];
	for (const [n, r] of Object.entries(e)) if (typeof r === "number") t.push(n);
	else if (r !== null && typeof r === "object" && !Array.isArray(r)) {
		for (const [e, i] of Object.entries(r)) if (typeof i === "number") t.push(`${n}.${e}`);
	}
	return t;
}
function A(e, t, i) {
	const a = T.get(e) ?? b().get(e);
	if (a) {
		if (a._builtin) return a;
		throw new Error(`Component name collision: builtin component "${e}" conflicts with an existing user component of the same name`);
	}
	const o = h[e];
	const s = n(t, i?.worldUnitFields ?? r[e] ?? []);
	const c = {
		_id: Symbol(`Builtin_${e}`),
		_name: e,
		_cppName: e,
		_builtin: true,
		get _default() {
			return s();
		},
		assetFields: i?.assetFields ?? o?.assetFields ?? [],
		skeletalFields: i?.skeletalFields ?? o?.skeletal,
		entityFields: i?.entityFields ?? o?.entityFields ?? [],
		colorKeys: o?.colorFields ?? st(t),
		animatableFields: o?.animatableFields ?? [],
		replicatedFields: o?.replicatedFields ?? [],
		readonlyFields: o?.readonlyFields ?? [],
		fieldMeta: ot(o?.fields ?? {}, i?.fields ?? {}),
		discoverAssets: i?.discoverAssets,
		transient: i?.transient ?? o?.transient ?? false,
		renderableField: i?.renderableField ?? o?.renderableField ?? null
	};
	T.set(e, c);
	return c;
}
/**
* Register every engine component in COMPONENT_META that doesn't already have a
* typed builtin const below. COMPONENT_META is EHT-generated from the C++
* `ES_COMPONENT` structs, so it is the single source of truth for *which*
* components exist; this guarantees each one is registered — and therefore
* loadable from a scene — even before someone hand-writes its typed
* `export const`. Without this backstop a newly-added C++ component had metadata
* + a binding but no registry entry, so `loadSceneData` silently dropped it.
*
* Idempotent (defineBuiltin no-ops on an already-registered builtin). The typed
* consts below remain the ergonomic, type-checked overlay; this only fills gaps.
* Called once from the package entry (index.ts / index.wechat.ts).
*/
function lt() {
	for (const e of Object.keys(h)) if (!T.has(e)) A(e, j(e));
}
const ut = {
	FixedWidth: 0,
	FixedHeight: 1,
	Expand: 2,
	Shrink: 3,
	Match: 4,
	ShowAll: 2,
	NoBorder: 3
};
function j(e, t) {
	const n = h[e];
	return {
		...n?.defaults,
		...n?.editorDefaults,
		...t
	};
}
/**
* Where an entity is. `position`/`rotation`/`scale` are the authoring inputs,
* relative to the parent; `worldPosition`/`worldRotation`/`worldScale` are what
* the engine composed from them and must not be written back.
*
* @public
*/
const M = A("Transform", j("Transform"));
/**
* @deprecated A legacy spelling of {@link Transform} — the same component. Scene
* loading normalises the name away, and both spellings will go at 1.0.
*/
const dt = M;
/**
* @deprecated A legacy spelling of {@link Transform} — the same component, whose
* world fields it was once separate from. Read `Transform.worldPosition` instead.
*/
const ft = M;
/**
* A textured quad. `size` is in world units and is the drawn extent — the texture
* is stretched into it rather than deciding it — and `pivot` says where in that
* rectangle the entity's position sits. `layer` is the painter order between
* sprites; within a layer, storage order decides.
*
* @public
*/
const pt = A("Sprite", j("Sprite"));
/**
* Authored drag configuration, read by the drag system. Works on a UI node and
* on a plain world-space sprite alike — the hit test answers for both.
*
* @experimental
*/
const mt = A("Draggable", j("Draggable"));
const ht = A("ShapeRenderer", j("ShapeRenderer"));
const gt = A("Light", j("Light"));
const _t = A("ShadowCaster2D", j("ShadowCaster2D"));
const vt = A("LightProbeVolume", j("LightProbeVolume"));
/** A non-recursive planar capture, received by this entity's lit material. @experimental */
const yt = A("PlanarReflection", j("PlanarReflection"));
/**
* A box inside which reflections come from a bake rather than from the sky: the
* specular half of what LightProbeVolume answers. The atlas is the SCENE's and
* `slot` says which column of it is here, so a room full of shiny things is still
* one draw — a texture per probe would be a bind per draw.
*
* @experimental
*/
const bt = A("ReflectionProbe", j("ReflectionProbe"));
/**
* A box sight does not pass through: what stands behind it is not collected, and
* the picture is unchanged. Authored, not taken from the geometry beside it — the
* box has to lie INSIDE the wall, and bounds that contain a mesh claim the air at
* its corners, where things would stop being drawn in front of the player.
*
* @experimental
*/
const xt = A("Occluder", j("Occluder"));
/**
* Turns this entity's `Sprite` into a stencil: the sprites drawn AFTER it that ask to be
* masked (`Sprite.maskInteraction`) are cut by its shape. The mask's own sprite is not
* drawn while it is masking — it is the cut, not a picture.
*/
const St = A("SpriteMask", j("SpriteMask"));
/**
* Makes this entity and everything under it sort as ONE unit: the group states the
* layer and order the whole subtree presents outward, and each member's own
* `Sprite.order` becomes its place INSIDE the group. Nothing outside the group can
* land between two of its members, which is what a per-sprite order cannot promise.
*/
const Ct = A("SortingGroup", j("SortingGroup"));
/**
* Fades this entity and everything under it: the opacities multiply down the hierarchy into each descendant's own alpha,
* the way `UINode.opacity` does for a UI subtree. It is not a composited layer — overlapping children show through one
* another mid-fade.
*/
const wt = A("GroupOpacity", j("GroupOpacity"));
/**
* What a viewport draws and from where. One camera per render target;
* `priority` breaks the tie and `isActive` takes one out.
*
* `@beta`: `clearFlags` is a bitmask whose C++ enum has no TypeScript spelling,
* and `cullingMask` names layers no exported constant identifies — so two of
* these fields are typed `number` for want of the vocabulary, not by design.
*
* @beta
*/
const Tt = A("Camera", j("Camera", { showFrustum: false }), { fields: {
	clearFlags: { flags: [{
		label: "Color",
		value: 1
	}, {
		label: "Depth",
		value: 2
	}] },
	showFrustum: {
		advanced: true,
		tooltip: "Draw this camera's whole view volume in the editor, not just what it frames on the content plane."
	}
} });
const Et = A("Canvas", j("Canvas"));
const Dt = A("Velocity", j("Velocity"));
/**
* An entity's parent. The engine keeps this and {@link Children} in step, so
* set the relationship through `world.setParent` rather than by writing either
* side; a transform composes against whatever this names.
*
* @public
*/
const N = A("Parent", j("Parent"));
/**
* An entity's children, in order. The order is the draw order within a layer
* for UI, and the engine maintains the list — {@link Parent} is the side to
* write.
*
* @public
*/
const P = A("Children", j("Children"));
const Ot = A("BitmapText", j("BitmapText"));
/**
* A Spine skeleton on an entity — which skeleton and atlas, and what it is
* playing. Driving it is {@link Spine}'s job; this is the data it drives.
*
* @beta
*/
const kt = A("SpineAnimation", j("SpineAnimation"));
const At = A("DragonBonesAnimation", j("DragonBonesAnimation"));
const jt = A("MeshRenderer", j("MeshRenderer", { geometry: {
	positions: [],
	indices: []
} }));
const Mt = A("TrailRenderer", j("TrailRenderer"));
const Nt = A("SpringBone", j("SpringBone"));
const Pt = A("SpringBoneCollider", j("SpringBoneCollider"));
const Ft = A("Billboard", j("Billboard"));
const It = A("Impostor", j("Impostor"));
const Lt = A("ParticleForceField", j("ParticleForceField"));
const Rt = A("ParticleCollider", j("ParticleCollider"));
/**
* One layer of a tile lattice: `cellSize` is its step in world units, and
* `orientation` with the stagger fields cover isometric and hex, so it is not
* only a square grid. The tiles are in a referenced `.estileset` rather than
* here — render, collision and tile animation all derive from that.
*
* @beta
*/
const zt = A("TilemapLayer", j("TilemapLayer"), { discoverAssets: (e) => {
	const t = [];
	const n = e.tileset;
	if (typeof n === "string" && n) t.push({
		type: "texture",
		path: n
	});
	const r = e.tilesetAssets;
	if (Array.isArray(r) && r.length > 0) {
		for (const e of r) if (typeof e === "string" && e) t.push({
			type: "tileset",
			path: e
		});
	} else {
		const n = e.tilesetAsset;
		if (typeof n === "string" && n) t.push({
			type: "tileset",
			path: n
		});
	}
	return t;
} });
/**
* A particle system on an entity. `colorGradient` and `sizeCurve` OVERRIDE the
* start/end pairs when they carry stops or keys and fall back to them when
* empty; `simulationSpace` decides whether particles follow the entity or are
* left behind by it. Integration is C++, over the whole system at once.
*
* @beta
*/
const Bt = A("ParticleEmitter", j("ParticleEmitter", {
	colorGradient: { stops: [] },
	sizeCurve: { keys: [] },
	bursts: []
}), { fields: {
	blendMode: { enum: Le(i) },
	sizeCurve: {
		curve: true,
		category: "Size"
	},
	colorGradient: {
		gradient: true,
		category: "Color"
	},
	bursts: { category: "Emission" }
} });
/**
* Marks an entity inactive: it keeps its components and its place in the tree,
* and every query skips it — which is how the systems skip it. A query that
* NAMES this one sees them, since managing the switch means reaching what is
* switched off; `setEntityActive` sets it, and takes the subtree with it.
*/
const F = S("Disabled");
/**
* Marks a world-only DERIVED entity — one a system (re)builds from source data
* (the child layer entities a `Tilemap.source` projects, runtime tile
* colliders, …). Scene serialization skips tagged entities entirely:
* persisting one would duplicate it against the next derivation.
*
* @public
*/
const Vt = S("RuntimeOnly");
/**
* An entity's name — what the outliner shows and `findEntityByName` looks up.
* Not an identity: nothing stops two entities sharing one.
*
* @public
*/
const I = x("Name", { value: "" });
const Ht = x("SceneOwner", {
	scene: "",
	persistent: false
});
/**
* A named point/region of gameplay interest, placed in the editor as a real entity.
* On its own (Transform + Marker) it's a spawn point / waypoint / location marker; add a
* sensor collider (the Trigger Area preset) and it's a trigger zone. Pure ECS — no
* parallel "object layer" structure — so it serializes, shows in the Inspector, and is
* `Query`-able like any component. The converged target for imported `.tmj` object groups.
*/
const Ut = x("Marker", {
	type: "",
	properties: {}
}, { fields: { properties: { map: true } } });
const Wt = x("PostProcessVolume", {
	effects: [],
	isGlobal: true,
	shape: "box",
	size: {
		x: 5,
		y: 5
	},
	priority: 0,
	weight: 1,
	blendDistance: 0
}, {
	fields: { effects: { effectStack: true } },
	discoverAssets: (e) => {
		const t = [];
		const n = e.effects;
		if (Array.isArray(n)) for (const e of n) {
			const n = e.textures;
			if (!n) continue;
			for (const e of Object.values(n)) if (typeof e === "string" && e) t.push({
				type: "texture",
				path: e
			});
		}
		return t;
	}
});
const Gt = [
	{
		label: "Clear",
		value: 0
	},
	{
		label: "Mist",
		value: 1
	},
	{
		label: "Overcast",
		value: 2
	},
	{
		label: "Rain",
		value: 3
	},
	{
		label: "Storm",
		value: 4
	},
	{
		label: "Snow",
		value: 5
	}
];
/**
* The weather of a scene: one of a few presets, a turn toward another, and an optional cycle between them.
*
* @details A preset is a handful of multipliers on what the scene already has — the sun at a fraction of its strength,
*          the fog thicker, the picture a little greyer — and a few absolute levels (how hard it rains, how wet the ground
*          is), so the same weather fits any project. The component drives the scene's lights (in play), the post-process
*          effects its volumes resolve (rain, fog, grade, exposure, reflections) and the sound of the rain.
*/
const Kt = x("Weather", {
	preset: 0,
	target: -1,
	progress: 0,
	duration: 6,
	sequence: "",
	hold: 20,
	drive: 255,
	soundSource: 0
}, {
	entityFields: ["soundSource"],
	fields: {
		preset: { enum: Gt },
		target: { enum: [{
			label: "None",
			value: -1
		}, ...Gt] },
		progress: {
			min: 0,
			max: 1,
			step: .01
		},
		duration: {
			min: .1,
			max: 600,
			step: .1,
			unit: "s"
		},
		hold: {
			min: 0,
			max: 3600,
			step: 1,
			unit: "s"
		},
		drive: { flags: [
			{
				label: "Lights",
				value: 1
			},
			{
				label: "Fog",
				value: 2
			},
			{
				label: "Rain",
				value: 4
			},
			{
				label: "Grade",
				value: 8
			},
			{
				label: "Exposure",
				value: 16
			},
			{
				label: "Reflections",
				value: 32
			},
			{
				label: "Sound",
				value: 64
			},
			{
				label: "Wind",
				value: 128
			}
		] }
	}
});
/**
* The time of day of a scene: where the sun and the moon are, and what the light, the sky and the fog are because of it.
*
* @details The sun crosses the sky along the path its latitude and the season give it; the scene's directional light is aimed
*          at it (at the moon by night) and scaled by a day's curve — warm and weak near the horizon, gone once it is down — and
*          the ambient light follows. A Sky Atmosphere effect draws the sun, a dusk glow, a moon and stars where it stands,
*          and the fog is lit as the day is. It composes with Weather: both scale the same lights from what the author set.
*/
const qt = x("TimeOfDay", {
	hour: 12,
	daySeconds: 0,
	latitude: 40,
	declination: 15,
	north: 0,
	drive: 31
}, { fields: {
	hour: {
		min: 0,
		max: 24,
		step: .05,
		unit: "h"
	},
	daySeconds: {
		min: 0,
		max: 86400,
		step: 1,
		unit: "s"
	},
	latitude: {
		min: -90,
		max: 90,
		step: 1,
		unit: "deg"
	},
	declination: {
		min: -23.5,
		max: 23.5,
		step: .5,
		unit: "deg"
	},
	north: {
		min: -180,
		max: 180,
		step: 1,
		unit: "deg"
	},
	drive: { flags: [
		{
			label: "Lights",
			value: 1
		},
		{
			label: "Sky",
			value: 2
		},
		{
			label: "Fog",
			value: 4
		},
		{
			label: "Exposure",
			value: 8
		},
		{
			label: "Reflections",
			value: 16
		}
	] }
} });
function Jt(e) {
	const t = O(e);
	if (t) return p(t._default);
	return null;
}
//#endregion
//#region src/types.ts
/**
* @file    types.ts
* @brief   Core type definitions for ESEngine SDK
*/
/** Number of representable indices (2^INDEX_BITS) — used for overflow-safe packing. */
const Yt = 2 ** 22;
const Xt = Yt - 1;
const Zt = (1 << 10) - 1;
/** Index portion (low ENTITY_INDEX_BITS) of an Entity handle. */
function L(e) {
	return e & Xt;
}
/** Generation portion (high ENTITY_GEN_BITS) of an Entity handle. */
function Qt(e) {
	return e >>> 22 & Zt;
}
/** Construct an Entity from an index + generation pair. */
function $t(e, t) {
	return (t & Zt) * Yt + (e & Xt) >>> 0;
}
/**
* JS-side invalid-entity sentinel.
*
* NOTE: this is `0` for legacy serialization compatibility — scenes written
* before this packing was documented use `0` to mean "no entity reference".
* C++ uses `0xFFFFFFFF` as its sentinel; producers/consumers at the WASM
* boundary must translate between the two. New code should prefer
* `isValidEntity()` over comparing against this constant directly.
*/
const en = 0;
const tn = 0;
const nn = 0;
const rn = 0;
const an = (e = 0, t = 0) => ({
	x: e,
	y: t
});
const on = (e = 0, t = 0, n = 0) => ({
	x: e,
	y: t,
	z: n
});
const sn = (e = 0, t = 0, n = 0, r = 1) => ({
	x: e,
	y: t,
	z: n,
	w: r
});
const cn = (e = 1, t = 1, n = 1, r = 1) => ({
	r: e,
	g: t,
	b: n,
	a: r
});
const ln = (e = 1, t = 0, n = 0, r = 0) => ({
	w: e,
	x: t,
	y: n,
	z: r
});
//#endregion
//#region src/wasm/wasmError.ts
const un = 1e3;
function dn(e) {
	t().wasmError.handler = e;
}
function R(n, r) {
	if (n instanceof l) throw n;
	const i = t().wasmError;
	const a = Date.now();
	if (a - i.lastReportTime < un) {
		i.suppressedCount++;
		return;
	}
	if (i.suppressedCount > 0) {
		e.warn("wasm", `${i.suppressedCount} WASM error(s) suppressed`);
		i.suppressedCount = 0;
	}
	i.lastReportTime = a;
	e.error("wasm", `error in ${r}`, n);
	if (i.handler) i.handler(n, r);
}
//#endregion
//#region src/util/validation.ts
/**
* @file    validation.ts
* @brief   Component data validation utilities
*/
function z(e, t, n, r) {
	const i = [];
	fn(i, t, n, r, "");
	return i;
}
function fn(e, t, n, r, i) {
	for (const a of Object.keys(n)) {
		const o = n[a];
		if (a.startsWith("_") && a !== "__proto__") continue;
		const s = i ? `${i}.${a}` : a;
		if (!d(t, a)) {
			if (!i) e.push({
				field: s,
				expected: "field to exist in component definition",
				actual: "unknown field",
				value: o
			});
			continue;
		}
		const c = t[a];
		const l = mn(c);
		const u = mn(o);
		if (l === "null" || l === "undefined") continue;
		if (o === null || o === void 0) continue;
		if (l !== u) {
			if (!i && pn(r, a) && (l === "string" && u === "number" || l === "number" && u === "string")) continue;
			e.push({
				field: s,
				expected: l,
				actual: u,
				value: o
			});
			continue;
		}
		if (l === "object") fn(e, c, o, void 0, s);
	}
}
function pn(e, t) {
	if (!e) return false;
	if ("has" in e) return e.has(t);
	for (const n of e) if (n.field === t) return true;
	return false;
}
function mn(e) {
	if (e === null) return "null";
	if (e === void 0) return "undefined";
	if (Array.isArray(e)) return "array";
	return typeof e;
}
function B(e, t) {
	const n = [`Invalid component data for "${e}":`];
	for (const e of t) n.push(`  - Field "${e.field}": expected ${e.expected}, got ${e.actual} (${JSON.stringify(e.value)})`);
	return n.join("\n");
}
//#endregion
//#region src/ecs/bridge/ptrAccessors.generated.ts
function hn(e, t, n, r, i) {
	i.mode = t[r >> 2] | 0;
	i.enabled = n[r + 4] !== 0;
}
function gn(e, t, n, r, i) {
	t[r >> 2] = i.mode | 0;
	n[r + 4] = i.enabled ? 1 : 0;
}
function _n() {
	return {
		mode: 0,
		enabled: false
	};
}
function vn(e, t, n, r, i) {
	const a = i.color;
	a.r = e[r + 12 >> 2];
	a.g = e[(r + 12 >> 2) + 1];
	a.b = e[(r + 12 >> 2) + 2];
	a.a = e[(r + 12 >> 2) + 3];
	i.fontSize = e[r + 28 >> 2];
	i.align = n[r + 32];
	i.spacing = e[r + 36 >> 2];
	const o = i.parallax;
	o.x = e[r + 40 >> 2];
	o.y = e[(r + 40 >> 2) + 1];
	i.layer = t[r + 48 >> 2] | 0;
	i.font = t[r + 52 >> 2];
	i.enabled = n[r + 56] !== 0;
}
function yn(e, t, n, r, i) {
	e[r + 12 >> 2] = i.color.r;
	e[(r + 12 >> 2) + 1] = i.color.g;
	e[(r + 12 >> 2) + 2] = i.color.b;
	e[(r + 12 >> 2) + 3] = i.color.a;
	e[r + 28 >> 2] = i.fontSize;
	n[r + 32] = i.align;
	e[r + 36 >> 2] = i.spacing;
	e[r + 40 >> 2] = i.parallax.x;
	e[(r + 40 >> 2) + 1] = i.parallax.y;
	t[r + 48 >> 2] = i.layer | 0;
	t[r + 52 >> 2] = i.font;
	n[r + 56] = i.enabled ? 1 : 0;
}
function bn() {
	return {
		color: {
			r: 0,
			g: 0,
			b: 0,
			a: 0
		},
		fontSize: 0,
		align: 0,
		spacing: 0,
		parallax: {
			x: 0,
			y: 0
		},
		layer: 0,
		font: 0,
		enabled: false
	};
}
function xn(e, t, n, r, i) {
	const a = i.halfExtents;
	a.x = e[r >> 2];
	a.y = e[(r >> 2) + 1];
	const o = i.offset;
	o.x = e[r + 8 >> 2];
	o.y = e[(r + 8 >> 2) + 1];
	i.density = e[r + 16 >> 2];
	i.friction = e[r + 20 >> 2];
	i.restitution = e[r + 24 >> 2];
	i.isSensor = n[r + 28] !== 0;
	i.enabled = n[r + 29] !== 0;
	i.categoryBits = t[r + 32 >> 2];
	i.maskBits = t[r + 36 >> 2];
}
function Sn(e, t, n, r, i) {
	e[r >> 2] = i.halfExtents.x;
	e[(r >> 2) + 1] = i.halfExtents.y;
	e[r + 8 >> 2] = i.offset.x;
	e[(r + 8 >> 2) + 1] = i.offset.y;
	e[r + 16 >> 2] = i.density;
	e[r + 20 >> 2] = i.friction;
	e[r + 24 >> 2] = i.restitution;
	n[r + 28] = i.isSensor ? 1 : 0;
	n[r + 29] = i.enabled ? 1 : 0;
	t[r + 32 >> 2] = i.categoryBits;
	t[r + 36 >> 2] = i.maskBits;
}
function Cn() {
	return {
		halfExtents: {
			x: 0,
			y: 0
		},
		offset: {
			x: 0,
			y: 0
		},
		density: 0,
		friction: 0,
		restitution: 0,
		isSensor: false,
		enabled: false,
		categoryBits: 0,
		maskBits: 0
	};
}
function wn(e, t, n, r, i) {
	const a = i.halfExtents;
	a.x = e[r >> 2];
	a.y = e[(r >> 2) + 1];
	a.z = e[(r >> 2) + 2];
	const o = i.center;
	o.x = e[r + 12 >> 2];
	o.y = e[(r + 12 >> 2) + 1];
	o.z = e[(r + 12 >> 2) + 2];
	i.friction = e[r + 24 >> 2];
	i.restitution = e[r + 28 >> 2];
	i.isSensor = n[r + 32] !== 0;
	i.enabled = n[r + 33] !== 0;
}
function Tn(e, t, n, r, i) {
	e[r >> 2] = i.halfExtents.x;
	e[(r >> 2) + 1] = i.halfExtents.y;
	e[(r >> 2) + 2] = i.halfExtents.z;
	e[r + 12 >> 2] = i.center.x;
	e[(r + 12 >> 2) + 1] = i.center.y;
	e[(r + 12 >> 2) + 2] = i.center.z;
	e[r + 24 >> 2] = i.friction;
	e[r + 28 >> 2] = i.restitution;
	n[r + 32] = i.isSensor ? 1 : 0;
	n[r + 33] = i.enabled ? 1 : 0;
}
function En() {
	return {
		halfExtents: {
			x: 0,
			y: 0,
			z: 0
		},
		center: {
			x: 0,
			y: 0,
			z: 0
		},
		friction: 0,
		restitution: 0,
		isSensor: false,
		enabled: false
	};
}
function Dn(e, t, n, r, i) {
	i.projectionType = n[r];
	i.fov = e[r + 4 >> 2];
	i.orthoSize = e[r + 8 >> 2];
	i.nearPlane = e[r + 12 >> 2];
	i.farPlane = e[r + 16 >> 2];
	i.aspectRatio = e[r + 20 >> 2];
	i.isActive = n[r + 24] !== 0;
	i.priority = t[r + 28 >> 2] | 0;
	const a = i.viewport;
	a.x = e[r + 32 >> 2];
	a.y = e[(r + 32 >> 2) + 1];
	a.z = e[(r + 32 >> 2) + 2];
	a.w = e[(r + 32 >> 2) + 3];
	i.clearFlags = n[r + 48];
	i.pixelPerfect = n[r + 49] !== 0;
	i.cullingMask = t[r + 52 >> 2];
	i.renderTarget = t[r + 56 >> 2];
}
function On(e, t, n, r, i) {
	n[r] = i.projectionType;
	e[r + 4 >> 2] = i.fov;
	e[r + 8 >> 2] = i.orthoSize;
	e[r + 12 >> 2] = i.nearPlane;
	e[r + 16 >> 2] = i.farPlane;
	e[r + 20 >> 2] = i.aspectRatio;
	n[r + 24] = i.isActive ? 1 : 0;
	t[r + 28 >> 2] = i.priority | 0;
	e[r + 32 >> 2] = i.viewport.x;
	e[(r + 32 >> 2) + 1] = i.viewport.y;
	e[(r + 32 >> 2) + 2] = i.viewport.z;
	e[(r + 32 >> 2) + 3] = i.viewport.w;
	n[r + 48] = i.clearFlags;
	n[r + 49] = i.pixelPerfect ? 1 : 0;
	t[r + 52 >> 2] = i.cullingMask;
	t[r + 56 >> 2] = i.renderTarget;
}
function kn() {
	return {
		projectionType: 0,
		fov: 0,
		orthoSize: 0,
		nearPlane: 0,
		farPlane: 0,
		aspectRatio: 0,
		isActive: false,
		priority: 0,
		viewport: {
			x: 0,
			y: 0,
			z: 0,
			w: 0
		},
		clearFlags: 0,
		pixelPerfect: false,
		cullingMask: 0,
		renderTarget: 0
	};
}
function An(e, t, n, r, i) {
	const a = i.designResolution;
	a.x = e[r >> 2];
	a.y = e[(r >> 2) + 1];
	i.pixelsPerUnit = e[r + 8 >> 2];
	i.scaleMode = n[r + 12];
	i.matchWidthOrHeight = e[r + 16 >> 2];
	const o = i.backgroundColor;
	o.r = e[r + 20 >> 2];
	o.g = e[(r + 20 >> 2) + 1];
	o.b = e[(r + 20 >> 2) + 2];
	o.a = e[(r + 20 >> 2) + 3];
	i.layer = t[r + 36 >> 2] | 0;
}
function jn(e, t, n, r, i) {
	e[r >> 2] = i.designResolution.x;
	e[(r >> 2) + 1] = i.designResolution.y;
	e[r + 8 >> 2] = i.pixelsPerUnit;
	n[r + 12] = i.scaleMode;
	e[r + 16 >> 2] = i.matchWidthOrHeight;
	e[r + 20 >> 2] = i.backgroundColor.r;
	e[(r + 20 >> 2) + 1] = i.backgroundColor.g;
	e[(r + 20 >> 2) + 2] = i.backgroundColor.b;
	e[(r + 20 >> 2) + 3] = i.backgroundColor.a;
	t[r + 36 >> 2] = i.layer | 0;
}
function Mn() {
	return {
		designResolution: {
			x: 0,
			y: 0
		},
		pixelsPerUnit: 0,
		scaleMode: 0,
		matchWidthOrHeight: 0,
		backgroundColor: {
			r: 0,
			g: 0,
			b: 0,
			a: 0
		},
		layer: 0
	};
}
function Nn(e, t, n, r, i) {
	i.radius = e[r >> 2];
	i.halfHeight = e[r + 4 >> 2];
	const a = i.offset;
	a.x = e[r + 8 >> 2];
	a.y = e[(r + 8 >> 2) + 1];
	i.density = e[r + 16 >> 2];
	i.friction = e[r + 20 >> 2];
	i.restitution = e[r + 24 >> 2];
	i.isSensor = n[r + 28] !== 0;
	i.enabled = n[r + 29] !== 0;
	i.categoryBits = t[r + 32 >> 2];
	i.maskBits = t[r + 36 >> 2];
}
function Pn(e, t, n, r, i) {
	e[r >> 2] = i.radius;
	e[r + 4 >> 2] = i.halfHeight;
	e[r + 8 >> 2] = i.offset.x;
	e[(r + 8 >> 2) + 1] = i.offset.y;
	e[r + 16 >> 2] = i.density;
	e[r + 20 >> 2] = i.friction;
	e[r + 24 >> 2] = i.restitution;
	n[r + 28] = i.isSensor ? 1 : 0;
	n[r + 29] = i.enabled ? 1 : 0;
	t[r + 32 >> 2] = i.categoryBits;
	t[r + 36 >> 2] = i.maskBits;
}
function Fn() {
	return {
		radius: 0,
		halfHeight: 0,
		offset: {
			x: 0,
			y: 0
		},
		density: 0,
		friction: 0,
		restitution: 0,
		isSensor: false,
		enabled: false,
		categoryBits: 0,
		maskBits: 0
	};
}
function In(e, t, n, r, i) {
	i.radius = e[r >> 2];
	i.halfHeight = e[r + 4 >> 2];
	const a = i.center;
	a.x = e[r + 8 >> 2];
	a.y = e[(r + 8 >> 2) + 1];
	a.z = e[(r + 8 >> 2) + 2];
	i.friction = e[r + 20 >> 2];
	i.restitution = e[r + 24 >> 2];
	i.isSensor = n[r + 28] !== 0;
	i.enabled = n[r + 29] !== 0;
}
function Ln(e, t, n, r, i) {
	e[r >> 2] = i.radius;
	e[r + 4 >> 2] = i.halfHeight;
	e[r + 8 >> 2] = i.center.x;
	e[(r + 8 >> 2) + 1] = i.center.y;
	e[(r + 8 >> 2) + 2] = i.center.z;
	e[r + 20 >> 2] = i.friction;
	e[r + 24 >> 2] = i.restitution;
	n[r + 28] = i.isSensor ? 1 : 0;
	n[r + 29] = i.enabled ? 1 : 0;
}
function Rn() {
	return {
		radius: 0,
		halfHeight: 0,
		center: {
			x: 0,
			y: 0,
			z: 0
		},
		friction: 0,
		restitution: 0,
		isSensor: false,
		enabled: false
	};
}
function zn(e, t, n, r, i) {
	const a = i.velocity;
	a.x = e[r >> 2];
	a.y = e[(r >> 2) + 1];
	a.z = e[(r >> 2) + 2];
	i.radius = e[r + 12 >> 2];
	i.halfHeight = e[r + 16 >> 2];
	i.maxSlope = e[r + 20 >> 2];
	i.stepHeight = e[r + 24 >> 2];
	i.snapDown = e[r + 28 >> 2];
	i.mass = e[r + 32 >> 2];
	i.pushForce = e[r + 36 >> 2];
	i.enabled = n[r + 40] !== 0;
	i.layer = t[r + 44 >> 2];
	i.isOnFloor = n[r + 48] !== 0;
	const o = i.floorNormal;
	o.x = e[r + 52 >> 2];
	o.y = e[(r + 52 >> 2) + 1];
	o.z = e[(r + 52 >> 2) + 2];
	const s = i.realVelocity;
	s.x = e[r + 64 >> 2];
	s.y = e[(r + 64 >> 2) + 1];
	s.z = e[(r + 64 >> 2) + 2];
}
function Bn(e, t, n, r, i) {
	e[r >> 2] = i.velocity.x;
	e[(r >> 2) + 1] = i.velocity.y;
	e[(r >> 2) + 2] = i.velocity.z;
	e[r + 12 >> 2] = i.radius;
	e[r + 16 >> 2] = i.halfHeight;
	e[r + 20 >> 2] = i.maxSlope;
	e[r + 24 >> 2] = i.stepHeight;
	e[r + 28 >> 2] = i.snapDown;
	e[r + 32 >> 2] = i.mass;
	e[r + 36 >> 2] = i.pushForce;
	n[r + 40] = i.enabled ? 1 : 0;
	t[r + 44 >> 2] = i.layer;
	n[r + 48] = i.isOnFloor ? 1 : 0;
	e[r + 52 >> 2] = i.floorNormal.x;
	e[(r + 52 >> 2) + 1] = i.floorNormal.y;
	e[(r + 52 >> 2) + 2] = i.floorNormal.z;
	e[r + 64 >> 2] = i.realVelocity.x;
	e[(r + 64 >> 2) + 1] = i.realVelocity.y;
	e[(r + 64 >> 2) + 2] = i.realVelocity.z;
}
function Vn() {
	return {
		velocity: {
			x: 0,
			y: 0,
			z: 0
		},
		radius: 0,
		halfHeight: 0,
		maxSlope: 0,
		stepHeight: 0,
		snapDown: 0,
		mass: 0,
		pushForce: 0,
		enabled: false,
		layer: 0,
		isOnFloor: false,
		floorNormal: {
			x: 0,
			y: 0,
			z: 0
		},
		realVelocity: {
			x: 0,
			y: 0,
			z: 0
		}
	};
}
function Hn(e, t, n, r, i) {
	i.radius = e[r >> 2];
	const a = i.offset;
	a.x = e[r + 4 >> 2];
	a.y = e[(r + 4 >> 2) + 1];
	i.density = e[r + 12 >> 2];
	i.friction = e[r + 16 >> 2];
	i.restitution = e[r + 20 >> 2];
	i.isSensor = n[r + 24] !== 0;
	i.enabled = n[r + 25] !== 0;
	i.categoryBits = t[r + 28 >> 2];
	i.maskBits = t[r + 32 >> 2];
}
function Un(e, t, n, r, i) {
	e[r >> 2] = i.radius;
	e[r + 4 >> 2] = i.offset.x;
	e[(r + 4 >> 2) + 1] = i.offset.y;
	e[r + 12 >> 2] = i.density;
	e[r + 16 >> 2] = i.friction;
	e[r + 20 >> 2] = i.restitution;
	n[r + 24] = i.isSensor ? 1 : 0;
	n[r + 25] = i.enabled ? 1 : 0;
	t[r + 28 >> 2] = i.categoryBits;
	t[r + 32 >> 2] = i.maskBits;
}
function Wn() {
	return {
		radius: 0,
		offset: {
			x: 0,
			y: 0
		},
		density: 0,
		friction: 0,
		restitution: 0,
		isSensor: false,
		enabled: false,
		categoryBits: 0,
		maskBits: 0
	};
}
function Gn(e, t, n, r, i) {
	const a = i.size;
	a.x = e[r >> 2];
	a.y = e[(r >> 2) + 1];
	const o = i.pivot;
	o.x = e[r + 8 >> 2];
	o.y = e[(r + 8 >> 2) + 1];
}
function Kn(e, t, n, r, i) {
	e[r >> 2] = i.size.x;
	e[(r >> 2) + 1] = i.size.y;
	e[r + 8 >> 2] = i.pivot.x;
	e[(r + 8 >> 2) + 1] = i.pivot.y;
}
function qn() {
	return {
		size: {
			x: 0,
			y: 0
		},
		pivot: {
			x: 0,
			y: 0
		}
	};
}
function Jn(e, t, n, r, i) {
	i.mesh = t[r >> 2];
	i.friction = e[r + 4 >> 2];
	i.restitution = e[r + 8 >> 2];
	i.isSensor = n[r + 12] !== 0;
	i.enabled = n[r + 13] !== 0;
}
function Yn(e, t, n, r, i) {
	t[r >> 2] = i.mesh;
	e[r + 4 >> 2] = i.friction;
	e[r + 8 >> 2] = i.restitution;
	n[r + 12] = i.isSensor ? 1 : 0;
	n[r + 13] = i.enabled ? 1 : 0;
}
function Xn() {
	return {
		mesh: 0,
		friction: 0,
		restitution: 0,
		isSensor: false,
		enabled: false
	};
}
function Zn(e, t, n, r, i) {
	i.enabled = n[r] !== 0;
	i.dragThreshold = e[r + 4 >> 2];
	i.lockX = n[r + 8] !== 0;
	i.lockY = n[r + 9] !== 0;
	i.constrainMin = n[r + 10] !== 0;
	const a = i.constraintMin;
	a.x = e[r + 12 >> 2];
	a.y = e[(r + 12 >> 2) + 1];
	i.constrainMax = n[r + 20] !== 0;
	const o = i.constraintMax;
	o.x = e[r + 24 >> 2];
	o.y = e[(r + 24 >> 2) + 1];
}
function Qn(e, t, n, r, i) {
	n[r] = i.enabled ? 1 : 0;
	e[r + 4 >> 2] = i.dragThreshold;
	n[r + 8] = i.lockX ? 1 : 0;
	n[r + 9] = i.lockY ? 1 : 0;
	n[r + 10] = i.constrainMin ? 1 : 0;
	e[r + 12 >> 2] = i.constraintMin.x;
	e[(r + 12 >> 2) + 1] = i.constraintMin.y;
	n[r + 20] = i.constrainMax ? 1 : 0;
	e[r + 24 >> 2] = i.constraintMax.x;
	e[(r + 24 >> 2) + 1] = i.constraintMax.y;
}
function $n() {
	return {
		enabled: false,
		dragThreshold: 0,
		lockX: false,
		lockY: false,
		constrainMin: false,
		constraintMin: {
			x: 0,
			y: 0
		},
		constrainMax: false,
		constraintMax: {
			x: 0,
			y: 0
		}
	};
}
function er(e, t, n, r, i) {
	i.timeScale = e[r + 48 >> 2];
	i.loop = n[r + 52] !== 0;
	i.playing = n[r + 53] !== 0;
	i.fadeInTime = e[r + 56 >> 2];
	i.flipX = n[r + 60] !== 0;
	i.flipY = n[r + 61] !== 0;
	const a = i.color;
	a.r = e[r + 64 >> 2];
	a.g = e[(r + 64 >> 2) + 1];
	a.b = e[(r + 64 >> 2) + 2];
	a.a = e[(r + 64 >> 2) + 3];
	i.layer = t[r + 80 >> 2] | 0;
	i.skeletonScale = e[r + 84 >> 2];
	i.material = t[r + 88 >> 2];
	i.enabled = n[r + 92] !== 0;
}
function tr(e, t, n, r, i) {
	e[r + 48 >> 2] = i.timeScale;
	n[r + 52] = i.loop ? 1 : 0;
	n[r + 53] = i.playing ? 1 : 0;
	e[r + 56 >> 2] = i.fadeInTime;
	n[r + 60] = i.flipX ? 1 : 0;
	n[r + 61] = i.flipY ? 1 : 0;
	e[r + 64 >> 2] = i.color.r;
	e[(r + 64 >> 2) + 1] = i.color.g;
	e[(r + 64 >> 2) + 2] = i.color.b;
	e[(r + 64 >> 2) + 3] = i.color.a;
	t[r + 80 >> 2] = i.layer | 0;
	e[r + 84 >> 2] = i.skeletonScale;
	t[r + 88 >> 2] = i.material;
	n[r + 92] = i.enabled ? 1 : 0;
}
function nr() {
	return {
		timeScale: 0,
		loop: false,
		playing: false,
		fadeInTime: 0,
		flipX: false,
		flipY: false,
		color: {
			r: 0,
			g: 0,
			b: 0,
			a: 0
		},
		layer: 0,
		skeletonScale: 0,
		material: 0,
		enabled: false
	};
}
function rr(e, t, n, r, i) {
	i.direction = n[r];
	i.wrap = n[r + 1];
	i.justifyContent = n[r + 2];
	i.alignItems = n[r + 3];
	i.alignContent = n[r + 4];
	const a = i.gap;
	a.x = e[r + 8 >> 2];
	a.y = e[(r + 8 >> 2) + 1];
	const o = i.padding;
	o.left = e[r + 16 >> 2];
	o.top = e[r + 20 >> 2];
	o.right = e[r + 24 >> 2];
	o.bottom = e[r + 28 >> 2];
}
function ir(e, t, n, r, i) {
	n[r] = i.direction;
	n[r + 1] = i.wrap;
	n[r + 2] = i.justifyContent;
	n[r + 3] = i.alignItems;
	n[r + 4] = i.alignContent;
	e[r + 8 >> 2] = i.gap.x;
	e[(r + 8 >> 2) + 1] = i.gap.y;
	e[r + 16 >> 2] = i.padding.left;
	e[r + 20 >> 2] = i.padding.top;
	e[r + 24 >> 2] = i.padding.right;
	e[r + 28 >> 2] = i.padding.bottom;
}
function ar() {
	return {
		direction: 0,
		wrap: 0,
		justifyContent: 0,
		alignItems: 0,
		alignContent: 0,
		gap: {
			x: 0,
			y: 0
		},
		padding: {
			left: 0,
			top: 0,
			right: 0,
			bottom: 0
		}
	};
}
function or(e, t, n, r, i) {
	i.opacity = e[r >> 2];
	i.enabled = n[r + 4] !== 0;
}
function sr(e, t, n, r, i) {
	e[r >> 2] = i.opacity;
	n[r + 4] = i.enabled ? 1 : 0;
}
function cr() {
	return {
		opacity: 0,
		enabled: false
	};
}
function lr(e, t, n, r, i) {
	i.screenSize = e[r >> 2];
	i.frames = t[r + 4 >> 2] | 0;
	i.resolution = t[r + 8 >> 2] | 0;
	i.enabled = n[r + 12] !== 0;
}
function ur(e, t, n, r, i) {
	e[r >> 2] = i.screenSize;
	t[r + 4 >> 2] = i.frames | 0;
	t[r + 8 >> 2] = i.resolution | 0;
	n[r + 12] = i.enabled ? 1 : 0;
}
function dr() {
	return {
		screenSize: 0,
		frames: 0,
		resolution: 0,
		enabled: false
	};
}
function fr(e, t, n, r, i) {
	i.enabled = n[r] !== 0;
	i.blockRaycast = n[r + 1] !== 0;
	i.raycastTarget = n[r + 2] !== 0;
}
function pr(e, t, n, r, i) {
	n[r] = i.enabled ? 1 : 0;
	n[r + 1] = i.blockRaycast ? 1 : 0;
	n[r + 2] = i.raycastTarget ? 1 : 0;
}
function mr() {
	return {
		enabled: false,
		blockRaycast: false,
		raycastTarget: false
	};
}
function hr(e, t, n, r, i) {
	i.lod1 = t[r >> 2];
	i.lod2 = t[r + 4 >> 2];
	i.lod3 = t[r + 8 >> 2];
	i.lod1Size = e[r + 12 >> 2];
	i.lod2Size = e[r + 16 >> 2];
	i.lod3Size = e[r + 20 >> 2];
	i.cullSize = e[r + 24 >> 2];
	i.hysteresis = e[r + 28 >> 2];
	i.enabled = n[r + 32] !== 0;
}
function gr(e, t, n, r, i) {
	t[r >> 2] = i.lod1;
	t[r + 4 >> 2] = i.lod2;
	t[r + 8 >> 2] = i.lod3;
	e[r + 12 >> 2] = i.lod1Size;
	e[r + 16 >> 2] = i.lod2Size;
	e[r + 20 >> 2] = i.lod3Size;
	e[r + 24 >> 2] = i.cullSize;
	e[r + 28 >> 2] = i.hysteresis;
	n[r + 32] = i.enabled ? 1 : 0;
}
function _r() {
	return {
		lod1: 0,
		lod2: 0,
		lod3: 0,
		lod1Size: 0,
		lod2Size: 0,
		lod3Size: 0,
		cullSize: 0,
		hysteresis: 0,
		enabled: false
	};
}
function vr(e, t, n, r, i) {
	i.type = t[r >> 2] | 0;
	const a = i.color;
	a.r = e[r + 4 >> 2];
	a.g = e[(r + 4 >> 2) + 1];
	a.b = e[(r + 4 >> 2) + 2];
	a.a = e[(r + 4 >> 2) + 3];
	i.intensity = e[r + 20 >> 2];
	i.radius = e[r + 24 >> 2];
	i.innerRadius = e[r + 28 >> 2];
	i.falloff = e[r + 32 >> 2];
	i.inverseSquare = n[r + 36] !== 0;
	i.shadowStrength = e[r + 40 >> 2];
	i.layerMin = t[r + 44 >> 2] | 0;
	i.layerMax = t[r + 48 >> 2] | 0;
	i.cookie = t[r + 52 >> 2];
	const o = i.cookieSize;
	o.x = e[r + 56 >> 2];
	o.y = e[(r + 56 >> 2) + 1];
	i.innerAngle = e[r + 64 >> 2];
	i.outerAngle = e[r + 68 >> 2];
	i.shadowSoftness = e[r + 72 >> 2];
	i.sourceAngle = e[r + 76 >> 2];
	i.shadowDistance = e[r + 80 >> 2];
	i.meshShadows = n[r + 84] !== 0;
	i.shadowExtent = e[r + 88 >> 2];
	i.followEnvironmentSun = n[r + 92] !== 0;
	i.aimFollowedSun = n[r + 93] !== 0;
	i.environment = t[r + 96 >> 2];
	i.environmentRotation = e[r + 100 >> 2];
	i.drawEnvironment = n[r + 104] !== 0;
	i.reflectionScale = e[r + 108 >> 2];
	i.reflectionSaturation = e[r + 112 >> 2];
	const s = i.bakedTint;
	s.r = e[r + 116 >> 2];
	s.g = e[(r + 116 >> 2) + 1];
	s.b = e[(r + 116 >> 2) + 2];
	s.a = e[(r + 116 >> 2) + 3];
	i.hemisphere = n[r + 132] !== 0;
	const c = i.groundColor;
	c.r = e[r + 136 >> 2];
	c.g = e[(r + 136 >> 2) + 1];
	c.b = e[(r + 136 >> 2) + 2];
	c.a = e[(r + 136 >> 2) + 3];
	i.enabled = n[r + 152] !== 0;
}
function yr(e, t, n, r, i) {
	t[r >> 2] = i.type | 0;
	e[r + 4 >> 2] = i.color.r;
	e[(r + 4 >> 2) + 1] = i.color.g;
	e[(r + 4 >> 2) + 2] = i.color.b;
	e[(r + 4 >> 2) + 3] = i.color.a;
	e[r + 20 >> 2] = i.intensity;
	e[r + 24 >> 2] = i.radius;
	e[r + 28 >> 2] = i.innerRadius;
	e[r + 32 >> 2] = i.falloff;
	n[r + 36] = i.inverseSquare ? 1 : 0;
	e[r + 40 >> 2] = i.shadowStrength;
	t[r + 44 >> 2] = i.layerMin | 0;
	t[r + 48 >> 2] = i.layerMax | 0;
	t[r + 52 >> 2] = i.cookie;
	e[r + 56 >> 2] = i.cookieSize.x;
	e[(r + 56 >> 2) + 1] = i.cookieSize.y;
	e[r + 64 >> 2] = i.innerAngle;
	e[r + 68 >> 2] = i.outerAngle;
	e[r + 72 >> 2] = i.shadowSoftness;
	e[r + 76 >> 2] = i.sourceAngle;
	e[r + 80 >> 2] = i.shadowDistance;
	n[r + 84] = i.meshShadows ? 1 : 0;
	e[r + 88 >> 2] = i.shadowExtent;
	n[r + 92] = i.followEnvironmentSun ? 1 : 0;
	n[r + 93] = i.aimFollowedSun ? 1 : 0;
	t[r + 96 >> 2] = i.environment;
	e[r + 100 >> 2] = i.environmentRotation;
	n[r + 104] = i.drawEnvironment ? 1 : 0;
	e[r + 108 >> 2] = i.reflectionScale;
	e[r + 112 >> 2] = i.reflectionSaturation;
	e[r + 116 >> 2] = i.bakedTint.r;
	e[(r + 116 >> 2) + 1] = i.bakedTint.g;
	e[(r + 116 >> 2) + 2] = i.bakedTint.b;
	e[(r + 116 >> 2) + 3] = i.bakedTint.a;
	n[r + 132] = i.hemisphere ? 1 : 0;
	e[r + 136 >> 2] = i.groundColor.r;
	e[(r + 136 >> 2) + 1] = i.groundColor.g;
	e[(r + 136 >> 2) + 2] = i.groundColor.b;
	e[(r + 136 >> 2) + 3] = i.groundColor.a;
	n[r + 152] = i.enabled ? 1 : 0;
}
function br() {
	return {
		type: 0,
		color: {
			r: 0,
			g: 0,
			b: 0,
			a: 0
		},
		intensity: 0,
		radius: 0,
		innerRadius: 0,
		falloff: 0,
		inverseSquare: false,
		shadowStrength: 0,
		layerMin: 0,
		layerMax: 0,
		cookie: 0,
		cookieSize: {
			x: 0,
			y: 0
		},
		innerAngle: 0,
		outerAngle: 0,
		shadowSoftness: 0,
		sourceAngle: 0,
		shadowDistance: 0,
		meshShadows: false,
		shadowExtent: 0,
		followEnvironmentSun: false,
		aimFollowedSun: false,
		environment: 0,
		environmentRotation: 0,
		drawEnvironment: false,
		reflectionScale: 0,
		reflectionSaturation: 0,
		bakedTint: {
			r: 0,
			g: 0,
			b: 0,
			a: 0
		},
		hemisphere: false,
		groundColor: {
			r: 0,
			g: 0,
			b: 0,
			a: 0
		},
		enabled: false
	};
}
function xr(e, t, n, r, i) {
	i.probes = t[r >> 2];
	i.capture = n[r + 4] !== 0;
	i.captureInterval = e[r + 8 >> 2];
	const a = i.halfExtents;
	a.x = e[r + 12 >> 2];
	a.y = e[(r + 12 >> 2) + 1];
	a.z = e[(r + 12 >> 2) + 2];
	i.spacing = e[r + 24 >> 2];
	i.enabled = n[r + 28] !== 0;
}
function Sr(e, t, n, r, i) {
	t[r >> 2] = i.probes;
	n[r + 4] = i.capture ? 1 : 0;
	e[r + 8 >> 2] = i.captureInterval;
	e[r + 12 >> 2] = i.halfExtents.x;
	e[(r + 12 >> 2) + 1] = i.halfExtents.y;
	e[(r + 12 >> 2) + 2] = i.halfExtents.z;
	e[r + 24 >> 2] = i.spacing;
	n[r + 28] = i.enabled ? 1 : 0;
}
function Cr() {
	return {
		probes: 0,
		capture: false,
		captureInterval: 0,
		halfExtents: {
			x: 0,
			y: 0,
			z: 0
		},
		spacing: 0,
		enabled: false
	};
}
function wr(e, t, n, r, i) {
	i.mesh = t[r >> 2];
	i.friction = e[r + 4 >> 2];
	i.restitution = e[r + 8 >> 2];
	i.layer = t[r + 12 >> 2];
	i.enabled = n[r + 16] !== 0;
}
function Tr(e, t, n, r, i) {
	t[r >> 2] = i.mesh;
	e[r + 4 >> 2] = i.friction;
	e[r + 8 >> 2] = i.restitution;
	t[r + 12 >> 2] = i.layer;
	n[r + 16] = i.enabled ? 1 : 0;
}
function Er() {
	return {
		mesh: 0,
		friction: 0,
		restitution: 0,
		layer: 0,
		enabled: false
	};
}
function Dr(e, t, n, r, i) {
	i.lod1Mesh = t[r >> 2];
	i.lodDistance = e[r + 4 >> 2];
	i.minDistance = e[r + 8 >> 2];
	i.drawDistance = e[r + 12 >> 2];
	i.shadowDistance = e[r + 16 >> 2];
}
function Or(e, t, n, r, i) {
	t[r >> 2] = i.lod1Mesh;
	e[r + 4 >> 2] = i.lodDistance;
	e[r + 8 >> 2] = i.minDistance;
	e[r + 12 >> 2] = i.drawDistance;
	e[r + 16 >> 2] = i.shadowDistance;
}
function kr() {
	return {
		lod1Mesh: 0,
		lodDistance: 0,
		minDistance: 0,
		drawDistance: 0,
		shadowDistance: 0
	};
}
function Ar(e, t, n, r, i) {
	i.lightmap = t[r >> 2];
	const a = i.scaleOffset;
	a.x = e[r + 4 >> 2];
	a.y = e[(r + 4 >> 2) + 1];
	a.z = e[(r + 4 >> 2) + 2];
	a.w = e[(r + 4 >> 2) + 3];
}
function jr(e, t, n, r, i) {
	t[r >> 2] = i.lightmap;
	e[r + 4 >> 2] = i.scaleOffset.x;
	e[(r + 4 >> 2) + 1] = i.scaleOffset.y;
	e[(r + 4 >> 2) + 2] = i.scaleOffset.z;
	e[(r + 4 >> 2) + 3] = i.scaleOffset.w;
}
function Mr() {
	return {
		lightmap: 0,
		scaleOffset: {
			x: 0,
			y: 0,
			z: 0,
			w: 0
		}
	};
}
function Nr(e, t, n, r, i) {
	i.texture = t[r >> 2];
	i.normalMap = t[r + 4 >> 2];
	const a = i.color;
	a.r = e[r + 8 >> 2];
	a.g = e[(r + 8 >> 2) + 1];
	a.b = e[(r + 8 >> 2) + 2];
	a.a = e[(r + 8 >> 2) + 3];
	i.layer = t[r + 24 >> 2] | 0;
	i.opaque = n[r + 28] !== 0;
	i.cullBackfaces = n[r + 29] !== 0;
	i.lit = n[r + 30] !== 0;
	i.castShadows = n[r + 31] !== 0;
	const o = i.parallax;
	o.x = e[r + 32 >> 2];
	o.y = e[(r + 32 >> 2) + 1];
	i.material = t[r + 40 >> 2];
	i.enabled = n[r + 44] !== 0;
	i.mesh = t[r + 48 >> 2];
}
function Pr(e, t, n, r, i) {
	t[r >> 2] = i.texture;
	t[r + 4 >> 2] = i.normalMap;
	e[r + 8 >> 2] = i.color.r;
	e[(r + 8 >> 2) + 1] = i.color.g;
	e[(r + 8 >> 2) + 2] = i.color.b;
	e[(r + 8 >> 2) + 3] = i.color.a;
	t[r + 24 >> 2] = i.layer | 0;
	n[r + 28] = i.opaque ? 1 : 0;
	n[r + 29] = i.cullBackfaces ? 1 : 0;
	n[r + 30] = i.lit ? 1 : 0;
	n[r + 31] = i.castShadows ? 1 : 0;
	e[r + 32 >> 2] = i.parallax.x;
	e[(r + 32 >> 2) + 1] = i.parallax.y;
	t[r + 40 >> 2] = i.material;
	n[r + 44] = i.enabled ? 1 : 0;
	t[r + 48 >> 2] = i.mesh;
}
function Fr() {
	return {
		texture: 0,
		normalMap: 0,
		color: {
			r: 0,
			g: 0,
			b: 0,
			a: 0
		},
		layer: 0,
		opaque: false,
		cullBackfaces: false,
		lit: false,
		castShadows: false,
		parallax: {
			x: 0,
			y: 0
		},
		material: 0,
		enabled: false,
		mesh: 0
	};
}
function Ir(e, t, n, r, i) {
	const a = i.halfExtents;
	a.x = e[r >> 2];
	a.y = e[(r >> 2) + 1];
	a.z = e[(r >> 2) + 2];
	i.enabled = n[r + 12] !== 0;
}
function Lr(e, t, n, r, i) {
	e[r >> 2] = i.halfExtents.x;
	e[(r >> 2) + 1] = i.halfExtents.y;
	e[(r >> 2) + 2] = i.halfExtents.z;
	n[r + 12] = i.enabled ? 1 : 0;
}
function Rr() {
	return {
		halfExtents: {
			x: 0,
			y: 0,
			z: 0
		},
		enabled: false
	};
}
function zr(e, t, n, r, i) {
	i.shape = t[r >> 2] | 0;
	i.radius = e[r + 4 >> 2];
	i.halfHeight = e[r + 8 >> 2];
	const a = i.halfExtents;
	a.x = e[r + 12 >> 2];
	a.y = e[(r + 12 >> 2) + 1];
	a.z = e[(r + 12 >> 2) + 2];
	i.inverted = n[r + 24] !== 0;
	i.mask = t[r + 28 >> 2];
	i.enabled = n[r + 32] !== 0;
}
function Br(e, t, n, r, i) {
	t[r >> 2] = i.shape | 0;
	e[r + 4 >> 2] = i.radius;
	e[r + 8 >> 2] = i.halfHeight;
	e[r + 12 >> 2] = i.halfExtents.x;
	e[(r + 12 >> 2) + 1] = i.halfExtents.y;
	e[(r + 12 >> 2) + 2] = i.halfExtents.z;
	n[r + 24] = i.inverted ? 1 : 0;
	t[r + 28 >> 2] = i.mask;
	n[r + 32] = i.enabled ? 1 : 0;
}
function Vr() {
	return {
		shape: 0,
		radius: 0,
		halfHeight: 0,
		halfExtents: {
			x: 0,
			y: 0,
			z: 0
		},
		inverted: false,
		mask: 0,
		enabled: false
	};
}
function Hr(e, t, n, r, i) {
	i.rate = e[r >> 2];
	i.burstCount = t[r + 4 >> 2] | 0;
	i.burstInterval = e[r + 8 >> 2];
	i.duration = e[r + 12 >> 2];
	i.simulationSpeed = e[r + 16 >> 2];
	i.startDelay = e[r + 20 >> 2];
	i.looping = n[r + 24] !== 0;
	i.playOnStart = n[r + 25] !== 0;
	i.maxParticles = t[r + 28 >> 2] | 0;
	i.gpuSimulation = n[r + 32] !== 0;
	i.lifetimeMin = e[r + 36 >> 2];
	i.lifetimeMax = e[r + 40 >> 2];
	i.shape = t[r + 44 >> 2] | 0;
	i.shapeRadius = e[r + 48 >> 2];
	const a = i.shapeSize;
	a.x = e[r + 52 >> 2];
	a.y = e[(r + 52 >> 2) + 1];
	a.z = e[(r + 52 >> 2) + 2];
	i.shapeAngle = e[r + 64 >> 2];
	i.speedMin = e[r + 68 >> 2];
	i.speedMax = e[r + 72 >> 2];
	i.angleSpreadMin = e[r + 76 >> 2];
	i.angleSpreadMax = e[r + 80 >> 2];
	i.startSizeMin = e[r + 84 >> 2];
	i.startSizeMax = e[r + 88 >> 2];
	i.endSizeMin = e[r + 92 >> 2];
	i.endSizeMax = e[r + 96 >> 2];
	i.sizeEasing = t[r + 100 >> 2] | 0;
	const o = i.startColor;
	o.r = e[r + 104 >> 2];
	o.g = e[(r + 104 >> 2) + 1];
	o.b = e[(r + 104 >> 2) + 2];
	o.a = e[(r + 104 >> 2) + 3];
	const s = i.endColor;
	s.r = e[r + 120 >> 2];
	s.g = e[(r + 120 >> 2) + 1];
	s.b = e[(r + 120 >> 2) + 2];
	s.a = e[(r + 120 >> 2) + 3];
	i.colorEasing = t[r + 136 >> 2] | 0;
	i.rotationMin = e[r + 140 >> 2];
	i.rotationMax = e[r + 144 >> 2];
	i.angularVelocityMin = e[r + 148 >> 2];
	i.angularVelocityMax = e[r + 152 >> 2];
	const c = i.gravity;
	c.x = e[r + 156 >> 2];
	c.y = e[(r + 156 >> 2) + 1];
	c.z = e[(r + 156 >> 2) + 2];
	i.damping = e[r + 168 >> 2];
	const l = i.addedVelocityMin;
	l.x = e[r + 172 >> 2];
	l.y = e[(r + 172 >> 2) + 1];
	l.z = e[(r + 172 >> 2) + 2];
	const u = i.addedVelocityMax;
	u.x = e[r + 184 >> 2];
	u.y = e[(r + 184 >> 2) + 1];
	u.z = e[(r + 184 >> 2) + 2];
	i.speedLimit = e[r + 196 >> 2];
	i.limitDampen = e[r + 200 >> 2];
	i.noiseStrength = e[r + 204 >> 2];
	i.noiseFrequency = e[r + 208 >> 2];
	i.noiseScrollSpeed = e[r + 212 >> 2];
	i.noiseOctaves = t[r + 216 >> 2] | 0;
	i.texture = t[r + 220 >> 2];
	i.spriteColumns = t[r + 224 >> 2] | 0;
	i.spriteRows = t[r + 228 >> 2] | 0;
	i.spriteFPS = e[r + 232 >> 2];
	i.spriteLoop = n[r + 236] !== 0;
	i.blendMode = t[r + 240 >> 2] | 0;
	i.layer = t[r + 244 >> 2] | 0;
	i.material = t[r + 248 >> 2];
	i.simulationSpace = t[r + 252 >> 2] | 0;
	i.renderMode = t[r + 256 >> 2] | 0;
	i.velocityScale = e[r + 260 >> 2];
	i.lengthScale = e[r + 264 >> 2];
	i.enabled = n[r + 268] !== 0;
	i.subEmitterTrigger = t[r + 272 >> 2] | 0;
	i.subEmitterChance = e[r + 276 >> 2];
	i.subEmitterInheritVelocity = e[r + 280 >> 2];
	i.subEmitter = t[r + 284 >> 2];
	i.trailEnabled = n[r + 288] !== 0;
	i.trailWidth = e[r + 292 >> 2];
	i.trailPoints = t[r + 296 >> 2] | 0;
	i.trailMinDistance = e[r + 300 >> 2];
	i.collisionEnabled = n[r + 304] !== 0;
	i.collisionFloor = e[r + 308 >> 2];
	i.collisionMode = t[r + 312 >> 2] | 0;
	i.collisionMask = t[r + 316 >> 2];
	i.collisionQueryBudget = t[r + 320 >> 2] | 0;
	i.collisionMaxDistance = e[r + 324 >> 2];
	i.collisionFallback = t[r + 328 >> 2] | 0;
	i.collisionEvents = n[r + 332] !== 0;
	i.collisionEventBudget = t[r + 336 >> 2] | 0;
	i.collisionThickness = e[r + 340 >> 2];
	i.collisionBounce = e[r + 344 >> 2];
	i.collisionFriction = e[r + 348 >> 2];
	i.collisionLifetimeLoss = e[r + 352 >> 2];
}
function Ur(e, t, n, r, i) {
	e[r >> 2] = i.rate;
	t[r + 4 >> 2] = i.burstCount | 0;
	e[r + 8 >> 2] = i.burstInterval;
	e[r + 12 >> 2] = i.duration;
	e[r + 16 >> 2] = i.simulationSpeed;
	e[r + 20 >> 2] = i.startDelay;
	n[r + 24] = i.looping ? 1 : 0;
	n[r + 25] = i.playOnStart ? 1 : 0;
	t[r + 28 >> 2] = i.maxParticles | 0;
	n[r + 32] = i.gpuSimulation ? 1 : 0;
	e[r + 36 >> 2] = i.lifetimeMin;
	e[r + 40 >> 2] = i.lifetimeMax;
	t[r + 44 >> 2] = i.shape | 0;
	e[r + 48 >> 2] = i.shapeRadius;
	e[r + 52 >> 2] = i.shapeSize.x;
	e[(r + 52 >> 2) + 1] = i.shapeSize.y;
	e[(r + 52 >> 2) + 2] = i.shapeSize.z;
	e[r + 64 >> 2] = i.shapeAngle;
	e[r + 68 >> 2] = i.speedMin;
	e[r + 72 >> 2] = i.speedMax;
	e[r + 76 >> 2] = i.angleSpreadMin;
	e[r + 80 >> 2] = i.angleSpreadMax;
	e[r + 84 >> 2] = i.startSizeMin;
	e[r + 88 >> 2] = i.startSizeMax;
	e[r + 92 >> 2] = i.endSizeMin;
	e[r + 96 >> 2] = i.endSizeMax;
	t[r + 100 >> 2] = i.sizeEasing | 0;
	e[r + 104 >> 2] = i.startColor.r;
	e[(r + 104 >> 2) + 1] = i.startColor.g;
	e[(r + 104 >> 2) + 2] = i.startColor.b;
	e[(r + 104 >> 2) + 3] = i.startColor.a;
	e[r + 120 >> 2] = i.endColor.r;
	e[(r + 120 >> 2) + 1] = i.endColor.g;
	e[(r + 120 >> 2) + 2] = i.endColor.b;
	e[(r + 120 >> 2) + 3] = i.endColor.a;
	t[r + 136 >> 2] = i.colorEasing | 0;
	e[r + 140 >> 2] = i.rotationMin;
	e[r + 144 >> 2] = i.rotationMax;
	e[r + 148 >> 2] = i.angularVelocityMin;
	e[r + 152 >> 2] = i.angularVelocityMax;
	e[r + 156 >> 2] = i.gravity.x;
	e[(r + 156 >> 2) + 1] = i.gravity.y;
	e[(r + 156 >> 2) + 2] = i.gravity.z;
	e[r + 168 >> 2] = i.damping;
	e[r + 172 >> 2] = i.addedVelocityMin.x;
	e[(r + 172 >> 2) + 1] = i.addedVelocityMin.y;
	e[(r + 172 >> 2) + 2] = i.addedVelocityMin.z;
	e[r + 184 >> 2] = i.addedVelocityMax.x;
	e[(r + 184 >> 2) + 1] = i.addedVelocityMax.y;
	e[(r + 184 >> 2) + 2] = i.addedVelocityMax.z;
	e[r + 196 >> 2] = i.speedLimit;
	e[r + 200 >> 2] = i.limitDampen;
	e[r + 204 >> 2] = i.noiseStrength;
	e[r + 208 >> 2] = i.noiseFrequency;
	e[r + 212 >> 2] = i.noiseScrollSpeed;
	t[r + 216 >> 2] = i.noiseOctaves | 0;
	t[r + 220 >> 2] = i.texture;
	t[r + 224 >> 2] = i.spriteColumns | 0;
	t[r + 228 >> 2] = i.spriteRows | 0;
	e[r + 232 >> 2] = i.spriteFPS;
	n[r + 236] = i.spriteLoop ? 1 : 0;
	t[r + 240 >> 2] = i.blendMode | 0;
	t[r + 244 >> 2] = i.layer | 0;
	t[r + 248 >> 2] = i.material;
	t[r + 252 >> 2] = i.simulationSpace | 0;
	t[r + 256 >> 2] = i.renderMode | 0;
	e[r + 260 >> 2] = i.velocityScale;
	e[r + 264 >> 2] = i.lengthScale;
	n[r + 268] = i.enabled ? 1 : 0;
	t[r + 272 >> 2] = i.subEmitterTrigger | 0;
	e[r + 276 >> 2] = i.subEmitterChance;
	e[r + 280 >> 2] = i.subEmitterInheritVelocity;
	t[r + 284 >> 2] = i.subEmitter;
	n[r + 288] = i.trailEnabled ? 1 : 0;
	e[r + 292 >> 2] = i.trailWidth;
	t[r + 296 >> 2] = i.trailPoints | 0;
	e[r + 300 >> 2] = i.trailMinDistance;
	n[r + 304] = i.collisionEnabled ? 1 : 0;
	e[r + 308 >> 2] = i.collisionFloor;
	t[r + 312 >> 2] = i.collisionMode | 0;
	t[r + 316 >> 2] = i.collisionMask;
	t[r + 320 >> 2] = i.collisionQueryBudget | 0;
	e[r + 324 >> 2] = i.collisionMaxDistance;
	t[r + 328 >> 2] = i.collisionFallback | 0;
	n[r + 332] = i.collisionEvents ? 1 : 0;
	t[r + 336 >> 2] = i.collisionEventBudget | 0;
	e[r + 340 >> 2] = i.collisionThickness;
	e[r + 344 >> 2] = i.collisionBounce;
	e[r + 348 >> 2] = i.collisionFriction;
	e[r + 352 >> 2] = i.collisionLifetimeLoss;
}
function Wr() {
	return {
		rate: 0,
		burstCount: 0,
		burstInterval: 0,
		duration: 0,
		simulationSpeed: 0,
		startDelay: 0,
		looping: false,
		playOnStart: false,
		maxParticles: 0,
		gpuSimulation: false,
		lifetimeMin: 0,
		lifetimeMax: 0,
		shape: 0,
		shapeRadius: 0,
		shapeSize: {
			x: 0,
			y: 0,
			z: 0
		},
		shapeAngle: 0,
		speedMin: 0,
		speedMax: 0,
		angleSpreadMin: 0,
		angleSpreadMax: 0,
		startSizeMin: 0,
		startSizeMax: 0,
		endSizeMin: 0,
		endSizeMax: 0,
		sizeEasing: 0,
		startColor: {
			r: 0,
			g: 0,
			b: 0,
			a: 0
		},
		endColor: {
			r: 0,
			g: 0,
			b: 0,
			a: 0
		},
		colorEasing: 0,
		rotationMin: 0,
		rotationMax: 0,
		angularVelocityMin: 0,
		angularVelocityMax: 0,
		gravity: {
			x: 0,
			y: 0,
			z: 0
		},
		damping: 0,
		addedVelocityMin: {
			x: 0,
			y: 0,
			z: 0
		},
		addedVelocityMax: {
			x: 0,
			y: 0,
			z: 0
		},
		speedLimit: 0,
		limitDampen: 0,
		noiseStrength: 0,
		noiseFrequency: 0,
		noiseScrollSpeed: 0,
		noiseOctaves: 0,
		texture: 0,
		spriteColumns: 0,
		spriteRows: 0,
		spriteFPS: 0,
		spriteLoop: false,
		blendMode: 0,
		layer: 0,
		material: 0,
		simulationSpace: 0,
		renderMode: 0,
		velocityScale: 0,
		lengthScale: 0,
		enabled: false,
		subEmitterTrigger: 0,
		subEmitterChance: 0,
		subEmitterInheritVelocity: 0,
		subEmitter: 0,
		trailEnabled: false,
		trailWidth: 0,
		trailPoints: 0,
		trailMinDistance: 0,
		collisionEnabled: false,
		collisionFloor: 0,
		collisionMode: 0,
		collisionMask: 0,
		collisionQueryBudget: 0,
		collisionMaxDistance: 0,
		collisionFallback: 0,
		collisionEvents: false,
		collisionEventBudget: 0,
		collisionThickness: 0,
		collisionBounce: 0,
		collisionFriction: 0,
		collisionLifetimeLoss: 0
	};
}
function Gr(e, t, n, r, i) {
	i.type = t[r >> 2] | 0;
	i.strength = e[r + 4 >> 2];
	i.radius = e[r + 8 >> 2];
	const a = i.direction;
	a.x = e[r + 12 >> 2];
	a.y = e[(r + 12 >> 2) + 1];
	a.z = e[(r + 12 >> 2) + 2];
	i.falloff = n[r + 24] !== 0;
	i.enabled = n[r + 25] !== 0;
}
function Kr(e, t, n, r, i) {
	t[r >> 2] = i.type | 0;
	e[r + 4 >> 2] = i.strength;
	e[r + 8 >> 2] = i.radius;
	e[r + 12 >> 2] = i.direction.x;
	e[(r + 12 >> 2) + 1] = i.direction.y;
	e[(r + 12 >> 2) + 2] = i.direction.z;
	n[r + 24] = i.falloff ? 1 : 0;
	n[r + 25] = i.enabled ? 1 : 0;
}
function qr() {
	return {
		type: 0,
		strength: 0,
		radius: 0,
		direction: {
			x: 0,
			y: 0,
			z: 0
		},
		falloff: false,
		enabled: false
	};
}
function Jr(e, t, n, r, i) {
	i.axis = n[r];
	i.clipOffset = e[r + 4 >> 2];
	i.cullingMask = t[r + 8 >> 2];
	i.quality = n[r + 12];
	i.resolutionScale = e[r + 16 >> 2];
	i.maxSize = t[r + 20 >> 2];
	i.update = n[r + 24];
	i.updatesPerSecond = e[r + 28 >> 2];
	i.revision = t[r + 32 >> 2];
	i.enabled = n[r + 36] !== 0;
}
function Yr(e, t, n, r, i) {
	n[r] = i.axis;
	e[r + 4 >> 2] = i.clipOffset;
	t[r + 8 >> 2] = i.cullingMask;
	n[r + 12] = i.quality;
	e[r + 16 >> 2] = i.resolutionScale;
	t[r + 20 >> 2] = i.maxSize;
	n[r + 24] = i.update;
	e[r + 28 >> 2] = i.updatesPerSecond;
	t[r + 32 >> 2] = i.revision;
	n[r + 36] = i.enabled ? 1 : 0;
}
function Xr() {
	return {
		axis: 0,
		clipOffset: 0,
		cullingMask: 0,
		quality: 0,
		resolutionScale: 0,
		maxSize: 0,
		update: 0,
		updatesPerSecond: 0,
		revision: 0,
		enabled: false
	};
}
function Zr(e, t, n, r, i) {
	i.reflection = t[r >> 2];
	const a = i.halfExtents;
	a.x = e[r + 4 >> 2];
	a.y = e[(r + 4 >> 2) + 1];
	a.z = e[(r + 4 >> 2) + 2];
	i.slot = t[r + 16 >> 2];
	i.enabled = n[r + 20] !== 0;
}
function Qr(e, t, n, r, i) {
	t[r >> 2] = i.reflection;
	e[r + 4 >> 2] = i.halfExtents.x;
	e[(r + 4 >> 2) + 1] = i.halfExtents.y;
	e[(r + 4 >> 2) + 2] = i.halfExtents.z;
	t[r + 16 >> 2] = i.slot;
	n[r + 20] = i.enabled ? 1 : 0;
}
function $r() {
	return {
		reflection: 0,
		halfExtents: {
			x: 0,
			y: 0,
			z: 0
		},
		slot: 0,
		enabled: false
	};
}
function ei(e, t, n, r, i) {
	i.bodyType = n[r];
	i.gravityScale = e[r + 4 >> 2];
	i.linearDamping = e[r + 8 >> 2];
	i.angularDamping = e[r + 12 >> 2];
	i.fixedRotation = n[r + 16] !== 0;
	i.bullet = n[r + 17] !== 0;
	i.enabled = n[r + 18] !== 0;
}
function ti(e, t, n, r, i) {
	n[r] = i.bodyType;
	e[r + 4 >> 2] = i.gravityScale;
	e[r + 8 >> 2] = i.linearDamping;
	e[r + 12 >> 2] = i.angularDamping;
	n[r + 16] = i.fixedRotation ? 1 : 0;
	n[r + 17] = i.bullet ? 1 : 0;
	n[r + 18] = i.enabled ? 1 : 0;
}
function ni() {
	return {
		bodyType: 0,
		gravityScale: 0,
		linearDamping: 0,
		angularDamping: 0,
		fixedRotation: false,
		bullet: false,
		enabled: false
	};
}
function ri(e, t, n, r, i) {
	i.bodyType = n[r];
	i.gravityScale = e[r + 4 >> 2];
	i.linearDamping = e[r + 8 >> 2];
	i.angularDamping = e[r + 12 >> 2];
	i.fixedRotation = n[r + 16] !== 0;
	i.layer = t[r + 20 >> 2];
	i.continuousCollision = n[r + 24] !== 0;
	i.enabled = n[r + 25] !== 0;
}
function ii(e, t, n, r, i) {
	n[r] = i.bodyType;
	e[r + 4 >> 2] = i.gravityScale;
	e[r + 8 >> 2] = i.linearDamping;
	e[r + 12 >> 2] = i.angularDamping;
	n[r + 16] = i.fixedRotation ? 1 : 0;
	t[r + 20 >> 2] = i.layer;
	n[r + 24] = i.continuousCollision ? 1 : 0;
	n[r + 25] = i.enabled ? 1 : 0;
}
function ai() {
	return {
		bodyType: 0,
		gravityScale: 0,
		linearDamping: 0,
		angularDamping: 0,
		fixedRotation: false,
		layer: 0,
		continuousCollision: false,
		enabled: false
	};
}
function oi(e, t, n, r, i) {
	const a = i.point1;
	a.x = e[r >> 2];
	a.y = e[(r >> 2) + 1];
	const o = i.point2;
	o.x = e[r + 8 >> 2];
	o.y = e[(r + 8 >> 2) + 1];
	i.density = e[r + 16 >> 2];
	i.friction = e[r + 20 >> 2];
	i.restitution = e[r + 24 >> 2];
	i.isSensor = n[r + 28] !== 0;
	i.enabled = n[r + 29] !== 0;
	i.categoryBits = t[r + 32 >> 2];
	i.maskBits = t[r + 36 >> 2];
}
function si(e, t, n, r, i) {
	e[r >> 2] = i.point1.x;
	e[(r >> 2) + 1] = i.point1.y;
	e[r + 8 >> 2] = i.point2.x;
	e[(r + 8 >> 2) + 1] = i.point2.y;
	e[r + 16 >> 2] = i.density;
	e[r + 20 >> 2] = i.friction;
	e[r + 24 >> 2] = i.restitution;
	n[r + 28] = i.isSensor ? 1 : 0;
	n[r + 29] = i.enabled ? 1 : 0;
	t[r + 32 >> 2] = i.categoryBits;
	t[r + 36 >> 2] = i.maskBits;
}
function ci() {
	return {
		point1: {
			x: 0,
			y: 0
		},
		point2: {
			x: 0,
			y: 0
		},
		density: 0,
		friction: 0,
		restitution: 0,
		isSensor: false,
		enabled: false,
		categoryBits: 0,
		maskBits: 0
	};
}
function li(e, t, n, r, i) {
	const a = i.size;
	a.x = e[r >> 2];
	a.y = e[(r >> 2) + 1];
	i.enabled = n[r + 20] !== 0;
}
function ui(e, t, n, r, i) {
	e[r >> 2] = i.size.x;
	e[(r >> 2) + 1] = i.size.y;
	n[r + 20] = i.enabled ? 1 : 0;
}
function di() {
	return {
		size: {
			x: 0,
			y: 0
		},
		enabled: false
	};
}
function fi(e, t, n, r, i) {
	i.shapeType = n[r];
	const a = i.color;
	a.r = e[r + 4 >> 2];
	a.g = e[(r + 4 >> 2) + 1];
	a.b = e[(r + 4 >> 2) + 2];
	a.a = e[(r + 4 >> 2) + 3];
	const o = i.size;
	o.x = e[r + 20 >> 2];
	o.y = e[(r + 20 >> 2) + 1];
	i.cornerRadius = e[r + 28 >> 2];
	i.layer = t[r + 32 >> 2] | 0;
	const s = i.parallax;
	s.x = e[r + 36 >> 2];
	s.y = e[(r + 36 >> 2) + 1];
	i.enabled = n[r + 44] !== 0;
}
function pi(e, t, n, r, i) {
	n[r] = i.shapeType;
	e[r + 4 >> 2] = i.color.r;
	e[(r + 4 >> 2) + 1] = i.color.g;
	e[(r + 4 >> 2) + 2] = i.color.b;
	e[(r + 4 >> 2) + 3] = i.color.a;
	e[r + 20 >> 2] = i.size.x;
	e[(r + 20 >> 2) + 1] = i.size.y;
	e[r + 28 >> 2] = i.cornerRadius;
	t[r + 32 >> 2] = i.layer | 0;
	e[r + 36 >> 2] = i.parallax.x;
	e[(r + 36 >> 2) + 1] = i.parallax.y;
	n[r + 44] = i.enabled ? 1 : 0;
}
function mi() {
	return {
		shapeType: 0,
		color: {
			r: 0,
			g: 0,
			b: 0,
			a: 0
		},
		size: {
			x: 0,
			y: 0
		},
		cornerRadius: 0,
		layer: 0,
		parallax: {
			x: 0,
			y: 0
		},
		enabled: false
	};
}
function hi(e, t, n, r, i) {
	i.layer = t[r >> 2] | 0;
	i.order = t[r + 4 >> 2] | 0;
	i.enabled = n[r + 8] !== 0;
}
function gi(e, t, n, r, i) {
	t[r >> 2] = i.layer | 0;
	t[r + 4 >> 2] = i.order | 0;
	n[r + 8] = i.enabled ? 1 : 0;
}
function _i() {
	return {
		layer: 0,
		order: 0,
		enabled: false
	};
}
function vi(e, t, n, r, i) {
	i.radius = e[r >> 2];
	const a = i.center;
	a.x = e[r + 4 >> 2];
	a.y = e[(r + 4 >> 2) + 1];
	a.z = e[(r + 4 >> 2) + 2];
	i.friction = e[r + 16 >> 2];
	i.restitution = e[r + 20 >> 2];
	i.isSensor = n[r + 24] !== 0;
	i.enabled = n[r + 25] !== 0;
}
function yi(e, t, n, r, i) {
	e[r >> 2] = i.radius;
	e[r + 4 >> 2] = i.center.x;
	e[(r + 4 >> 2) + 1] = i.center.y;
	e[(r + 4 >> 2) + 2] = i.center.z;
	e[r + 16 >> 2] = i.friction;
	e[r + 20 >> 2] = i.restitution;
	n[r + 24] = i.isSensor ? 1 : 0;
	n[r + 25] = i.enabled ? 1 : 0;
}
function bi() {
	return {
		radius: 0,
		center: {
			x: 0,
			y: 0,
			z: 0
		},
		friction: 0,
		restitution: 0,
		isSensor: false,
		enabled: false
	};
}
function xi(e, t, n, r, i) {
	i.timeScale = e[r + 48 >> 2];
	i.loop = n[r + 52] !== 0;
	i.playing = n[r + 53] !== 0;
	i.flipX = n[r + 54] !== 0;
	i.flipY = n[r + 55] !== 0;
	const a = i.color;
	a.r = e[r + 56 >> 2];
	a.g = e[(r + 56 >> 2) + 1];
	a.b = e[(r + 56 >> 2) + 2];
	a.a = e[(r + 56 >> 2) + 3];
	i.layer = t[r + 72 >> 2] | 0;
	i.skeletonScale = e[r + 76 >> 2];
	i.material = t[r + 80 >> 2];
	i.enabled = n[r + 84] !== 0;
}
function Si(e, t, n, r, i) {
	e[r + 48 >> 2] = i.timeScale;
	n[r + 52] = i.loop ? 1 : 0;
	n[r + 53] = i.playing ? 1 : 0;
	n[r + 54] = i.flipX ? 1 : 0;
	n[r + 55] = i.flipY ? 1 : 0;
	e[r + 56 >> 2] = i.color.r;
	e[(r + 56 >> 2) + 1] = i.color.g;
	e[(r + 56 >> 2) + 2] = i.color.b;
	e[(r + 56 >> 2) + 3] = i.color.a;
	t[r + 72 >> 2] = i.layer | 0;
	e[r + 76 >> 2] = i.skeletonScale;
	t[r + 80 >> 2] = i.material;
	n[r + 84] = i.enabled ? 1 : 0;
}
function Ci() {
	return {
		timeScale: 0,
		loop: false,
		playing: false,
		flipX: false,
		flipY: false,
		color: {
			r: 0,
			g: 0,
			b: 0,
			a: 0
		},
		layer: 0,
		skeletonScale: 0,
		material: 0,
		enabled: false
	};
}
function wi(e, t, n, r, i) {
	i.enabled = n[r] !== 0;
	i.stiffness = e[r + 4 >> 2];
	i.drag = e[r + 8 >> 2];
	const a = i.gravity;
	a.x = e[r + 12 >> 2];
	a.y = e[(r + 12 >> 2) + 1];
	a.z = e[(r + 12 >> 2) + 2];
	const o = i.wind;
	o.x = e[r + 24 >> 2];
	o.y = e[(r + 24 >> 2) + 1];
	o.z = e[(r + 24 >> 2) + 2];
	i.windGust = e[r + 36 >> 2];
	i.windFrequency = e[r + 40 >> 2];
	i.endLength = e[r + 44 >> 2];
	i.radius = e[r + 48 >> 2];
	i.weight = e[r + 52 >> 2];
}
function Ti(e, t, n, r, i) {
	n[r] = i.enabled ? 1 : 0;
	e[r + 4 >> 2] = i.stiffness;
	e[r + 8 >> 2] = i.drag;
	e[r + 12 >> 2] = i.gravity.x;
	e[(r + 12 >> 2) + 1] = i.gravity.y;
	e[(r + 12 >> 2) + 2] = i.gravity.z;
	e[r + 24 >> 2] = i.wind.x;
	e[(r + 24 >> 2) + 1] = i.wind.y;
	e[(r + 24 >> 2) + 2] = i.wind.z;
	e[r + 36 >> 2] = i.windGust;
	e[r + 40 >> 2] = i.windFrequency;
	e[r + 44 >> 2] = i.endLength;
	e[r + 48 >> 2] = i.radius;
	e[r + 52 >> 2] = i.weight;
}
function Ei() {
	return {
		enabled: false,
		stiffness: 0,
		drag: 0,
		gravity: {
			x: 0,
			y: 0,
			z: 0
		},
		wind: {
			x: 0,
			y: 0,
			z: 0
		},
		windGust: 0,
		windFrequency: 0,
		endLength: 0,
		radius: 0,
		weight: 0
	};
}
function Di(e, t, n, r, i) {
	i.shape = n[r];
	i.radius = e[r + 4 >> 2];
	i.height = e[r + 8 >> 2];
	const a = i.offset;
	a.x = e[r + 12 >> 2];
	a.y = e[(r + 12 >> 2) + 1];
	a.z = e[(r + 12 >> 2) + 2];
}
function Oi(e, t, n, r, i) {
	n[r] = i.shape;
	e[r + 4 >> 2] = i.radius;
	e[r + 8 >> 2] = i.height;
	e[r + 12 >> 2] = i.offset.x;
	e[(r + 12 >> 2) + 1] = i.offset.y;
	e[(r + 12 >> 2) + 2] = i.offset.z;
}
function ki() {
	return {
		shape: 0,
		radius: 0,
		height: 0,
		offset: {
			x: 0,
			y: 0,
			z: 0
		}
	};
}
function Ai(e, t, n, r, i) {
	i.texture = t[r >> 2];
	const a = i.color;
	a.r = e[r + 4 >> 2];
	a.g = e[(r + 4 >> 2) + 1];
	a.b = e[(r + 4 >> 2) + 2];
	a.a = e[(r + 4 >> 2) + 3];
	const o = i.size;
	o.x = e[r + 20 >> 2];
	o.y = e[(r + 20 >> 2) + 1];
	const s = i.pivot;
	s.x = e[r + 28 >> 2];
	s.y = e[(r + 28 >> 2) + 1];
	const c = i.uvOffset;
	c.x = e[r + 36 >> 2];
	c.y = e[(r + 36 >> 2) + 1];
	const l = i.uvScale;
	l.x = e[r + 44 >> 2];
	l.y = e[(r + 44 >> 2) + 1];
	i.layer = t[r + 52 >> 2] | 0;
	i.order = t[r + 56 >> 2] | 0;
	i.maskInteraction = t[r + 60 >> 2] | 0;
	i.lit = n[r + 64] !== 0;
	i.flipX = n[r + 65] !== 0;
	i.flipY = n[r + 66] !== 0;
	i.drawMode = n[r + 67];
	const u = i.tileSize;
	u.x = e[r + 68 >> 2];
	u.y = e[(r + 68 >> 2) + 1];
	const d = i.tileSpacing;
	d.x = e[r + 76 >> 2];
	d.y = e[(r + 76 >> 2) + 1];
	const f = i.parallax;
	f.x = e[r + 84 >> 2];
	f.y = e[(r + 84 >> 2) + 1];
	i.material = t[r + 92 >> 2];
	i.enabled = n[r + 96] !== 0;
}
function ji(e, t, n, r, i) {
	t[r >> 2] = i.texture;
	e[r + 4 >> 2] = i.color.r;
	e[(r + 4 >> 2) + 1] = i.color.g;
	e[(r + 4 >> 2) + 2] = i.color.b;
	e[(r + 4 >> 2) + 3] = i.color.a;
	e[r + 20 >> 2] = i.size.x;
	e[(r + 20 >> 2) + 1] = i.size.y;
	e[r + 28 >> 2] = i.pivot.x;
	e[(r + 28 >> 2) + 1] = i.pivot.y;
	e[r + 36 >> 2] = i.uvOffset.x;
	e[(r + 36 >> 2) + 1] = i.uvOffset.y;
	e[r + 44 >> 2] = i.uvScale.x;
	e[(r + 44 >> 2) + 1] = i.uvScale.y;
	t[r + 52 >> 2] = i.layer | 0;
	t[r + 56 >> 2] = i.order | 0;
	t[r + 60 >> 2] = i.maskInteraction | 0;
	n[r + 64] = i.lit ? 1 : 0;
	n[r + 65] = i.flipX ? 1 : 0;
	n[r + 66] = i.flipY ? 1 : 0;
	n[r + 67] = i.drawMode;
	e[r + 68 >> 2] = i.tileSize.x;
	e[(r + 68 >> 2) + 1] = i.tileSize.y;
	e[r + 76 >> 2] = i.tileSpacing.x;
	e[(r + 76 >> 2) + 1] = i.tileSpacing.y;
	e[r + 84 >> 2] = i.parallax.x;
	e[(r + 84 >> 2) + 1] = i.parallax.y;
	t[r + 92 >> 2] = i.material;
	n[r + 96] = i.enabled ? 1 : 0;
}
function Mi() {
	return {
		texture: 0,
		color: {
			r: 0,
			g: 0,
			b: 0,
			a: 0
		},
		size: {
			x: 0,
			y: 0
		},
		pivot: {
			x: 0,
			y: 0
		},
		uvOffset: {
			x: 0,
			y: 0
		},
		uvScale: {
			x: 0,
			y: 0
		},
		layer: 0,
		order: 0,
		maskInteraction: 0,
		lit: false,
		flipX: false,
		flipY: false,
		drawMode: 0,
		tileSize: {
			x: 0,
			y: 0
		},
		tileSpacing: {
			x: 0,
			y: 0
		},
		parallax: {
			x: 0,
			y: 0
		},
		material: 0,
		enabled: false
	};
}
function Ni(e, t, n, r, i) {
	i.alphaCutoff = e[r >> 2];
	i.limitRange = n[r + 4] !== 0;
	i.rangeEndLayer = t[r + 8 >> 2] | 0;
	i.rangeEndOrder = t[r + 12 >> 2] | 0;
	i.enabled = n[r + 16] !== 0;
}
function Pi(e, t, n, r, i) {
	e[r >> 2] = i.alphaCutoff;
	n[r + 4] = i.limitRange ? 1 : 0;
	t[r + 8 >> 2] = i.rangeEndLayer | 0;
	t[r + 12 >> 2] = i.rangeEndOrder | 0;
	n[r + 16] = i.enabled ? 1 : 0;
}
function Fi() {
	return {
		alphaCutoff: 0,
		limitRange: false,
		rangeEndLayer: 0,
		rangeEndOrder: 0,
		enabled: false
	};
}
function Ii(e, t, n, r, i) {
	const a = i.cellSize;
	a.x = e[r >> 2];
	a.y = e[(r >> 2) + 1];
	i.orientation = n[r + 8];
	i.hexSideLength = e[r + 12 >> 2];
	i.staggerAxis = n[r + 16];
	i.staggerIndex = n[r + 17];
	const o = i.originOffset;
	o.x = e[r + 20 >> 2];
	o.y = e[(r + 20 >> 2) + 1];
	i.tileset = t[r + 28 >> 2];
	i.tilesetColumns = t[r + 32 >> 2] | 0;
	i.renderLayer = t[r + 36 >> 2] | 0;
	const s = i.tintColor;
	s.r = e[r + 40 >> 2];
	s.g = e[(r + 40 >> 2) + 1];
	s.b = e[(r + 40 >> 2) + 2];
	s.a = e[(r + 40 >> 2) + 3];
	i.opacity = e[r + 56 >> 2];
	const c = i.parallaxFactor;
	c.x = e[r + 60 >> 2];
	c.y = e[(r + 60 >> 2) + 1];
	i.visible = n[r + 68] !== 0;
	i.lit = n[r + 69] !== 0;
}
function Li(e, t, n, r, i) {
	e[r >> 2] = i.cellSize.x;
	e[(r >> 2) + 1] = i.cellSize.y;
	n[r + 8] = i.orientation;
	e[r + 12 >> 2] = i.hexSideLength;
	n[r + 16] = i.staggerAxis;
	n[r + 17] = i.staggerIndex;
	e[r + 20 >> 2] = i.originOffset.x;
	e[(r + 20 >> 2) + 1] = i.originOffset.y;
	t[r + 28 >> 2] = i.tileset;
	t[r + 32 >> 2] = i.tilesetColumns | 0;
	t[r + 36 >> 2] = i.renderLayer | 0;
	e[r + 40 >> 2] = i.tintColor.r;
	e[(r + 40 >> 2) + 1] = i.tintColor.g;
	e[(r + 40 >> 2) + 2] = i.tintColor.b;
	e[(r + 40 >> 2) + 3] = i.tintColor.a;
	e[r + 56 >> 2] = i.opacity;
	e[r + 60 >> 2] = i.parallaxFactor.x;
	e[(r + 60 >> 2) + 1] = i.parallaxFactor.y;
	n[r + 68] = i.visible ? 1 : 0;
	n[r + 69] = i.lit ? 1 : 0;
}
function Ri() {
	return {
		cellSize: {
			x: 0,
			y: 0
		},
		orientation: 0,
		hexSideLength: 0,
		staggerAxis: 0,
		staggerIndex: 0,
		originOffset: {
			x: 0,
			y: 0
		},
		tileset: 0,
		tilesetColumns: 0,
		renderLayer: 0,
		tintColor: {
			r: 0,
			g: 0,
			b: 0,
			a: 0
		},
		opacity: 0,
		parallaxFactor: {
			x: 0,
			y: 0
		},
		visible: false,
		lit: false
	};
}
function zi(e, t, n, r, i) {
	i.time = e[r >> 2];
	i.minVertexDistance = e[r + 4 >> 2];
	i.emitting = n[r + 8] !== 0;
	i.startWidth = e[r + 12 >> 2];
	i.endWidth = e[r + 16 >> 2];
	const a = i.startColor;
	a.r = e[r + 20 >> 2];
	a.g = e[(r + 20 >> 2) + 1];
	a.b = e[(r + 20 >> 2) + 2];
	a.a = e[(r + 20 >> 2) + 3];
	const o = i.endColor;
	o.r = e[r + 36 >> 2];
	o.g = e[(r + 36 >> 2) + 1];
	o.b = e[(r + 36 >> 2) + 2];
	o.a = e[(r + 36 >> 2) + 3];
	i.texture = t[r + 52 >> 2];
	i.blendMode = t[r + 56 >> 2] | 0;
	i.layer = t[r + 60 >> 2] | 0;
	i.material = t[r + 64 >> 2];
	i.enabled = n[r + 68] !== 0;
}
function Bi(e, t, n, r, i) {
	e[r >> 2] = i.time;
	e[r + 4 >> 2] = i.minVertexDistance;
	n[r + 8] = i.emitting ? 1 : 0;
	e[r + 12 >> 2] = i.startWidth;
	e[r + 16 >> 2] = i.endWidth;
	e[r + 20 >> 2] = i.startColor.r;
	e[(r + 20 >> 2) + 1] = i.startColor.g;
	e[(r + 20 >> 2) + 2] = i.startColor.b;
	e[(r + 20 >> 2) + 3] = i.startColor.a;
	e[r + 36 >> 2] = i.endColor.r;
	e[(r + 36 >> 2) + 1] = i.endColor.g;
	e[(r + 36 >> 2) + 2] = i.endColor.b;
	e[(r + 36 >> 2) + 3] = i.endColor.a;
	t[r + 52 >> 2] = i.texture;
	t[r + 56 >> 2] = i.blendMode | 0;
	t[r + 60 >> 2] = i.layer | 0;
	t[r + 64 >> 2] = i.material;
	n[r + 68] = i.enabled ? 1 : 0;
}
function Vi() {
	return {
		time: 0,
		minVertexDistance: 0,
		emitting: false,
		startWidth: 0,
		endWidth: 0,
		startColor: {
			r: 0,
			g: 0,
			b: 0,
			a: 0
		},
		endColor: {
			r: 0,
			g: 0,
			b: 0,
			a: 0
		},
		texture: 0,
		blendMode: 0,
		layer: 0,
		material: 0,
		enabled: false
	};
}
function Hi(e, t, n, r, i) {
	const a = i.position;
	a.x = e[r >> 2];
	a.y = e[(r >> 2) + 1];
	a.z = e[(r >> 2) + 2];
	const o = i.rotation;
	o.x = e[r + 12 >> 2];
	o.y = e[(r + 12 >> 2) + 1];
	o.z = e[(r + 12 >> 2) + 2];
	o.w = e[(r + 12 >> 2) + 3];
	const s = i.scale;
	s.x = e[r + 28 >> 2];
	s.y = e[(r + 28 >> 2) + 1];
	s.z = e[(r + 28 >> 2) + 2];
	const c = i.worldPosition;
	c.x = e[r + 40 >> 2];
	c.y = e[(r + 40 >> 2) + 1];
	c.z = e[(r + 40 >> 2) + 2];
	const l = i.worldRotation;
	l.x = e[r + 52 >> 2];
	l.y = e[(r + 52 >> 2) + 1];
	l.z = e[(r + 52 >> 2) + 2];
	l.w = e[(r + 52 >> 2) + 3];
	const u = i.worldScale;
	u.x = e[r + 68 >> 2];
	u.y = e[(r + 68 >> 2) + 1];
	u.z = e[(r + 68 >> 2) + 2];
}
function Ui(e, t, n, r, i) {
	e[r >> 2] = i.position.x;
	e[(r >> 2) + 1] = i.position.y;
	e[(r >> 2) + 2] = i.position.z;
	e[r + 12 >> 2] = i.rotation.x;
	e[(r + 12 >> 2) + 1] = i.rotation.y;
	e[(r + 12 >> 2) + 2] = i.rotation.z;
	e[(r + 12 >> 2) + 3] = i.rotation.w;
	e[r + 28 >> 2] = i.scale.x;
	e[(r + 28 >> 2) + 1] = i.scale.y;
	e[(r + 28 >> 2) + 2] = i.scale.z;
	e[r + 40 >> 2] = i.worldPosition.x;
	e[(r + 40 >> 2) + 1] = i.worldPosition.y;
	e[(r + 40 >> 2) + 2] = i.worldPosition.z;
	e[r + 52 >> 2] = i.worldRotation.x;
	e[(r + 52 >> 2) + 1] = i.worldRotation.y;
	e[(r + 52 >> 2) + 2] = i.worldRotation.z;
	e[(r + 52 >> 2) + 3] = i.worldRotation.w;
	e[r + 68 >> 2] = i.worldScale.x;
	e[(r + 68 >> 2) + 1] = i.worldScale.y;
	e[(r + 68 >> 2) + 2] = i.worldScale.z;
}
function Wi() {
	return {
		position: {
			x: 0,
			y: 0,
			z: 0
		},
		rotation: {
			x: 0,
			y: 0,
			z: 0,
			w: 0
		},
		scale: {
			x: 0,
			y: 0,
			z: 0
		},
		worldPosition: {
			x: 0,
			y: 0,
			z: 0
		},
		worldRotation: {
			x: 0,
			y: 0,
			z: 0,
			w: 0
		},
		worldScale: {
			x: 0,
			y: 0,
			z: 0
		}
	};
}
function Gi(e, t, n, r, i) {
	i.hovered = n[r] !== 0;
	i.pressed = n[r + 1] !== 0;
	i.justPressed = n[r + 2] !== 0;
	i.justReleased = n[r + 3] !== 0;
}
function Ki(e, t, n, r, i) {
	n[r] = i.hovered ? 1 : 0;
	n[r + 1] = i.pressed ? 1 : 0;
	n[r + 2] = i.justPressed ? 1 : 0;
	n[r + 3] = i.justReleased ? 1 : 0;
}
function qi() {
	return {
		hovered: false,
		pressed: false,
		justPressed: false,
		justReleased: false
	};
}
function Ji(e, t, n, r, i) {
	i.enabled = n[r] !== 0;
	i.mode = n[r + 1];
	i.alphaCutoff = e[r + 4 >> 2];
}
function Yi(e, t, n, r, i) {
	n[r] = i.enabled ? 1 : 0;
	n[r + 1] = i.mode;
	e[r + 4 >> 2] = i.alphaCutoff;
}
function Xi() {
	return {
		enabled: false,
		mode: 0,
		alphaCutoff: 0
	};
}
function Zi(e, t, n, r, i) {
	i.position = n[r];
	i.display = n[r + 1];
	i.opacity = e[r + 4 >> 2];
	i.pointerEvents = n[r + 8];
	const a = i.width;
	a.value = e[r + 12 >> 2];
	a.unit = n[r + 16];
	const o = i.height;
	o.value = e[r + 20 >> 2];
	o.unit = n[r + 24];
	const s = i.minWidth;
	s.value = e[r + 28 >> 2];
	s.unit = n[r + 32];
	const c = i.minHeight;
	c.value = e[r + 36 >> 2];
	c.unit = n[r + 40];
	const l = i.maxWidth;
	l.value = e[r + 44 >> 2];
	l.unit = n[r + 48];
	const u = i.maxHeight;
	u.value = e[r + 52 >> 2];
	u.unit = n[r + 56];
	i.flexGrow = e[r + 60 >> 2];
	i.flexShrink = e[r + 64 >> 2];
	const d = i.flexBasis;
	d.value = e[r + 68 >> 2];
	d.unit = n[r + 72];
	i.alignSelf = n[r + 76];
	const f = i.marginLeft;
	f.value = e[r + 80 >> 2];
	f.unit = n[r + 84];
	const p = i.marginTop;
	p.value = e[r + 88 >> 2];
	p.unit = n[r + 92];
	const m = i.marginRight;
	m.value = e[r + 96 >> 2];
	m.unit = n[r + 100];
	const h = i.marginBottom;
	h.value = e[r + 104 >> 2];
	h.unit = n[r + 108];
	const g = i.insetLeft;
	g.value = e[r + 112 >> 2];
	g.unit = n[r + 116];
	const _ = i.insetTop;
	_.value = e[r + 120 >> 2];
	_.unit = n[r + 124];
	const v = i.insetRight;
	v.value = e[r + 128 >> 2];
	v.unit = n[r + 132];
	const y = i.insetBottom;
	y.value = e[r + 136 >> 2];
	y.unit = n[r + 140];
}
function Qi(e, t, n, r, i) {
	n[r] = i.position;
	n[r + 1] = i.display;
	e[r + 4 >> 2] = i.opacity;
	n[r + 8] = i.pointerEvents;
	e[r + 12 >> 2] = i.width.value;
	n[r + 16] = i.width.unit;
	e[r + 20 >> 2] = i.height.value;
	n[r + 24] = i.height.unit;
	e[r + 28 >> 2] = i.minWidth.value;
	n[r + 32] = i.minWidth.unit;
	e[r + 36 >> 2] = i.minHeight.value;
	n[r + 40] = i.minHeight.unit;
	e[r + 44 >> 2] = i.maxWidth.value;
	n[r + 48] = i.maxWidth.unit;
	e[r + 52 >> 2] = i.maxHeight.value;
	n[r + 56] = i.maxHeight.unit;
	e[r + 60 >> 2] = i.flexGrow;
	e[r + 64 >> 2] = i.flexShrink;
	e[r + 68 >> 2] = i.flexBasis.value;
	n[r + 72] = i.flexBasis.unit;
	n[r + 76] = i.alignSelf;
	e[r + 80 >> 2] = i.marginLeft.value;
	n[r + 84] = i.marginLeft.unit;
	e[r + 88 >> 2] = i.marginTop.value;
	n[r + 92] = i.marginTop.unit;
	e[r + 96 >> 2] = i.marginRight.value;
	n[r + 100] = i.marginRight.unit;
	e[r + 104 >> 2] = i.marginBottom.value;
	n[r + 108] = i.marginBottom.unit;
	e[r + 112 >> 2] = i.insetLeft.value;
	n[r + 116] = i.insetLeft.unit;
	e[r + 120 >> 2] = i.insetTop.value;
	n[r + 124] = i.insetTop.unit;
	e[r + 128 >> 2] = i.insetRight.value;
	n[r + 132] = i.insetRight.unit;
	e[r + 136 >> 2] = i.insetBottom.value;
	n[r + 140] = i.insetBottom.unit;
}
function $i() {
	return {
		position: 0,
		display: 0,
		opacity: 0,
		pointerEvents: 0,
		width: {
			value: 0,
			unit: 0
		},
		height: {
			value: 0,
			unit: 0
		},
		minWidth: {
			value: 0,
			unit: 0
		},
		minHeight: {
			value: 0,
			unit: 0
		},
		maxWidth: {
			value: 0,
			unit: 0
		},
		maxHeight: {
			value: 0,
			unit: 0
		},
		flexGrow: 0,
		flexShrink: 0,
		flexBasis: {
			value: 0,
			unit: 0
		},
		alignSelf: 0,
		marginLeft: {
			value: 0,
			unit: 0
		},
		marginTop: {
			value: 0,
			unit: 0
		},
		marginRight: {
			value: 0,
			unit: 0
		},
		marginBottom: {
			value: 0,
			unit: 0
		},
		insetLeft: {
			value: 0,
			unit: 0
		},
		insetTop: {
			value: 0,
			unit: 0
		},
		insetRight: {
			value: 0,
			unit: 0
		},
		insetBottom: {
			value: 0,
			unit: 0
		}
	};
}
function ea(e, t, n, r, i) {
	i.enabled = n[r] !== 0;
	i.content = t[r + 4 >> 2];
	i.horizontal = n[r + 8] !== 0;
	i.vertical = n[r + 9] !== 0;
	i.movement = n[r + 10];
	i.wheelSpeed = e[r + 12 >> 2];
	i.dragScroll = n[r + 16] !== 0;
	i.decelerationRate = e[r + 20 >> 2];
}
function ta(e, t, n, r, i) {
	n[r] = i.enabled ? 1 : 0;
	t[r + 4 >> 2] = i.content;
	n[r + 8] = i.horizontal ? 1 : 0;
	n[r + 9] = i.vertical ? 1 : 0;
	n[r + 10] = i.movement;
	e[r + 12 >> 2] = i.wheelSpeed;
	n[r + 16] = i.dragScroll ? 1 : 0;
	e[r + 20 >> 2] = i.decelerationRate;
}
function na() {
	return {
		enabled: false,
		content: 0,
		horizontal: false,
		vertical: false,
		movement: 0,
		wheelSpeed: 0,
		dragScroll: false,
		decelerationRate: 0
	};
}
function ra(e, t, n, r, i) {
	i.visualType = n[r];
	i.texture = t[r + 4 >> 2];
	const a = i.color;
	a.r = e[r + 8 >> 2];
	a.g = e[(r + 8 >> 2) + 1];
	a.b = e[(r + 8 >> 2) + 2];
	a.a = e[(r + 8 >> 2) + 3];
	i.fit = n[r + 24];
	const o = i.uvOffset;
	o.x = e[r + 28 >> 2];
	o.y = e[(r + 28 >> 2) + 1];
	const s = i.uvScale;
	s.x = e[r + 36 >> 2];
	s.y = e[(r + 36 >> 2) + 1];
	const c = i.sliceBorder;
	c.x = e[r + 44 >> 2];
	c.y = e[(r + 44 >> 2) + 1];
	c.z = e[(r + 44 >> 2) + 2];
	c.w = e[(r + 44 >> 2) + 3];
	const l = i.tileSize;
	l.x = e[r + 60 >> 2];
	l.y = e[(r + 60 >> 2) + 1];
	i.fillMethod = n[r + 68];
	i.fillOrigin = n[r + 69];
	i.fillAmount = e[r + 72 >> 2];
	i.material = t[r + 76 >> 2];
	i.enabled = n[r + 80] !== 0;
}
function ia(e, t, n, r, i) {
	n[r] = i.visualType;
	t[r + 4 >> 2] = i.texture;
	e[r + 8 >> 2] = i.color.r;
	e[(r + 8 >> 2) + 1] = i.color.g;
	e[(r + 8 >> 2) + 2] = i.color.b;
	e[(r + 8 >> 2) + 3] = i.color.a;
	n[r + 24] = i.fit;
	e[r + 28 >> 2] = i.uvOffset.x;
	e[(r + 28 >> 2) + 1] = i.uvOffset.y;
	e[r + 36 >> 2] = i.uvScale.x;
	e[(r + 36 >> 2) + 1] = i.uvScale.y;
	e[r + 44 >> 2] = i.sliceBorder.x;
	e[(r + 44 >> 2) + 1] = i.sliceBorder.y;
	e[(r + 44 >> 2) + 2] = i.sliceBorder.z;
	e[(r + 44 >> 2) + 3] = i.sliceBorder.w;
	e[r + 60 >> 2] = i.tileSize.x;
	e[(r + 60 >> 2) + 1] = i.tileSize.y;
	n[r + 68] = i.fillMethod;
	n[r + 69] = i.fillOrigin;
	e[r + 72 >> 2] = i.fillAmount;
	t[r + 76 >> 2] = i.material;
	n[r + 80] = i.enabled ? 1 : 0;
}
function aa() {
	return {
		visualType: 0,
		texture: 0,
		color: {
			r: 0,
			g: 0,
			b: 0,
			a: 0
		},
		fit: 0,
		uvOffset: {
			x: 0,
			y: 0
		},
		uvScale: {
			x: 0,
			y: 0
		},
		sliceBorder: {
			x: 0,
			y: 0,
			z: 0,
			w: 0
		},
		tileSize: {
			x: 0,
			y: 0
		},
		fillMethod: 0,
		fillOrigin: 0,
		fillAmount: 0,
		material: 0,
		enabled: false
	};
}
function oa(e, t, n, r, i) {
	const a = i.linear;
	a.x = e[r >> 2];
	a.y = e[(r >> 2) + 1];
	a.z = e[(r >> 2) + 2];
	const o = i.angular;
	o.x = e[r + 12 >> 2];
	o.y = e[(r + 12 >> 2) + 1];
	o.z = e[(r + 12 >> 2) + 2];
}
function sa(e, t, n, r, i) {
	e[r >> 2] = i.linear.x;
	e[(r >> 2) + 1] = i.linear.y;
	e[(r >> 2) + 2] = i.linear.z;
	e[r + 12 >> 2] = i.angular.x;
	e[(r + 12 >> 2) + 1] = i.angular.y;
	e[(r + 12 >> 2) + 2] = i.angular.z;
}
function ca() {
	return {
		linear: {
			x: 0,
			y: 0,
			z: 0
		},
		angular: {
			x: 0,
			y: 0,
			z: 0
		}
	};
}
const V = {
	Billboard: {
		fill: hn,
		write: gn,
		create: _n
	},
	BitmapText: {
		fill: vn,
		write: yn,
		create: bn
	},
	BoxCollider2D: {
		fill: xn,
		write: Sn,
		create: Cn
	},
	BoxCollider3D: {
		fill: wn,
		write: Tn,
		create: En
	},
	Camera: {
		fill: Dn,
		write: On,
		create: kn
	},
	Canvas: {
		fill: An,
		write: jn,
		create: Mn
	},
	CapsuleCollider2D: {
		fill: Nn,
		write: Pn,
		create: Fn
	},
	CapsuleCollider3D: {
		fill: In,
		write: Ln,
		create: Rn
	},
	CharacterController3D: {
		fill: zn,
		write: Bn,
		create: Vn
	},
	CircleCollider2D: {
		fill: Hn,
		write: Un,
		create: Wn
	},
	ContentRect: {
		fill: Gn,
		write: Kn,
		create: qn
	},
	ConvexCollider3D: {
		fill: Jn,
		write: Yn,
		create: Xn
	},
	Draggable: {
		fill: Zn,
		write: Qn,
		create: $n
	},
	DragonBonesAnimation: {
		fill: er,
		write: tr,
		create: nr
	},
	FlexContainer: {
		fill: rr,
		write: ir,
		create: ar
	},
	GroupOpacity: {
		fill: or,
		write: sr,
		create: cr
	},
	Impostor: {
		fill: lr,
		write: ur,
		create: dr
	},
	Interactable: {
		fill: fr,
		write: pr,
		create: mr
	},
	LODGroup: {
		fill: hr,
		write: gr,
		create: _r
	},
	Light: {
		fill: vr,
		write: yr,
		create: br
	},
	LightProbeVolume: {
		fill: xr,
		write: Sr,
		create: Cr
	},
	MeshCollider3D: {
		fill: wr,
		write: Tr,
		create: Er
	},
	MeshInstances: {
		fill: Dr,
		write: Or,
		create: kr
	},
	MeshLightmap: {
		fill: Ar,
		write: jr,
		create: Mr
	},
	MeshRenderer: {
		fill: Nr,
		write: Pr,
		create: Fr
	},
	Occluder: {
		fill: Ir,
		write: Lr,
		create: Rr
	},
	ParticleCollider: {
		fill: zr,
		write: Br,
		create: Vr
	},
	ParticleEmitter: {
		fill: Hr,
		write: Ur,
		create: Wr
	},
	ParticleForceField: {
		fill: Gr,
		write: Kr,
		create: qr
	},
	PlanarReflection: {
		fill: Jr,
		write: Yr,
		create: Xr
	},
	ReflectionProbe: {
		fill: Zr,
		write: Qr,
		create: $r
	},
	RigidBody2D: {
		fill: ei,
		write: ti,
		create: ni
	},
	RigidBody3D: {
		fill: ri,
		write: ii,
		create: ai
	},
	SegmentCollider2D: {
		fill: oi,
		write: si,
		create: ci
	},
	ShadowCaster2D: {
		fill: li,
		write: ui,
		create: di
	},
	ShapeRenderer: {
		fill: fi,
		write: pi,
		create: mi
	},
	SortingGroup: {
		fill: hi,
		write: gi,
		create: _i
	},
	SphereCollider3D: {
		fill: vi,
		write: yi,
		create: bi
	},
	SpineAnimation: {
		fill: xi,
		write: Si,
		create: Ci
	},
	SpringBone: {
		fill: wi,
		write: Ti,
		create: Ei
	},
	SpringBoneCollider: {
		fill: Di,
		write: Oi,
		create: ki
	},
	Sprite: {
		fill: Ai,
		write: ji,
		create: Mi
	},
	SpriteMask: {
		fill: Ni,
		write: Pi,
		create: Fi
	},
	TilemapLayer: {
		fill: Ii,
		write: Li,
		create: Ri
	},
	TrailRenderer: {
		fill: zi,
		write: Bi,
		create: Vi
	},
	Transform: {
		fill: Hi,
		write: Ui,
		create: Wi
	},
	UIInteraction: {
		fill: Gi,
		write: Ki,
		create: qi
	},
	UIMask: {
		fill: Ji,
		write: Yi,
		create: Xi
	},
	UINode: {
		fill: Zi,
		write: Qi,
		create: $i
	},
	UIScroll: {
		fill: ea,
		write: ta,
		create: na
	},
	UIVisual: {
		fill: ra,
		write: ia,
		create: aa
	},
	Velocity: {
		fill: oa,
		write: sa,
		create: ca
	}
};
//#endregion
//#region src/ecs/entityOrder.ts
/** Rank for an entity the caller did not order — sorts last, stably. */
const la = Number.MAX_SAFE_INTEGER;
/** Build a stable rank function from an ordered entity list (first = rank 0). */
function ua(e) {
	const t = /* @__PURE__ */ new Map();
	for (const n of e) if (!t.has(n)) t.set(n, t.size);
	return (e) => t.get(e) ?? la;
}
/** Re-insert `map`'s entries in rank order (values untouched). */
function da(e, t) {
	if (e.size <= 1) return;
	const n = Array.from(e);
	n.sort((e, n) => t(e[0]) - t(n[0]));
	e.clear();
	for (const [t, r] of n) e.set(t, r);
}
/** Re-insert `set`'s entities in rank order. */
function fa(e, t) {
	if (e.size <= 1) return;
	const n = Array.from(e);
	n.sort((e, n) => t(e) - t(n));
	e.clear();
	for (const t of n) e.add(t);
}
//#endregion
//#region src/wasm/ptrLayouts.generated.ts
const pa = {
	Billboard: {
		ptrFn: "getBillboardPtr",
		fields: [{
			name: "mode",
			type: "i32",
			offset: 0
		}, {
			name: "enabled",
			type: "bool",
			offset: 4
		}]
	},
	BitmapText: {
		ptrFn: "getBitmapTextPtr",
		fields: [
			{
				name: "color",
				type: "color",
				offset: 12
			},
			{
				name: "fontSize",
				type: "f32",
				offset: 28
			},
			{
				name: "align",
				type: "u8",
				offset: 32
			},
			{
				name: "spacing",
				type: "f32",
				offset: 36
			},
			{
				name: "parallax",
				type: "vec2",
				offset: 40
			},
			{
				name: "layer",
				type: "i32",
				offset: 48
			},
			{
				name: "font",
				type: "u32",
				offset: 52
			},
			{
				name: "enabled",
				type: "bool",
				offset: 56
			}
		]
	},
	BoxCollider2D: {
		ptrFn: "getBoxCollider2DPtr",
		fields: [
			{
				name: "halfExtents",
				type: "vec2",
				offset: 0
			},
			{
				name: "offset",
				type: "vec2",
				offset: 8
			},
			{
				name: "density",
				type: "f32",
				offset: 16
			},
			{
				name: "friction",
				type: "f32",
				offset: 20
			},
			{
				name: "restitution",
				type: "f32",
				offset: 24
			},
			{
				name: "isSensor",
				type: "bool",
				offset: 28
			},
			{
				name: "enabled",
				type: "bool",
				offset: 29
			},
			{
				name: "categoryBits",
				type: "u32",
				offset: 32
			},
			{
				name: "maskBits",
				type: "u32",
				offset: 36
			}
		]
	},
	BoxCollider3D: {
		ptrFn: "getBoxCollider3DPtr",
		fields: [
			{
				name: "halfExtents",
				type: "vec3",
				offset: 0
			},
			{
				name: "center",
				type: "vec3",
				offset: 12
			},
			{
				name: "friction",
				type: "f32",
				offset: 24
			},
			{
				name: "restitution",
				type: "f32",
				offset: 28
			},
			{
				name: "isSensor",
				type: "bool",
				offset: 32
			},
			{
				name: "enabled",
				type: "bool",
				offset: 33
			}
		]
	},
	Camera: {
		ptrFn: "getCameraPtr",
		fields: [
			{
				name: "projectionType",
				type: "u8",
				offset: 0
			},
			{
				name: "fov",
				type: "f32",
				offset: 4
			},
			{
				name: "orthoSize",
				type: "f32",
				offset: 8
			},
			{
				name: "nearPlane",
				type: "f32",
				offset: 12
			},
			{
				name: "farPlane",
				type: "f32",
				offset: 16
			},
			{
				name: "aspectRatio",
				type: "f32",
				offset: 20
			},
			{
				name: "isActive",
				type: "bool",
				offset: 24
			},
			{
				name: "priority",
				type: "i32",
				offset: 28
			},
			{
				name: "viewport",
				type: "vec4",
				offset: 32
			},
			{
				name: "clearFlags",
				type: "u8",
				offset: 48
			},
			{
				name: "pixelPerfect",
				type: "bool",
				offset: 49
			},
			{
				name: "cullingMask",
				type: "u32",
				offset: 52
			},
			{
				name: "renderTarget",
				type: "u32",
				offset: 56
			}
		]
	},
	Canvas: {
		ptrFn: "getCanvasPtr",
		fields: [
			{
				name: "designResolution",
				type: "vec2",
				offset: 0
			},
			{
				name: "pixelsPerUnit",
				type: "f32",
				offset: 8
			},
			{
				name: "scaleMode",
				type: "u8",
				offset: 12
			},
			{
				name: "matchWidthOrHeight",
				type: "f32",
				offset: 16
			},
			{
				name: "backgroundColor",
				type: "color",
				offset: 20
			},
			{
				name: "layer",
				type: "i32",
				offset: 36
			}
		]
	},
	CapsuleCollider2D: {
		ptrFn: "getCapsuleCollider2DPtr",
		fields: [
			{
				name: "radius",
				type: "f32",
				offset: 0
			},
			{
				name: "halfHeight",
				type: "f32",
				offset: 4
			},
			{
				name: "offset",
				type: "vec2",
				offset: 8
			},
			{
				name: "density",
				type: "f32",
				offset: 16
			},
			{
				name: "friction",
				type: "f32",
				offset: 20
			},
			{
				name: "restitution",
				type: "f32",
				offset: 24
			},
			{
				name: "isSensor",
				type: "bool",
				offset: 28
			},
			{
				name: "enabled",
				type: "bool",
				offset: 29
			},
			{
				name: "categoryBits",
				type: "u32",
				offset: 32
			},
			{
				name: "maskBits",
				type: "u32",
				offset: 36
			}
		]
	},
	CapsuleCollider3D: {
		ptrFn: "getCapsuleCollider3DPtr",
		fields: [
			{
				name: "radius",
				type: "f32",
				offset: 0
			},
			{
				name: "halfHeight",
				type: "f32",
				offset: 4
			},
			{
				name: "center",
				type: "vec3",
				offset: 8
			},
			{
				name: "friction",
				type: "f32",
				offset: 20
			},
			{
				name: "restitution",
				type: "f32",
				offset: 24
			},
			{
				name: "isSensor",
				type: "bool",
				offset: 28
			},
			{
				name: "enabled",
				type: "bool",
				offset: 29
			}
		]
	},
	CharacterController3D: {
		ptrFn: "getCharacterController3DPtr",
		fields: [
			{
				name: "velocity",
				type: "vec3",
				offset: 0
			},
			{
				name: "radius",
				type: "f32",
				offset: 12
			},
			{
				name: "halfHeight",
				type: "f32",
				offset: 16
			},
			{
				name: "maxSlope",
				type: "f32",
				offset: 20
			},
			{
				name: "stepHeight",
				type: "f32",
				offset: 24
			},
			{
				name: "snapDown",
				type: "f32",
				offset: 28
			},
			{
				name: "mass",
				type: "f32",
				offset: 32
			},
			{
				name: "pushForce",
				type: "f32",
				offset: 36
			},
			{
				name: "enabled",
				type: "bool",
				offset: 40
			},
			{
				name: "layer",
				type: "u32",
				offset: 44
			},
			{
				name: "isOnFloor",
				type: "bool",
				offset: 48
			},
			{
				name: "floorNormal",
				type: "vec3",
				offset: 52
			},
			{
				name: "realVelocity",
				type: "vec3",
				offset: 64
			}
		]
	},
	CircleCollider2D: {
		ptrFn: "getCircleCollider2DPtr",
		fields: [
			{
				name: "radius",
				type: "f32",
				offset: 0
			},
			{
				name: "offset",
				type: "vec2",
				offset: 4
			},
			{
				name: "density",
				type: "f32",
				offset: 12
			},
			{
				name: "friction",
				type: "f32",
				offset: 16
			},
			{
				name: "restitution",
				type: "f32",
				offset: 20
			},
			{
				name: "isSensor",
				type: "bool",
				offset: 24
			},
			{
				name: "enabled",
				type: "bool",
				offset: 25
			},
			{
				name: "categoryBits",
				type: "u32",
				offset: 28
			},
			{
				name: "maskBits",
				type: "u32",
				offset: 32
			}
		]
	},
	ContentRect: {
		ptrFn: "getContentRectPtr",
		fields: [{
			name: "size",
			type: "vec2",
			offset: 0
		}, {
			name: "pivot",
			type: "vec2",
			offset: 8
		}]
	},
	ConvexCollider3D: {
		ptrFn: "getConvexCollider3DPtr",
		fields: [
			{
				name: "mesh",
				type: "u32",
				offset: 0
			},
			{
				name: "friction",
				type: "f32",
				offset: 4
			},
			{
				name: "restitution",
				type: "f32",
				offset: 8
			},
			{
				name: "isSensor",
				type: "bool",
				offset: 12
			},
			{
				name: "enabled",
				type: "bool",
				offset: 13
			}
		]
	},
	Draggable: {
		ptrFn: "getDraggablePtr",
		fields: [
			{
				name: "enabled",
				type: "bool",
				offset: 0
			},
			{
				name: "dragThreshold",
				type: "f32",
				offset: 4
			},
			{
				name: "lockX",
				type: "bool",
				offset: 8
			},
			{
				name: "lockY",
				type: "bool",
				offset: 9
			},
			{
				name: "constrainMin",
				type: "bool",
				offset: 10
			},
			{
				name: "constraintMin",
				type: "vec2",
				offset: 12
			},
			{
				name: "constrainMax",
				type: "bool",
				offset: 20
			},
			{
				name: "constraintMax",
				type: "vec2",
				offset: 24
			}
		]
	},
	DragonBonesAnimation: {
		ptrFn: "getDragonBonesAnimationPtr",
		fields: [
			{
				name: "timeScale",
				type: "f32",
				offset: 48
			},
			{
				name: "loop",
				type: "bool",
				offset: 52
			},
			{
				name: "playing",
				type: "bool",
				offset: 53
			},
			{
				name: "fadeInTime",
				type: "f32",
				offset: 56
			},
			{
				name: "flipX",
				type: "bool",
				offset: 60
			},
			{
				name: "flipY",
				type: "bool",
				offset: 61
			},
			{
				name: "color",
				type: "color",
				offset: 64
			},
			{
				name: "layer",
				type: "i32",
				offset: 80
			},
			{
				name: "skeletonScale",
				type: "f32",
				offset: 84
			},
			{
				name: "material",
				type: "u32",
				offset: 88
			},
			{
				name: "enabled",
				type: "bool",
				offset: 92
			}
		]
	},
	FlexContainer: {
		ptrFn: "getFlexContainerPtr",
		fields: [
			{
				name: "direction",
				type: "u8",
				offset: 0
			},
			{
				name: "wrap",
				type: "u8",
				offset: 1
			},
			{
				name: "justifyContent",
				type: "u8",
				offset: 2
			},
			{
				name: "alignItems",
				type: "u8",
				offset: 3
			},
			{
				name: "alignContent",
				type: "u8",
				offset: 4
			},
			{
				name: "gap",
				type: "vec2",
				offset: 8
			},
			{
				name: "padding",
				type: "struct",
				offset: 16,
				members: [
					{
						name: "left",
						type: "f32",
						offset: 0
					},
					{
						name: "top",
						type: "f32",
						offset: 4
					},
					{
						name: "right",
						type: "f32",
						offset: 8
					},
					{
						name: "bottom",
						type: "f32",
						offset: 12
					}
				]
			}
		]
	},
	GroupOpacity: {
		ptrFn: "getGroupOpacityPtr",
		fields: [{
			name: "opacity",
			type: "f32",
			offset: 0
		}, {
			name: "enabled",
			type: "bool",
			offset: 4
		}]
	},
	Impostor: {
		ptrFn: "getImpostorPtr",
		fields: [
			{
				name: "screenSize",
				type: "f32",
				offset: 0
			},
			{
				name: "frames",
				type: "i32",
				offset: 4
			},
			{
				name: "resolution",
				type: "i32",
				offset: 8
			},
			{
				name: "enabled",
				type: "bool",
				offset: 12
			}
		]
	},
	Interactable: {
		ptrFn: "getInteractablePtr",
		fields: [
			{
				name: "enabled",
				type: "bool",
				offset: 0
			},
			{
				name: "blockRaycast",
				type: "bool",
				offset: 1
			},
			{
				name: "raycastTarget",
				type: "bool",
				offset: 2
			}
		]
	},
	LODGroup: {
		ptrFn: "getLODGroupPtr",
		fields: [
			{
				name: "lod1",
				type: "u32",
				offset: 0
			},
			{
				name: "lod2",
				type: "u32",
				offset: 4
			},
			{
				name: "lod3",
				type: "u32",
				offset: 8
			},
			{
				name: "lod1Size",
				type: "f32",
				offset: 12
			},
			{
				name: "lod2Size",
				type: "f32",
				offset: 16
			},
			{
				name: "lod3Size",
				type: "f32",
				offset: 20
			},
			{
				name: "cullSize",
				type: "f32",
				offset: 24
			},
			{
				name: "hysteresis",
				type: "f32",
				offset: 28
			},
			{
				name: "enabled",
				type: "bool",
				offset: 32
			}
		]
	},
	Light: {
		ptrFn: "getLightPtr",
		fields: [
			{
				name: "type",
				type: "i32",
				offset: 0
			},
			{
				name: "color",
				type: "color",
				offset: 4
			},
			{
				name: "intensity",
				type: "f32",
				offset: 20
			},
			{
				name: "radius",
				type: "f32",
				offset: 24
			},
			{
				name: "innerRadius",
				type: "f32",
				offset: 28
			},
			{
				name: "falloff",
				type: "f32",
				offset: 32
			},
			{
				name: "inverseSquare",
				type: "bool",
				offset: 36
			},
			{
				name: "shadowStrength",
				type: "f32",
				offset: 40
			},
			{
				name: "layerMin",
				type: "i32",
				offset: 44
			},
			{
				name: "layerMax",
				type: "i32",
				offset: 48
			},
			{
				name: "cookie",
				type: "u32",
				offset: 52
			},
			{
				name: "cookieSize",
				type: "vec2",
				offset: 56
			},
			{
				name: "innerAngle",
				type: "f32",
				offset: 64
			},
			{
				name: "outerAngle",
				type: "f32",
				offset: 68
			},
			{
				name: "shadowSoftness",
				type: "f32",
				offset: 72
			},
			{
				name: "sourceAngle",
				type: "f32",
				offset: 76
			},
			{
				name: "shadowDistance",
				type: "f32",
				offset: 80
			},
			{
				name: "meshShadows",
				type: "bool",
				offset: 84
			},
			{
				name: "shadowExtent",
				type: "f32",
				offset: 88
			},
			{
				name: "followEnvironmentSun",
				type: "bool",
				offset: 92
			},
			{
				name: "aimFollowedSun",
				type: "bool",
				offset: 93
			},
			{
				name: "environment",
				type: "u32",
				offset: 96
			},
			{
				name: "environmentRotation",
				type: "f32",
				offset: 100
			},
			{
				name: "drawEnvironment",
				type: "bool",
				offset: 104
			},
			{
				name: "reflectionScale",
				type: "f32",
				offset: 108
			},
			{
				name: "reflectionSaturation",
				type: "f32",
				offset: 112
			},
			{
				name: "bakedTint",
				type: "color",
				offset: 116
			},
			{
				name: "hemisphere",
				type: "bool",
				offset: 132
			},
			{
				name: "groundColor",
				type: "color",
				offset: 136
			},
			{
				name: "enabled",
				type: "bool",
				offset: 152
			}
		]
	},
	LightProbeVolume: {
		ptrFn: "getLightProbeVolumePtr",
		fields: [
			{
				name: "probes",
				type: "u32",
				offset: 0
			},
			{
				name: "capture",
				type: "bool",
				offset: 4
			},
			{
				name: "captureInterval",
				type: "f32",
				offset: 8
			},
			{
				name: "halfExtents",
				type: "vec3",
				offset: 12
			},
			{
				name: "spacing",
				type: "f32",
				offset: 24
			},
			{
				name: "enabled",
				type: "bool",
				offset: 28
			}
		]
	},
	MeshCollider3D: {
		ptrFn: "getMeshCollider3DPtr",
		fields: [
			{
				name: "mesh",
				type: "u32",
				offset: 0
			},
			{
				name: "friction",
				type: "f32",
				offset: 4
			},
			{
				name: "restitution",
				type: "f32",
				offset: 8
			},
			{
				name: "layer",
				type: "u32",
				offset: 12
			},
			{
				name: "enabled",
				type: "bool",
				offset: 16
			}
		]
	},
	MeshInstances: {
		ptrFn: "getMeshInstancesPtr",
		fields: [
			{
				name: "lod1Mesh",
				type: "u32",
				offset: 0
			},
			{
				name: "lodDistance",
				type: "f32",
				offset: 4
			},
			{
				name: "minDistance",
				type: "f32",
				offset: 8
			},
			{
				name: "drawDistance",
				type: "f32",
				offset: 12
			},
			{
				name: "shadowDistance",
				type: "f32",
				offset: 16
			}
		]
	},
	MeshLightmap: {
		ptrFn: "getMeshLightmapPtr",
		fields: [{
			name: "lightmap",
			type: "u32",
			offset: 0
		}, {
			name: "scaleOffset",
			type: "vec4",
			offset: 4
		}]
	},
	MeshRenderer: {
		ptrFn: "getMeshRendererPtr",
		fields: [
			{
				name: "texture",
				type: "u32",
				offset: 0
			},
			{
				name: "normalMap",
				type: "u32",
				offset: 4
			},
			{
				name: "color",
				type: "color",
				offset: 8
			},
			{
				name: "layer",
				type: "i32",
				offset: 24
			},
			{
				name: "opaque",
				type: "bool",
				offset: 28
			},
			{
				name: "cullBackfaces",
				type: "bool",
				offset: 29
			},
			{
				name: "lit",
				type: "bool",
				offset: 30
			},
			{
				name: "castShadows",
				type: "bool",
				offset: 31
			},
			{
				name: "parallax",
				type: "vec2",
				offset: 32
			},
			{
				name: "material",
				type: "u32",
				offset: 40
			},
			{
				name: "enabled",
				type: "bool",
				offset: 44
			},
			{
				name: "mesh",
				type: "u32",
				offset: 48
			}
		]
	},
	Occluder: {
		ptrFn: "getOccluderPtr",
		fields: [{
			name: "halfExtents",
			type: "vec3",
			offset: 0
		}, {
			name: "enabled",
			type: "bool",
			offset: 12
		}]
	},
	ParticleCollider: {
		ptrFn: "getParticleColliderPtr",
		fields: [
			{
				name: "shape",
				type: "i32",
				offset: 0
			},
			{
				name: "radius",
				type: "f32",
				offset: 4
			},
			{
				name: "halfHeight",
				type: "f32",
				offset: 8
			},
			{
				name: "halfExtents",
				type: "vec3",
				offset: 12
			},
			{
				name: "inverted",
				type: "bool",
				offset: 24
			},
			{
				name: "mask",
				type: "u32",
				offset: 28
			},
			{
				name: "enabled",
				type: "bool",
				offset: 32
			}
		]
	},
	ParticleEmitter: {
		ptrFn: "getParticleEmitterPtr",
		fields: [
			{
				name: "rate",
				type: "f32",
				offset: 0
			},
			{
				name: "burstCount",
				type: "i32",
				offset: 4
			},
			{
				name: "burstInterval",
				type: "f32",
				offset: 8
			},
			{
				name: "duration",
				type: "f32",
				offset: 12
			},
			{
				name: "simulationSpeed",
				type: "f32",
				offset: 16
			},
			{
				name: "startDelay",
				type: "f32",
				offset: 20
			},
			{
				name: "looping",
				type: "bool",
				offset: 24
			},
			{
				name: "playOnStart",
				type: "bool",
				offset: 25
			},
			{
				name: "maxParticles",
				type: "i32",
				offset: 28
			},
			{
				name: "gpuSimulation",
				type: "bool",
				offset: 32
			},
			{
				name: "lifetimeMin",
				type: "f32",
				offset: 36
			},
			{
				name: "lifetimeMax",
				type: "f32",
				offset: 40
			},
			{
				name: "shape",
				type: "i32",
				offset: 44
			},
			{
				name: "shapeRadius",
				type: "f32",
				offset: 48
			},
			{
				name: "shapeSize",
				type: "vec3",
				offset: 52
			},
			{
				name: "shapeAngle",
				type: "f32",
				offset: 64
			},
			{
				name: "speedMin",
				type: "f32",
				offset: 68
			},
			{
				name: "speedMax",
				type: "f32",
				offset: 72
			},
			{
				name: "angleSpreadMin",
				type: "f32",
				offset: 76
			},
			{
				name: "angleSpreadMax",
				type: "f32",
				offset: 80
			},
			{
				name: "startSizeMin",
				type: "f32",
				offset: 84
			},
			{
				name: "startSizeMax",
				type: "f32",
				offset: 88
			},
			{
				name: "endSizeMin",
				type: "f32",
				offset: 92
			},
			{
				name: "endSizeMax",
				type: "f32",
				offset: 96
			},
			{
				name: "sizeEasing",
				type: "i32",
				offset: 100
			},
			{
				name: "startColor",
				type: "color",
				offset: 104
			},
			{
				name: "endColor",
				type: "color",
				offset: 120
			},
			{
				name: "colorEasing",
				type: "i32",
				offset: 136
			},
			{
				name: "rotationMin",
				type: "f32",
				offset: 140
			},
			{
				name: "rotationMax",
				type: "f32",
				offset: 144
			},
			{
				name: "angularVelocityMin",
				type: "f32",
				offset: 148
			},
			{
				name: "angularVelocityMax",
				type: "f32",
				offset: 152
			},
			{
				name: "gravity",
				type: "vec3",
				offset: 156
			},
			{
				name: "damping",
				type: "f32",
				offset: 168
			},
			{
				name: "addedVelocityMin",
				type: "vec3",
				offset: 172
			},
			{
				name: "addedVelocityMax",
				type: "vec3",
				offset: 184
			},
			{
				name: "speedLimit",
				type: "f32",
				offset: 196
			},
			{
				name: "limitDampen",
				type: "f32",
				offset: 200
			},
			{
				name: "noiseStrength",
				type: "f32",
				offset: 204
			},
			{
				name: "noiseFrequency",
				type: "f32",
				offset: 208
			},
			{
				name: "noiseScrollSpeed",
				type: "f32",
				offset: 212
			},
			{
				name: "noiseOctaves",
				type: "i32",
				offset: 216
			},
			{
				name: "texture",
				type: "u32",
				offset: 220
			},
			{
				name: "spriteColumns",
				type: "i32",
				offset: 224
			},
			{
				name: "spriteRows",
				type: "i32",
				offset: 228
			},
			{
				name: "spriteFPS",
				type: "f32",
				offset: 232
			},
			{
				name: "spriteLoop",
				type: "bool",
				offset: 236
			},
			{
				name: "blendMode",
				type: "i32",
				offset: 240
			},
			{
				name: "layer",
				type: "i32",
				offset: 244
			},
			{
				name: "material",
				type: "u32",
				offset: 248
			},
			{
				name: "simulationSpace",
				type: "i32",
				offset: 252
			},
			{
				name: "renderMode",
				type: "i32",
				offset: 256
			},
			{
				name: "velocityScale",
				type: "f32",
				offset: 260
			},
			{
				name: "lengthScale",
				type: "f32",
				offset: 264
			},
			{
				name: "enabled",
				type: "bool",
				offset: 268
			},
			{
				name: "subEmitterTrigger",
				type: "i32",
				offset: 272
			},
			{
				name: "subEmitterChance",
				type: "f32",
				offset: 276
			},
			{
				name: "subEmitterInheritVelocity",
				type: "f32",
				offset: 280
			},
			{
				name: "subEmitter",
				type: "u32",
				offset: 284
			},
			{
				name: "trailEnabled",
				type: "bool",
				offset: 288
			},
			{
				name: "trailWidth",
				type: "f32",
				offset: 292
			},
			{
				name: "trailPoints",
				type: "i32",
				offset: 296
			},
			{
				name: "trailMinDistance",
				type: "f32",
				offset: 300
			},
			{
				name: "collisionEnabled",
				type: "bool",
				offset: 304
			},
			{
				name: "collisionFloor",
				type: "f32",
				offset: 308
			},
			{
				name: "collisionMode",
				type: "i32",
				offset: 312
			},
			{
				name: "collisionMask",
				type: "u32",
				offset: 316
			},
			{
				name: "collisionQueryBudget",
				type: "i32",
				offset: 320
			},
			{
				name: "collisionMaxDistance",
				type: "f32",
				offset: 324
			},
			{
				name: "collisionFallback",
				type: "i32",
				offset: 328
			},
			{
				name: "collisionEvents",
				type: "bool",
				offset: 332
			},
			{
				name: "collisionEventBudget",
				type: "i32",
				offset: 336
			},
			{
				name: "collisionThickness",
				type: "f32",
				offset: 340
			},
			{
				name: "collisionBounce",
				type: "f32",
				offset: 344
			},
			{
				name: "collisionFriction",
				type: "f32",
				offset: 348
			},
			{
				name: "collisionLifetimeLoss",
				type: "f32",
				offset: 352
			}
		]
	},
	ParticleForceField: {
		ptrFn: "getParticleForceFieldPtr",
		fields: [
			{
				name: "type",
				type: "i32",
				offset: 0
			},
			{
				name: "strength",
				type: "f32",
				offset: 4
			},
			{
				name: "radius",
				type: "f32",
				offset: 8
			},
			{
				name: "direction",
				type: "vec3",
				offset: 12
			},
			{
				name: "falloff",
				type: "bool",
				offset: 24
			},
			{
				name: "enabled",
				type: "bool",
				offset: 25
			}
		]
	},
	PlanarReflection: {
		ptrFn: "getPlanarReflectionPtr",
		fields: [
			{
				name: "axis",
				type: "u8",
				offset: 0
			},
			{
				name: "clipOffset",
				type: "f32",
				offset: 4
			},
			{
				name: "cullingMask",
				type: "u32",
				offset: 8
			},
			{
				name: "quality",
				type: "u8",
				offset: 12
			},
			{
				name: "resolutionScale",
				type: "f32",
				offset: 16
			},
			{
				name: "maxSize",
				type: "u32",
				offset: 20
			},
			{
				name: "update",
				type: "u8",
				offset: 24
			},
			{
				name: "updatesPerSecond",
				type: "f32",
				offset: 28
			},
			{
				name: "revision",
				type: "u32",
				offset: 32
			},
			{
				name: "enabled",
				type: "bool",
				offset: 36
			}
		]
	},
	ReflectionProbe: {
		ptrFn: "getReflectionProbePtr",
		fields: [
			{
				name: "reflection",
				type: "u32",
				offset: 0
			},
			{
				name: "halfExtents",
				type: "vec3",
				offset: 4
			},
			{
				name: "slot",
				type: "u32",
				offset: 16
			},
			{
				name: "enabled",
				type: "bool",
				offset: 20
			}
		]
	},
	RigidBody2D: {
		ptrFn: "getRigidBody2DPtr",
		fields: [
			{
				name: "bodyType",
				type: "u8",
				offset: 0
			},
			{
				name: "gravityScale",
				type: "f32",
				offset: 4
			},
			{
				name: "linearDamping",
				type: "f32",
				offset: 8
			},
			{
				name: "angularDamping",
				type: "f32",
				offset: 12
			},
			{
				name: "fixedRotation",
				type: "bool",
				offset: 16
			},
			{
				name: "bullet",
				type: "bool",
				offset: 17
			},
			{
				name: "enabled",
				type: "bool",
				offset: 18
			}
		]
	},
	RigidBody3D: {
		ptrFn: "getRigidBody3DPtr",
		fields: [
			{
				name: "bodyType",
				type: "u8",
				offset: 0
			},
			{
				name: "gravityScale",
				type: "f32",
				offset: 4
			},
			{
				name: "linearDamping",
				type: "f32",
				offset: 8
			},
			{
				name: "angularDamping",
				type: "f32",
				offset: 12
			},
			{
				name: "fixedRotation",
				type: "bool",
				offset: 16
			},
			{
				name: "layer",
				type: "u32",
				offset: 20
			},
			{
				name: "continuousCollision",
				type: "bool",
				offset: 24
			},
			{
				name: "enabled",
				type: "bool",
				offset: 25
			}
		]
	},
	SegmentCollider2D: {
		ptrFn: "getSegmentCollider2DPtr",
		fields: [
			{
				name: "point1",
				type: "vec2",
				offset: 0
			},
			{
				name: "point2",
				type: "vec2",
				offset: 8
			},
			{
				name: "density",
				type: "f32",
				offset: 16
			},
			{
				name: "friction",
				type: "f32",
				offset: 20
			},
			{
				name: "restitution",
				type: "f32",
				offset: 24
			},
			{
				name: "isSensor",
				type: "bool",
				offset: 28
			},
			{
				name: "enabled",
				type: "bool",
				offset: 29
			},
			{
				name: "categoryBits",
				type: "u32",
				offset: 32
			},
			{
				name: "maskBits",
				type: "u32",
				offset: 36
			}
		]
	},
	ShadowCaster2D: {
		ptrFn: "getShadowCaster2DPtr",
		fields: [{
			name: "size",
			type: "vec2",
			offset: 0
		}, {
			name: "enabled",
			type: "bool",
			offset: 20
		}]
	},
	ShapeRenderer: {
		ptrFn: "getShapeRendererPtr",
		fields: [
			{
				name: "shapeType",
				type: "u8",
				offset: 0
			},
			{
				name: "color",
				type: "color",
				offset: 4
			},
			{
				name: "size",
				type: "vec2",
				offset: 20
			},
			{
				name: "cornerRadius",
				type: "f32",
				offset: 28
			},
			{
				name: "layer",
				type: "i32",
				offset: 32
			},
			{
				name: "parallax",
				type: "vec2",
				offset: 36
			},
			{
				name: "enabled",
				type: "bool",
				offset: 44
			}
		]
	},
	SortingGroup: {
		ptrFn: "getSortingGroupPtr",
		fields: [
			{
				name: "layer",
				type: "i32",
				offset: 0
			},
			{
				name: "order",
				type: "i32",
				offset: 4
			},
			{
				name: "enabled",
				type: "bool",
				offset: 8
			}
		]
	},
	SphereCollider3D: {
		ptrFn: "getSphereCollider3DPtr",
		fields: [
			{
				name: "radius",
				type: "f32",
				offset: 0
			},
			{
				name: "center",
				type: "vec3",
				offset: 4
			},
			{
				name: "friction",
				type: "f32",
				offset: 16
			},
			{
				name: "restitution",
				type: "f32",
				offset: 20
			},
			{
				name: "isSensor",
				type: "bool",
				offset: 24
			},
			{
				name: "enabled",
				type: "bool",
				offset: 25
			}
		]
	},
	SpineAnimation: {
		ptrFn: "getSpineAnimationPtr",
		fields: [
			{
				name: "timeScale",
				type: "f32",
				offset: 48
			},
			{
				name: "loop",
				type: "bool",
				offset: 52
			},
			{
				name: "playing",
				type: "bool",
				offset: 53
			},
			{
				name: "flipX",
				type: "bool",
				offset: 54
			},
			{
				name: "flipY",
				type: "bool",
				offset: 55
			},
			{
				name: "color",
				type: "color",
				offset: 56
			},
			{
				name: "layer",
				type: "i32",
				offset: 72
			},
			{
				name: "skeletonScale",
				type: "f32",
				offset: 76
			},
			{
				name: "material",
				type: "u32",
				offset: 80
			},
			{
				name: "enabled",
				type: "bool",
				offset: 84
			}
		]
	},
	SpringBone: {
		ptrFn: "getSpringBonePtr",
		fields: [
			{
				name: "enabled",
				type: "bool",
				offset: 0
			},
			{
				name: "stiffness",
				type: "f32",
				offset: 4
			},
			{
				name: "drag",
				type: "f32",
				offset: 8
			},
			{
				name: "gravity",
				type: "vec3",
				offset: 12
			},
			{
				name: "wind",
				type: "vec3",
				offset: 24
			},
			{
				name: "windGust",
				type: "f32",
				offset: 36
			},
			{
				name: "windFrequency",
				type: "f32",
				offset: 40
			},
			{
				name: "endLength",
				type: "f32",
				offset: 44
			},
			{
				name: "radius",
				type: "f32",
				offset: 48
			},
			{
				name: "weight",
				type: "f32",
				offset: 52
			}
		]
	},
	SpringBoneCollider: {
		ptrFn: "getSpringBoneColliderPtr",
		fields: [
			{
				name: "shape",
				type: "u8",
				offset: 0
			},
			{
				name: "radius",
				type: "f32",
				offset: 4
			},
			{
				name: "height",
				type: "f32",
				offset: 8
			},
			{
				name: "offset",
				type: "vec3",
				offset: 12
			}
		]
	},
	Sprite: {
		ptrFn: "getSpritePtr",
		fields: [
			{
				name: "texture",
				type: "u32",
				offset: 0
			},
			{
				name: "color",
				type: "color",
				offset: 4
			},
			{
				name: "size",
				type: "vec2",
				offset: 20
			},
			{
				name: "pivot",
				type: "vec2",
				offset: 28
			},
			{
				name: "uvOffset",
				type: "vec2",
				offset: 36
			},
			{
				name: "uvScale",
				type: "vec2",
				offset: 44
			},
			{
				name: "layer",
				type: "i32",
				offset: 52
			},
			{
				name: "order",
				type: "i32",
				offset: 56
			},
			{
				name: "maskInteraction",
				type: "i32",
				offset: 60
			},
			{
				name: "lit",
				type: "bool",
				offset: 64
			},
			{
				name: "flipX",
				type: "bool",
				offset: 65
			},
			{
				name: "flipY",
				type: "bool",
				offset: 66
			},
			{
				name: "drawMode",
				type: "u8",
				offset: 67
			},
			{
				name: "tileSize",
				type: "vec2",
				offset: 68
			},
			{
				name: "tileSpacing",
				type: "vec2",
				offset: 76
			},
			{
				name: "parallax",
				type: "vec2",
				offset: 84
			},
			{
				name: "material",
				type: "u32",
				offset: 92
			},
			{
				name: "enabled",
				type: "bool",
				offset: 96
			}
		]
	},
	SpriteMask: {
		ptrFn: "getSpriteMaskPtr",
		fields: [
			{
				name: "alphaCutoff",
				type: "f32",
				offset: 0
			},
			{
				name: "limitRange",
				type: "bool",
				offset: 4
			},
			{
				name: "rangeEndLayer",
				type: "i32",
				offset: 8
			},
			{
				name: "rangeEndOrder",
				type: "i32",
				offset: 12
			},
			{
				name: "enabled",
				type: "bool",
				offset: 16
			}
		]
	},
	TilemapLayer: {
		ptrFn: "getTilemapLayerPtr",
		fields: [
			{
				name: "cellSize",
				type: "vec2",
				offset: 0
			},
			{
				name: "orientation",
				type: "u8",
				offset: 8
			},
			{
				name: "hexSideLength",
				type: "f32",
				offset: 12
			},
			{
				name: "staggerAxis",
				type: "u8",
				offset: 16
			},
			{
				name: "staggerIndex",
				type: "u8",
				offset: 17
			},
			{
				name: "originOffset",
				type: "vec2",
				offset: 20
			},
			{
				name: "tileset",
				type: "u32",
				offset: 28
			},
			{
				name: "tilesetColumns",
				type: "i32",
				offset: 32
			},
			{
				name: "renderLayer",
				type: "i32",
				offset: 36
			},
			{
				name: "tintColor",
				type: "color",
				offset: 40
			},
			{
				name: "opacity",
				type: "f32",
				offset: 56
			},
			{
				name: "parallaxFactor",
				type: "vec2",
				offset: 60
			},
			{
				name: "visible",
				type: "bool",
				offset: 68
			},
			{
				name: "lit",
				type: "bool",
				offset: 69
			}
		]
	},
	TrailRenderer: {
		ptrFn: "getTrailRendererPtr",
		fields: [
			{
				name: "time",
				type: "f32",
				offset: 0
			},
			{
				name: "minVertexDistance",
				type: "f32",
				offset: 4
			},
			{
				name: "emitting",
				type: "bool",
				offset: 8
			},
			{
				name: "startWidth",
				type: "f32",
				offset: 12
			},
			{
				name: "endWidth",
				type: "f32",
				offset: 16
			},
			{
				name: "startColor",
				type: "color",
				offset: 20
			},
			{
				name: "endColor",
				type: "color",
				offset: 36
			},
			{
				name: "texture",
				type: "u32",
				offset: 52
			},
			{
				name: "blendMode",
				type: "i32",
				offset: 56
			},
			{
				name: "layer",
				type: "i32",
				offset: 60
			},
			{
				name: "material",
				type: "u32",
				offset: 64
			},
			{
				name: "enabled",
				type: "bool",
				offset: 68
			}
		]
	},
	Transform: {
		ptrFn: "getTransformPtr",
		fields: [
			{
				name: "position",
				type: "vec3",
				offset: 0
			},
			{
				name: "rotation",
				type: "quat",
				offset: 12
			},
			{
				name: "scale",
				type: "vec3",
				offset: 28
			},
			{
				name: "worldPosition",
				type: "vec3",
				offset: 40
			},
			{
				name: "worldRotation",
				type: "quat",
				offset: 52
			},
			{
				name: "worldScale",
				type: "vec3",
				offset: 68
			}
		]
	},
	UIInteraction: {
		ptrFn: "getUIInteractionPtr",
		fields: [
			{
				name: "hovered",
				type: "bool",
				offset: 0
			},
			{
				name: "pressed",
				type: "bool",
				offset: 1
			},
			{
				name: "justPressed",
				type: "bool",
				offset: 2
			},
			{
				name: "justReleased",
				type: "bool",
				offset: 3
			}
		]
	},
	UIMask: {
		ptrFn: "getUIMaskPtr",
		fields: [
			{
				name: "enabled",
				type: "bool",
				offset: 0
			},
			{
				name: "mode",
				type: "u8",
				offset: 1
			},
			{
				name: "alphaCutoff",
				type: "f32",
				offset: 4
			}
		]
	},
	UINode: {
		ptrFn: "getUINodePtr",
		fields: [
			{
				name: "position",
				type: "u8",
				offset: 0
			},
			{
				name: "display",
				type: "u8",
				offset: 1
			},
			{
				name: "opacity",
				type: "f32",
				offset: 4
			},
			{
				name: "pointerEvents",
				type: "u8",
				offset: 8
			},
			{
				name: "width",
				type: "struct",
				offset: 12,
				members: [{
					name: "value",
					type: "f32",
					offset: 0
				}, {
					name: "unit",
					type: "u8",
					offset: 4
				}]
			},
			{
				name: "height",
				type: "struct",
				offset: 20,
				members: [{
					name: "value",
					type: "f32",
					offset: 0
				}, {
					name: "unit",
					type: "u8",
					offset: 4
				}]
			},
			{
				name: "minWidth",
				type: "struct",
				offset: 28,
				members: [{
					name: "value",
					type: "f32",
					offset: 0
				}, {
					name: "unit",
					type: "u8",
					offset: 4
				}]
			},
			{
				name: "minHeight",
				type: "struct",
				offset: 36,
				members: [{
					name: "value",
					type: "f32",
					offset: 0
				}, {
					name: "unit",
					type: "u8",
					offset: 4
				}]
			},
			{
				name: "maxWidth",
				type: "struct",
				offset: 44,
				members: [{
					name: "value",
					type: "f32",
					offset: 0
				}, {
					name: "unit",
					type: "u8",
					offset: 4
				}]
			},
			{
				name: "maxHeight",
				type: "struct",
				offset: 52,
				members: [{
					name: "value",
					type: "f32",
					offset: 0
				}, {
					name: "unit",
					type: "u8",
					offset: 4
				}]
			},
			{
				name: "flexGrow",
				type: "f32",
				offset: 60
			},
			{
				name: "flexShrink",
				type: "f32",
				offset: 64
			},
			{
				name: "flexBasis",
				type: "struct",
				offset: 68,
				members: [{
					name: "value",
					type: "f32",
					offset: 0
				}, {
					name: "unit",
					type: "u8",
					offset: 4
				}]
			},
			{
				name: "alignSelf",
				type: "u8",
				offset: 76
			},
			{
				name: "marginLeft",
				type: "struct",
				offset: 80,
				members: [{
					name: "value",
					type: "f32",
					offset: 0
				}, {
					name: "unit",
					type: "u8",
					offset: 4
				}]
			},
			{
				name: "marginTop",
				type: "struct",
				offset: 88,
				members: [{
					name: "value",
					type: "f32",
					offset: 0
				}, {
					name: "unit",
					type: "u8",
					offset: 4
				}]
			},
			{
				name: "marginRight",
				type: "struct",
				offset: 96,
				members: [{
					name: "value",
					type: "f32",
					offset: 0
				}, {
					name: "unit",
					type: "u8",
					offset: 4
				}]
			},
			{
				name: "marginBottom",
				type: "struct",
				offset: 104,
				members: [{
					name: "value",
					type: "f32",
					offset: 0
				}, {
					name: "unit",
					type: "u8",
					offset: 4
				}]
			},
			{
				name: "insetLeft",
				type: "struct",
				offset: 112,
				members: [{
					name: "value",
					type: "f32",
					offset: 0
				}, {
					name: "unit",
					type: "u8",
					offset: 4
				}]
			},
			{
				name: "insetTop",
				type: "struct",
				offset: 120,
				members: [{
					name: "value",
					type: "f32",
					offset: 0
				}, {
					name: "unit",
					type: "u8",
					offset: 4
				}]
			},
			{
				name: "insetRight",
				type: "struct",
				offset: 128,
				members: [{
					name: "value",
					type: "f32",
					offset: 0
				}, {
					name: "unit",
					type: "u8",
					offset: 4
				}]
			},
			{
				name: "insetBottom",
				type: "struct",
				offset: 136,
				members: [{
					name: "value",
					type: "f32",
					offset: 0
				}, {
					name: "unit",
					type: "u8",
					offset: 4
				}]
			}
		]
	},
	UIScroll: {
		ptrFn: "getUIScrollPtr",
		fields: [
			{
				name: "enabled",
				type: "bool",
				offset: 0
			},
			{
				name: "content",
				type: "u32",
				offset: 4
			},
			{
				name: "horizontal",
				type: "bool",
				offset: 8
			},
			{
				name: "vertical",
				type: "bool",
				offset: 9
			},
			{
				name: "movement",
				type: "u8",
				offset: 10
			},
			{
				name: "wheelSpeed",
				type: "f32",
				offset: 12
			},
			{
				name: "dragScroll",
				type: "bool",
				offset: 16
			},
			{
				name: "decelerationRate",
				type: "f32",
				offset: 20
			}
		]
	},
	UIVisual: {
		ptrFn: "getUIVisualPtr",
		fields: [
			{
				name: "visualType",
				type: "u8",
				offset: 0
			},
			{
				name: "texture",
				type: "u32",
				offset: 4
			},
			{
				name: "color",
				type: "color",
				offset: 8
			},
			{
				name: "fit",
				type: "u8",
				offset: 24
			},
			{
				name: "uvOffset",
				type: "vec2",
				offset: 28
			},
			{
				name: "uvScale",
				type: "vec2",
				offset: 36
			},
			{
				name: "sliceBorder",
				type: "vec4",
				offset: 44
			},
			{
				name: "tileSize",
				type: "vec2",
				offset: 60
			},
			{
				name: "fillMethod",
				type: "u8",
				offset: 68
			},
			{
				name: "fillOrigin",
				type: "u8",
				offset: 69
			},
			{
				name: "fillAmount",
				type: "f32",
				offset: 72
			},
			{
				name: "material",
				type: "u32",
				offset: 76
			},
			{
				name: "enabled",
				type: "bool",
				offset: 80
			}
		]
	},
	Velocity: {
		ptrFn: "getVelocityPtr",
		fields: [{
			name: "linear",
			type: "vec3",
			offset: 0
		}, {
			name: "angular",
			type: "vec3",
			offset: 12
		}]
	}
};
//#endregion
//#region src/ecs/bridge/memoryProvider.ts
/**
* Resolve the wasm-exported pointer function for `cppName` — `(entity) => byte
* offset of that entity's component in the wasm heap`, or null if the module lacks
* the export or the component has no layout. Shared by WasmMemoryProvider and the
* bridge's (web-only) resolvePtrFn.
*/
function ma(e, t, n) {
	const r = pa[n];
	if (!r || !e || !t) return null;
	const i = e[r.ptrFn];
	if (!i) return null;
	return (e) => i(t, e);
}
/**
* Web/emscripten backend: the whole wasm HEAP, indexed by a per-entity byte
* offset. Behaviourally identical to the pre-abstraction inline path — same
* ptr function, same `mod.HEAP*` views, same "skip when ptr is 0".
*/
var ha = class {
	constructor(e, t) {
		this.module = e;
		this.cppRegistry = t;
	}
	resolveComponentHeap(e) {
		const t = ma(this.module, this.cppRegistry, e);
		if (!t) return null;
		const n = this.module;
		return (e, r) => {
			const i = t(e);
			if (!i) return false;
			r.f32 = n.HEAPF32;
			r.u32 = n.HEAPU32;
			r.u8 = n.HEAPU8;
			r.ptr = i;
			return true;
		};
	}
};
/**
* Native (embedded-Dawn) backend: each component is reached through the host's
* generated `es_<Component>_buffer(entity)` binding, which hands back a zero-copy
* ArrayBuffer over that entity's native component. The accessors then write it at
* offset 0. `scope` is where those globals live (the QuickJS global object on a
* device; a plain object in tests).
*
* The buffer is re-fetched on every access on purpose: a SparseSet growth moves
* the dense array, invalidating any previously handed-out ArrayBuffer.
*/
var ga = class {
	constructor(e = globalThis) {
		this.scope = e;
	}
	resolveComponentHeap(e) {
		const t = this.scope[`es_${e}_buffer`];
		if (typeof t !== "function") return null;
		return (e, n) => {
			const r = t(e);
			if (!r) return false;
			const i = Math.floor(r.byteLength / 4);
			n.f32 = new Float32Array(r, 0, i);
			n.u32 = new Uint32Array(r, 0, i);
			n.u8 = new Uint8Array(r);
			n.ptr = 0;
			return true;
		};
	}
};
//#endregion
//#region src/ecs/bridge/BuiltinBridge.ts
/**
* Rewrite color-typed fields from the WASM {x,y,z,w} shape into the SDK
* {r,g,b,a} shape. The outer object comes fresh from embind on every
* Registry method call and has no outside aliases, so we mutate it in
* place; the inner color objects are likewise fresh. Setting r/g/b/a
* on the same object leaves ghost x/y/z/w properties, but consumers
* only read r/g/b/a — net zero allocations per get().
*/
function _a(e, t) {
	if (t.length === 0) return e;
	for (const n of t) {
		const t = e[n];
		if (t && typeof t === "object") {
			t.r = t.x;
			t.g = t.y;
			t.b = t.z;
			t.a = t.w;
		}
	}
	return e;
}
/**
* The SDK's {r,g,b,a} colour fields in the WASM {x,y,z,w} shape, as a new object:
* @p obj is left as it was. It can be a Mut row, which the game still holds and
* which is written back more than once; rewritten in place, its colour had no `r`
* the second time and every channel crossed as NaN (issue #107).
*/
function H(e, t) {
	if (t.length === 0) return e;
	const n = { ...e };
	for (const r of t) {
		const t = e[r];
		if (t && typeof t === "object") n[r] = {
			x: t.r,
			y: t.g,
			z: t.b,
			w: t.a
		};
	}
	return n;
}
/**
* Replace a LIST of entities with the vector embind expects, returning the ones
* created so the caller can free them — an embind vector is a heap object.
* The boundary the colours above cross: a JS array is what a document stores,
* `std::vector<Entity>` is what the component holds.
*/
function va(e, t, n) {
	const r = [];
	if (!n?.VectorEntity) return r;
	for (const i of t) {
		const t = e[i];
		if (!Array.isArray(t)) continue;
		const a = new n.VectorEntity();
		for (const e of t) a.push_back(Number(e) >>> 0);
		e[i] = a;
		r.push(a);
	}
	return r;
}
/**
* Replace a list of NUMBERS with the vector embind expects, returning the ones
* created so the caller can free them. The same boundary
* {@link materializeEntityVectors} crosses, for values rather than references.
*/
function ya(e, t, n) {
	const r = [];
	if (!n?.VectorFloat) return r;
	for (const i of t) {
		const t = e[i];
		if (!Array.isArray(t)) continue;
		const a = new n.VectorFloat();
		for (const e of t) a.push_back(Number(e));
		e[i] = a;
		r.push(a);
	}
	return r;
}
/**
* Which of a builtin's fields hold a list of numbers. Read off the generated
* metadata rather than carried on the component definition: that definition is
* a public type, and how a field crosses THIS boundary is not part of it.
*/
function U(e) {
	return h[e]?.numberListFields ?? [];
}
/**
* A component's list fields — numbers or entities — as JS arrays, the embind
* vectors freed; a non-vector field is left as it is. Here and not at the caller:
* a vector leaks unless freed, and only some emsdk versions make it iterable.
*/
function ba(e, t) {
	for (const n of t) {
		const t = e[n];
		if (!t || typeof t.size !== "function") continue;
		const r = [];
		for (let e = 0; e < t.size(); e++) r.push(t.get(e));
		e[n] = r;
		t.delete();
	}
	return e;
}
/** A builtin as embind hands it back, made into what the rest of the SDK reads:
*  its lists as arrays (the vectors freed) and its colours converted. */
function W(e, t) {
	return _a(ba(e, [...U(t._cppName), ...t.entityFields]), t.colorKeys);
}
function xa(e) {
	switch (e) {
		case "f32":
		case "i32":
		case "u32": return 4;
		case "bool":
		case "u8": return 1;
		case "vec2": return 8;
		case "vec3": return 12;
		case "vec4":
		case "quat":
		case "color": return 16;
	}
}
function Sa(e, t, n) {
	if (t < 0 || t + n > e) throw new RangeError(`WASM pointer field access out of bounds: offset ${String(t)} + size ${String(n)} exceeds heap byteLength ${String(e)} (typed-array detached, or C++ returned a stale pointer)`);
}
function Ca(e, t, n, r, i) {
	const a = r + i.offset;
	Sa(n.byteLength, a, xa(i.type));
	const o = a >> 2;
	switch (i.type) {
		case "f32": return e[o];
		case "i32": return t[o] | 0;
		case "u32": return t[o];
		case "bool": return n[a] !== 0;
		case "u8": return n[a];
		case "vec2": return {
			x: e[o],
			y: e[o + 1]
		};
		case "vec3": return {
			x: e[o],
			y: e[o + 1],
			z: e[o + 2]
		};
		case "vec4":
		case "quat": return {
			x: e[o],
			y: e[o + 1],
			z: e[o + 2],
			w: e[o + 3]
		};
		case "color": return {
			r: e[o],
			g: e[o + 1],
			b: e[o + 2],
			a: e[o + 3]
		};
	}
}
function wa(e, t, n, r, i, a) {
	const o = r + i.offset;
	Sa(n.byteLength, o, xa(i.type));
	const s = o >> 2;
	switch (i.type) {
		case "f32":
			e[s] = a;
			break;
		case "i32":
			t[s] = a | 0;
			break;
		case "u32":
			t[s] = a;
			break;
		case "bool":
			n[o] = a ? 1 : 0;
			break;
		case "u8":
			n[o] = a;
			break;
		case "vec2": {
			const t = a;
			e[s] = t.x;
			e[s + 1] = t.y;
			break;
		}
		case "vec3": {
			const t = a;
			e[s] = t.x;
			e[s + 1] = t.y;
			e[s + 2] = t.z;
			break;
		}
		case "vec4":
		case "quat": {
			const t = a;
			e[s] = t.x;
			e[s + 1] = t.y;
			e[s + 2] = t.z;
			e[s + 3] = t.w;
			break;
		}
		case "color": {
			const t = a;
			e[s] = t.r;
			e[s + 1] = t.g;
			e[s + 2] = t.b;
			e[s + 3] = t.a;
			break;
		}
	}
}
/** One allocation for every core's empty answer. */
const Ta = /* @__PURE__ */ new Uint32Array(0);
const Ea = [
	"add",
	"get",
	"has",
	"remove"
];
function Da(e) {
	const t = [];
	if (e.abiMismatch) t.push(`ABI layout hash mismatch: the WASM module was built from a different component schema than this SDK bundle.
  SDK  ABI_LAYOUT_HASH = ${e.abiMismatch.sdk}\n  WASM getAbiLayoutHash() = ${e.abiMismatch.wasm}\n  Fast pointer accessors would read the wrong bytes. This is fatal.`);
	if (e.missing.length > 0) {
		const n = e.missing.map((e) => `  - ${e.name}: missing ${e.methods.join(", ")}`).join("\n");
		t.push(`C++ Registry is missing ${String(e.missing.length)} builtin component binding(s):\n${n}`);
	}
	if (e.wasmOnly.length > 0) t.push(`WASM exposes components not in the SDK's COMPONENT_META:\n  ${e.wasmOnly.join(", ")}`);
	if (e.sdkOnly.length > 0) t.push(`SDK's COMPONENT_META lists components the WASM does not export:\n  ${e.sdkOnly.join(", ")}`);
	t.push("Likely cause: WebBindings.generated.cpp is out of sync with component.generated.ts. Rerun the EHT generator and rebuild the WASM target.");
	return t.join("\n\n");
}
var Oa = class {
	constructor() {
		this.cppRegistry_ = null;
		this.module_ = null;
		this.transformEpochWord_ = -1;
		this.transformComposition_ = null;
		this.memory_ = null;
		this.builtinMethodCache_ = /* @__PURE__ */ new Map();
		this.extraMethodCache_ = /* @__PURE__ */ new Map();
		this.builtinEntitySets_ = /* @__PURE__ */ new Map();
	}
	/**
	* Bind to a C++ Registry.
	*
	* Production call sites should pass `{ strict: true }` so the bridge
	* verifies that every component declared in COMPONENT_META has its four
	* bindings (add/get/has/remove) and throws a single aggregated diagnostic
	* if any are missing. This surfaces drift between the WASM build and the
	* generated metadata at startup rather than on first component use.
	*
	* In non-strict mode (default, used by unit tests with partial mock
	* registries) the cache is pre-populated for whatever bindings exist and
	* individual `getBuiltinMethods()` calls throw lazily on missing ones.
	*/
	connect(e, t, n = {}) {
		this.cppRegistry_ = e;
		this.module_ = t ?? null;
		this.transformEpochWord_ = t?.transform_epochAddress ? t.transform_epochAddress() >>> 2 : -1;
		this.transformComposition_ = n.transformComposition ?? null;
		this.memory_ = n.memory ?? (t ? new ha(t, e) : null);
		this.builtinMethodCache_.clear();
		this.extraMethodCache_.clear();
		this.builtinEntitySets_.clear();
		if (t) s(t);
		const r = this.verifyAgainst_(e, t);
		if (r.abiMismatch || n.strict && !r.ok) {
			this.cppRegistry_ = null;
			this.module_ = null;
			this.memory_ = null;
			this.builtinMethodCache_.clear();
			this.extraMethodCache_.clear();
			throw new Error(Da(r));
		}
	}
	disconnect() {
		this.cppRegistry_ = null;
		this.module_ = null;
		this.memory_ = null;
		this.transformComposition_ = null;
		this.transformEpochWord_ = -1;
		this.builtinMethodCache_.clear();
		this.extraMethodCache_.clear();
		this.builtinEntitySets_.clear();
	}
	/**
	* Say that composed world transforms are stale. Called for a write to a
	* local transform field or to the hierarchy — never for `worldPosition` and
	* friends, which are the composition's own output.
	*/
	invalidateTransformComposition() {
		const e = this.transformComposition_;
		if (e) {
			e.epoch[0] = e.epoch[0] + 1 >>> 0;
			return;
		}
		if (this.transformEpochWord_ < 0) return;
		const t = this.module_?.HEAPU32;
		if (!t) return;
		t[this.transformEpochWord_] = t[this.transformEpochWord_] + 1 >>> 0;
	}
	/** Compose if any producer invalidated since the last one; O(1) otherwise. */
	ensureTransformsComposed() {
		if (this.transformComposition_) {
			this.transformComposition_.ensure();
			return;
		}
		if (!this.cppRegistry_) return;
		this.module_?.transform_ensureComposed?.(this.cppRegistry_);
	}
	/**
	* Ask composition to record which entities' output changed. Answers whether
	* this core can: one that cannot leaves a consumer to rebuild every time.
	*/
	setTransformChangeTracking(e) {
		const t = this.transformComposition_;
		if (t) {
			if (!t.setChangeTracking || !t.compositionChanges) return false;
			t.setChangeTracking(e);
			return true;
		}
		const n = this.module_?.transform_setChangeTracking;
		if (!n || !this.module_?.transform_compositionChanges) return false;
		n.call(this.module_, e);
		return true;
	}
	/**
	* What every composition since the last acknowledgement changed, or null from
	* a core that cannot report. The ids VIEW engine memory and the next
	* composition may move it, so a consumer reads, applies and acknowledges
	* within one turn.
	*/
	compositionChanges() {
		const e = this.transformComposition_;
		if (e?.compositionChanges) {
			const t = e.compositionChanges();
			return {
				serial: t.serial,
				visited: t.visited,
				overflowed: t.overflowed,
				tracking: t.tracking,
				changed: t.changed ? new Uint32Array(t.changed, 0, t.count) : Ta
			};
		}
		const t = this.module_?.transform_compositionChanges;
		if (!t || !this.module_) return null;
		const n = t.call(this.module_);
		return {
			serial: n.serial,
			visited: n.visited,
			overflowed: n.overflowed,
			tracking: n.tracking,
			changed: n.count > 0 ? new Uint32Array(this.module_.HEAPU32.buffer, n.ptr, n.count) : Ta
		};
	}
	/** Acknowledge the pending set: it starts again. */
	takeCompositionChanges() {
		const e = this.transformComposition_;
		if (e?.takeChanges) {
			e.takeChanges();
			return;
		}
		this.module_?.transform_takeChanges?.();
	}
	/** @internal What the staleness counter reads, for the fixtures that assert
	*  a producer notified. */
	transformEpoch() {
		if (this.transformComposition_) return this.transformComposition_.epoch[0];
		const e = this.module_?.HEAPU32;
		return this.transformEpochWord_ < 0 || !e ? -1 : e[this.transformEpochWord_];
	}
	get hasCpp() {
		return this.cppRegistry_ !== null;
	}
	getCppRegistry() {
		return this.cppRegistry_;
	}
	getWasmModule() {
		return this.module_;
	}
	/**
	* Describe the current binding state without throwing. Useful for
	* diagnostics and tests that want to inspect coverage.
	*/
	verify() {
		if (!this.cppRegistry_) return {
			ok: false,
			missing: [{
				name: "<registry>",
				methods: ["connect() not called"]
			}],
			wasmOnly: [],
			sdkOnly: [],
			abiMismatch: null
		};
		return this.verifyAgainst_(this.cppRegistry_, this.module_ ?? void 0);
	}
	verifyAgainst_(e, t) {
		const n = [];
		for (const t of Object.keys(h)) {
			const r = [];
			for (const n of Ea) if (typeof e[`${n}${t}`] !== "function") r.push(`${n}${t}`);
			if (r.length > 0) {
				n.push({
					name: t,
					methods: r
				});
				continue;
			}
			this.resolveAndCache_(e, t);
		}
		let r = [];
		let i = [];
		const a = t?.getBuiltinComponentNames;
		if (typeof a === "function") {
			let e;
			try {
				e = a();
			} catch {
				e = [];
			}
			const t = new Set(Object.keys(h));
			const n = new Set(e);
			r = e.filter((e) => !t.has(e));
			i = Object.keys(h).filter((e) => !n.has(e));
		}
		let o = null;
		const s = t?.getAbiLayoutHash;
		if (typeof s === "function") {
			let e = "";
			try {
				e = s();
			} catch {
				e = "";
			}
			if (e && e !== "cb0184ba3431d6f9") o = {
				sdk: m,
				wasm: e
			};
		}
		return {
			ok: n.length === 0 && r.length === 0 && i.length === 0 && o === null,
			missing: n,
			wasmOnly: r,
			sdkOnly: i,
			abiMismatch: o
		};
	}
	getBuiltinMethods(e) {
		const t = this.builtinMethodCache_.get(e);
		if (t) return t;
		if (!this.cppRegistry_) throw new Error(`BuiltinBridge.getBuiltinMethods("${e}") called before connect().`);
		return this.resolveAndCache_(this.cppRegistry_, e);
	}
	resolveAndCache_(e, t) {
		const n = e[`add${t}`];
		const r = e[`get${t}`];
		const i = e[`has${t}`];
		const a = e[`remove${t}`];
		if (typeof n !== "function" || typeof r !== "function" || typeof i !== "function" || typeof a !== "function") throw new Error(`C++ Registry missing methods for component "${t}". Expected: add${t}, get${t}, has${t}, remove${t}`);
		const s = (e, n) => {
			return (...r) => {
				o(this.module_, `${e}${t}`);
				try {
					return n(...r);
				} catch (n) {
					if (c(this.module_)) throw new l(`${e}${t}`, void 0, n);
					throw n;
				}
			};
		};
		const u = {
			add: s("add", n.bind(e)),
			get: s("get", r.bind(e)),
			has: s("has", i.bind(e)),
			remove: s("remove", a.bind(e))
		};
		this.builtinMethodCache_.set(t, u);
		if (!d(h, t)) this.extraMethodCache_.set(t, u);
		return u;
	}
	/** @internal One core call for all generated builtin memberships, when supported. */
	componentNames(e) {
		const t = this.cppRegistry_;
		if (!t?.getBuiltinComponentNames) return null;
		o(this.module_, "getBuiltinComponentNames");
		try {
			const n = t.getBuiltinComponentNames(e);
			if (typeof n !== "string") return null;
			return n ? n.split("|") : [];
		} catch (e) {
			if (c(this.module_)) throw new l("getBuiltinComponentNames", void 0, e);
			throw e;
		}
	}
	/** @internal Bindings outside the generated membership query. */
	getExtraMethodCache() {
		return this.extraMethodCache_;
	}
	getMethodCache() {
		return this.builtinMethodCache_;
	}
	/**
	* Every engine pool's version in one number, or null where this build cannot
	* be asked (no registry, or an artifact older than the binding). Null means
	* "assume everything moved": a holder of addresses must re-resolve rather
	* than trust a number it could not read.
	*/
	layoutEpoch() {
		const e = this.cppRegistry_;
		if (!e) return null;
		if (typeof e.layoutEpoch === "function") return e.layoutEpoch();
		const t = this.module_?.["registryLayoutEpoch"];
		if (typeof t !== "function") return null;
		return t(e);
	}
	getEntitySet(e) {
		return this.builtinEntitySets_.get(e);
	}
	getOrCreateEntitySet(e) {
		let t = this.builtinEntitySets_.get(e);
		if (!t) {
			t = /* @__PURE__ */ new Set();
			this.builtinEntitySets_.set(e, t);
		}
		return t;
	}
	/** Re-order every builtin entity set so queries iterate in rank order
	*  (the JS half of {@link World.applyEntityOrder}; the engine's own pools are
	*  permuted by the same call). */
	reorderEntitySets(e) {
		for (const t of this.builtinEntitySets_.values()) fa(t, e);
	}
	/** Removes the entity from every builtin set; returns the cppNames it was in. */
	deleteFromEntitySets(e) {
		const t = [];
		for (const [n, r] of this.builtinEntitySets_) if (r.delete(e)) t.push(n);
		return t;
	}
	insert(e, t, n) {
		const r = t._default;
		const i = {};
		if (n !== null && n !== void 0 && typeof n === "object") {
			for (const [e, t] of Object.entries(n)) {
				if (t === void 0) continue;
				if (!d(r, e)) continue;
				i[e] = t;
			}
			const e = z(t._name, r, i, t.assetFields);
			if (e.length > 0) throw new Error(B(t._name, e));
		}
		const a = Re(t._default, i);
		let o = true;
		if (this.cppRegistry_) try {
			o = !this.getBuiltinMethods(t._cppName).has(e);
			this.replace(e, t._cppName, H(a, t.colorKeys), t.entityFields ?? []);
		} catch (n) {
			R(n, `insertBuiltin(${t._name}, entity=${e})`);
		}
		const s = this.getOrCreateEntitySet(t._cppName);
		const c = s.has(e);
		if (o || !c) {
			if (!c) s.add(e);
		}
		return {
			merged: a,
			isNew: o || !c
		};
	}
	/**
	* Hand a component's whole value to C++, converting the fields embind cannot
	* take as a JS array. The write `insert` performs, without its structural
	* bookkeeping — so a replace cannot marshal differently from an add.
	*/
	replace(e, t, n, r = []) {
		const i = this.module_;
		const a = U(t);
		const o = r.length > 0 || a.length > 0 ? { ...n } : n;
		const s = va(o, r, i);
		s.push(...ya(o, a, i));
		try {
			this.getBuiltinMethods(t).add(e, o);
		} finally {
			for (const e of s) e.delete();
		}
	}
	get(e, t) {
		if (!this.cppRegistry_) throw new Error("C++ Registry not connected");
		try {
			return W(this.getBuiltinMethods(t._cppName).get(e), t);
		} catch (n) {
			R(n, `getBuiltin(${t._name}, entity=${e})`);
			return { ...t._default };
		}
	}
	has(e, t) {
		if (!this.cppRegistry_) return false;
		try {
			return this.getBuiltinMethods(t._cppName).has(e);
		} catch (n) {
			R(n, `hasBuiltin(${t._name}, entity=${e})`);
			return false;
		}
	}
	remove(e, t) {
		if (!this.cppRegistry_) return;
		try {
			this.getBuiltinMethods(t._cppName).remove(e);
		} catch (n) {
			R(n, `removeBuiltin(${t._name}, entity=${e})`);
		}
		this.builtinEntitySets_.get(t._cppName)?.delete(e);
	}
	/**
	* Where `cppName`'s bytes are for an entity: what compiled code adds an EHT
	* offset to. Through the {@link MemoryProvider}, the seam the fast
	* accessors already use — an address resolved a second way can disagree.
	* Null where this backend serves no flat memory.
	*/
	resolveComponentAddress(e) {
		const t = this.resolvePtrFn(e);
		if (t) return (e) => t(e) || void 0;
		const n = this.memory_?.resolveComponentHeap(e);
		if (!n) return null;
		const r = ka();
		return (e) => n(e, r) ? r.ptr : void 0;
	}
	/**
	* The wasm-exported pointer function for `cppName` — `(entity) => byte offset
	* of that entity's component in the wasm heap`. Web/emscripten only (there is
	* no such numeric address on native); the fast path itself goes through the
	* {@link MemoryProvider}, so this is a lower-level convenience.
	*/
	resolvePtrFn(e) {
		return ma(this.module_, this.cppRegistry_, e);
	}
	resolvePtrSetter(e) {
		const t = V[e];
		if (!t) return null;
		const n = this.memory_?.resolveComponentHeap(e);
		if (!n) return null;
		const r = ka();
		return (e, i) => {
			if (!n(e, r)) return;
			t.write(r.f32, r.u32, r.u8, r.ptr, i);
		};
	}
	/**
	* A getter reading C++ component data out of the wasm heap. `borrowed` (the
	* default) refills ONE object per call, so the value dies at the next call;
	* `retained` fills a fresh one, which is what a caller keeping the value past
	* its own step needs — a query row outliving the row after it, above all.
	*/
	resolvePtrGetter(e, t = "borrowed") {
		const n = V[e];
		if (!n) return null;
		const r = this.memory_?.resolveComponentHeap(e);
		if (!r) return null;
		const i = ka();
		if (t === "retained") return (e) => {
			if (!r(e, i)) return null;
			const t = n.create();
			n.fill(i.f32, i.u32, i.u8, i.ptr, t);
			return t;
		};
		const a = n.create();
		return (e) => {
			if (!r(e, i)) return null;
			n.fill(i.f32, i.u32, i.u8, i.ptr, a);
			return a;
		};
	}
};
function ka() {
	return {
		f32: Aa,
		u32: ja,
		u8: Ma,
		ptr: 0
	};
}
const Aa = /* @__PURE__ */ new Float32Array(0);
const ja = /* @__PURE__ */ new Uint32Array(0);
const Ma = /* @__PURE__ */ new Uint8Array(0);
//#endregion
//#region src/ecs/ScriptPool.ts
/**
* @file    ScriptPool.ts
* @brief   Flat storage for a script component whose fields are all scalars.
*
* @details A `defineComponent` component is a JS object per entity, which is
*          fine for the interpreter and impossible for compiled code: a compiled
*          system reaches a component by ADDRESS, and a JS object has none. So a
*          component whose defaults are entirely numbers and booleans is stored
*          in one Float64Array instead, and what callers hold is a live view
*          onto a row of it.
*
*          The layout is the ABI's, not one chosen here: declaration order, one
*          f64 per field, which is what `packLayout` gives a `host` shape. That
*          agreement is a contract with the compiler and a test holds it.
*
*          A view is LIVE, and for script components that changes nothing: the
*          query already yields the stored object itself and `writeMutBack_`
*          only records a Changed tick for them. Writing through a setter is the
*          same write it always was, one indirection later.
*/
/** One f64 per field: what the ABI gives a host record. */
const Na = 8;
/** Storage on the JS heap: right for native, useless to a wasm module. */
const Pa = {
	alloc: (e) => ({
		buffer: new ArrayBuffer(e),
		byteOffset: 0,
		byteLength: e
	}),
	release: () => {}
};
/** Absent, in the sparse table: a slot is stored as `slot + 1`. */
const Fa = 0;
/**
* A slot no entity holds, in the owner table. `Entity::INVALID_RAW` on the C++
* side, which is the one raw handle the world never hands out — so a host
* walking the column reads a hole as an entity nothing resolves for, and its
* existing completeness check drops the row.
*/
const Ia = 4294967295;
/**
* The fields a pool can back, or null when the defaults are not all scalars.
* Anything else — a string, an asset ref, a nested object, an array — has no
* fixed-width encoding, and a component holding one keeps the JS object path.
*/
function La(e) {
	if (e === null || typeof e !== "object" || Array.isArray(e)) return null;
	const t = [];
	for (const [n, r] of Object.entries(e)) if (typeof r === "number") t.push({
		name: n,
		kind: "number"
	});
	else if (typeof r === "boolean") t.push({
		name: n,
		kind: "boolean"
	});
	else return null;
	return t.length > 0 ? t : null;
}
/**
* Rows of one component, and a view per live entity. Slots come from a free list
* rather than being compacted, so a view stays valid while its entity carries
* the component: an index that moved under a held view is a bug that surfaces
* three frames later. Iteration order lives in the map that holds the views.
*/
var Ra = class {
	get disposed() {
		return this.disposed_;
	}
	dispose() {
		if (this.disposed_) return;
		this.disposed_ = true;
		const e = [...this.views_.values()];
		const t = [
			this.rows_,
			this.sparseBlock_,
			this.ownersBlock_
		];
		a([
			() => this.rebuild_(),
			() => a(e, (e) => e.detach()),
			() => {
				this.slotOf_.clear();
				this.views_.clear();
				this.refs_?.clear();
				this.free_.length = 0;
				this.next_ = 0;
				this.slots_ = za;
				this.sparse_ = G;
				this.owners_ = G;
				this.rows_ = this.sparseBlock_ = this.ownersBlock_ = Ba;
			},
			() => a(t, (e) => this.memory_.release(e))
		], (e) => e());
	}
	assertOpen_() {
		if (this.disposed_) throw new Error("ScriptPool is disposed");
	}
	constructor(e, t = 64, n = Pa, r) {
		this.memory_ = n;
		this.assetRefs_ = r;
		this.slotOf_ = /* @__PURE__ */ new Map();
		this.views_ = /* @__PURE__ */ new Map();
		this.free_ = [];
		this.next_ = 0;
		this.disposed_ = false;
		this.fields = e;
		this.stride = e.length * 8;
		this.capacity_ = Math.max(1, t);
		const i = [];
		try {
			this.rows_ = n.alloc(this.capacity_ * this.stride);
			i.push(this.rows_);
			this.sparseBlock_ = n.alloc(this.capacity_ * 4);
			i.push(this.sparseBlock_);
			this.sparseLen_ = this.capacity_;
			this.ownersBlock_ = n.alloc(this.capacity_ * 4);
			i.push(this.ownersBlock_);
			this.slots_ = za;
			this.sparse_ = G;
			this.owners_ = G;
			this.rebuild_();
			this.owners_.fill(Ia);
		} catch (e) {
			try {
				a(i, (e) => n.release(e));
			} catch {}
			throw e;
		}
	}
	/**
	* What a host needs to resolve this component WITHOUT calling back: rows at
	* a constant stride, and a sparse table saying which slot an entity is in.
	* Every address is in the memory the pool allocated from.
	*
	* Valid until the next growth, which is per call anyway.
	*/
	span() {
		this.assertOpen_();
		return {
			rows: this.rows_.byteOffset,
			stride: this.stride,
			sparse: this.sparseBlock_.byteOffset,
			sparseCount: this.sparseLen_,
			owners: this.ownersBlock_.byteOffset,
			ownerCount: this.next_
		};
	}
	/** The current sparse view. Retrieve it again after pool or heap growth;
	*  a held typed array cannot follow replacement or detached memory. */
	get sparseTable() {
		this.ensureCurrent_();
		return this.sparse_;
	}
	/**
	* Rebuild the views over whatever buffer the blocks are in now: a grown wasm
	* heap leaves the bytes at the same offsets but detaches every view of the
	* old ArrayBuffer. Cheap and idempotent, so call it when unsure — the
	* per-entity views read `slots_` on access and need no rebuild.
	*/
	refresh() {
		this.assertOpen_();
		this.rebuild_();
	}
	/** Every view of this pool's storage, made in ONE place. Anything that can
	*  have detached a view calls this rather than fixing up the one it knows
	*  about — the heap grows for all of them at once. */
	rebuild_() {
		this.slots_ = new Float64Array(this.bufferOf_(this.rows_), this.rows_.byteOffset, this.capacity_ * this.fields.length);
		this.sparse_ = new Uint32Array(this.bufferOf_(this.sparseBlock_), this.sparseBlock_.byteOffset, this.sparseLen_);
		this.owners_ = new Uint32Array(this.bufferOf_(this.ownersBlock_), this.ownersBlock_.byteOffset, this.capacity_);
	}
	bufferOf_(e) {
		return this.memory_.current?.(e) ?? e.buffer;
	}
	ensureCurrent_() {
		if (this.slots_.length === 0 && !this.disposed_) this.rebuild_();
	}
	/** The current row view. Retrieve it again after pool or heap growth.
	*  Pool growth moves row addresses; foreign heap growth detaches views
	*  while allocation addresses stay unchanged. */
	get buffer() {
		this.ensureCurrent_();
		return this.slots_;
	}
	get size() {
		return this.slotOf_.size;
	}
	get hasPortableAssetRefs() {
		return (this.refs_?.size ?? 0) > 0;
	}
	/** Byte offset of `entity`'s row inside `buffer`. */
	baseOf(e) {
		const t = this.slotOf_.get(e);
		return t === void 0 ? void 0 : t * this.stride;
	}
	/**
	* The address a host hands to compiled code: the row's offset in the memory
	* the pool allocated from, not in the pool's own view. The two differ by
	* `byteOffset` once the rows are carved out of a larger block. Valid until
	* the next growth, which a one-call lifetime requires anyway.
	*/
	address(e) {
		const t = this.slotOf_.get(e);
		if (t === void 0 || this.refs_?.has(t)) return void 0;
		return this.rows_.byteOffset + t * this.stride;
	}
	has(e) {
		return this.slotOf_.has(e);
	}
	/** The live view, or undefined when the entity does not carry this. */
	get(e) {
		return this.views_.get(e)?.value;
	}
	/**
	* Give `entity` a row seeded from `defaults` and overlaid with `data`, or
	* overwrite the fields `data` names on the row it already has. Returns the
	* view either way, and whether the row is new.
	*/
	put(e, t, n) {
		this.assertOpen_();
		this.ensureCurrent_();
		let r = this.slotOf_.get(e);
		const i = r === void 0;
		if (r === void 0) {
			r = this.claim_(e);
			this.slotOf_.set(e, r);
			this.mark_(e, r + 1);
			this.owners_[r] = e;
			this.views_.set(e, this.makeView_(r));
			this.writeAll_(r, t);
		}
		if (n) this.writeSome_(r, n);
		return {
			view: this.views_.get(e).value,
			isNew: i
		};
	}
	delete(e) {
		const t = this.slotOf_.get(e);
		if (t === void 0) return false;
		const n = this.memory_.current?.(this.rows_) ?? this.rows_.buffer;
		if (this.slots_.buffer !== n) this.rebuild_();
		this.views_.get(e).detach();
		this.slotOf_.delete(e);
		this.views_.delete(e);
		this.refs_?.delete(t);
		this.mark_(e, 0);
		this.owners_[t] = Ia;
		this.free_.push(t);
		return true;
	}
	entities() {
		return this.slotOf_.keys();
	}
	claim_(e) {
		const t = this.free_.pop();
		if (t !== void 0) return t;
		if (this.next_ >= this.capacity_) this.growRows_();
		this.reserveSparse_(L(e) + 1);
		return this.next_++;
	}
	mark_(e, t) {
		const n = L(e);
		this.reserveSparse_(n + 1);
		this.sparse_[n] = t;
	}
	growRows_() {
		const e = this.capacity_ * 2;
		const t = this.memory_.alloc(e * this.stride);
		let n;
		try {
			n = this.memory_.alloc(e * 4);
		} catch (e) {
			try {
				this.memory_.release(t);
			} catch {}
			try {
				this.rebuild_();
			} catch {}
			throw e;
		}
		this.rebuild_();
		const r = new Float64Array(this.bufferOf_(t), t.byteOffset, e * this.fields.length);
		r.set(this.slots_);
		const i = new Uint32Array(this.bufferOf_(n), n.byteOffset, e);
		i.fill(Ia);
		i.set(this.owners_);
		const o = this.rows_;
		const s = this.ownersBlock_;
		this.capacity_ = e;
		this.rows_ = t;
		this.slots_ = r;
		this.ownersBlock_ = n;
		this.owners_ = i;
		a([o, s], (e) => this.memory_.release(e));
	}
	/** The sparse table is indexed by ENTITY INDEX, which the world hands out
	*  and this pool does not control, so it grows on its own schedule. */
	reserveSparse_(e) {
		if (e <= this.sparseLen_) return;
		let t = Math.max(this.sparseLen_ * 2, 8);
		while (t < e) t *= 2;
		const n = this.memory_.alloc(t * 4);
		this.rebuild_();
		const r = new Uint32Array(this.bufferOf_(n), n.byteOffset, t);
		r.set(this.sparse_);
		const i = this.sparseBlock_;
		this.sparseBlock_ = n;
		this.sparse_ = r;
		this.sparseLen_ = t;
		this.memory_.release(i);
	}
	writeAll_(e, t) {
		const n = e * this.fields.length;
		this.fields.forEach((r, i) => {
			this.writeValue_(e, i, n + i, t[r.name]);
		});
	}
	writeSome_(e, t) {
		const n = e * this.fields.length;
		this.fields.forEach((r, i) => {
			const a = t[r.name];
			if (a !== void 0) this.writeValue_(e, i, n + i, a);
		});
	}
	writeValue_(e, t, n, r) {
		this.ensureCurrent_();
		const i = this.fields[t];
		if (typeof r === "string" && i?.kind === "number" && this.assetRefs_?.fields().some((e) => e.field === i.name)) {
			this.refs_ ??= /* @__PURE__ */ new Map();
			let i = this.refs_.get(e);
			if (!i) {
				this.refs_.set(e, i = /* @__PURE__ */ new Map());
				this.assetRefs_.addressChanged();
			}
			i.set(t, r);
			this.slots_[n] = 0;
			return;
		}
		const a = this.refs_?.get(e);
		if (a?.delete(t) && a.size === 0) {
			this.refs_.delete(e);
			this.assetRefs_?.addressChanged();
		}
		this.slots_[n] = Va(r);
	}
	/** One object per entity, with an accessor per field onto its row. */
	makeView_(e) {
		const t = e * this.fields.length;
		const n = {};
		let r = this;
		let i;
		this.fields.forEach((a, o) => {
			const s = t + o;
			Object.defineProperty(n, a.name, {
				enumerable: true,
				configurable: true,
				get: a.kind === "boolean" ? () => {
					if (!r) return i[o];
					if (r.slots_.length === 0) r.rebuild_();
					return r.slots_[s] !== 0;
				} : () => {
					if (!r) return i[o];
					if (r.slots_.length === 0) r.rebuild_();
					return r.refs_?.get(e)?.get(o) ?? r.slots_[s];
				},
				set: (t) => {
					if (r) r.writeValue_(e, o, s, t);
					else i[o] = t;
				}
			});
		});
		return {
			value: n,
			detach() {
				const n = r;
				if (!n) return;
				i = n.fields.map((r, i) => r.kind === "boolean" ? n.slots_[t + i] !== 0 : n.refs_?.get(e)?.get(i) ?? n.slots_[t + i]);
				r = void 0;
			}
		};
	}
};
/** Placeholders, so the constructor can allocate before it views. */
const za = /* @__PURE__ */ new Float64Array(0);
const G = /* @__PURE__ */ new Uint32Array(0);
const Ba = {
	buffer: /* @__PURE__ */ new ArrayBuffer(0),
	byteOffset: 0,
	byteLength: 0
};
/** A slot holds a number; a boolean is the 0/1 the ABI stores it as. */
function Va(e) {
	if (typeof e === "boolean") return e ? 1 : 0;
	return typeof e === "number" ? e : 0;
}
//#endregion
//#region src/ecs/ScriptStorage.ts
var Ha = class {
	constructor() {
		this.tsStorage_ = /* @__PURE__ */ new Map();
		this.entityComponents_ = /* @__PURE__ */ new Map();
		this.pools_ = /* @__PURE__ */ new Map();
		this.poolMemory_ = Pa;
		this.releasingPools_ = false;
		this.layoutEpoch_ = 0;
		this.notPooled_ = /* @__PURE__ */ new Set();
	}
	releasePools() {
		if (this.releasingPools_) return;
		this.releasingPools_ = true;
		const e = [...this.pools_.values()];
		this.pools_.clear();
		this.notPooled_.clear();
		this.poolMemory_ = Pa;
		this.layoutEpoch_++;
		try {
			a(e, (e) => e.dispose());
		} finally {
			this.releasingPools_ = false;
		}
	}
	/**
	* @internal Where pools allocate from. A wasm runtime installs one backed by
	* linear memory before any component is added, because compiled code cannot
	* reach a JS-heap array; a native one leaves the default.
	*/
	/**
	* Bumped whenever a pooled row is claimed, released, or moved by a growth —
	* i.e. whenever an address this storage handed out may have stopped meaning
	* what it meant. The engine's own pools answer the same question through
	* `Registry::layoutEpoch`; a caller that holds addresses reads both.
	*/
	get layoutEpoch() {
		return this.layoutEpoch_;
	}
	usePoolMemory(e, t = false) {
		if (this.pools_.size > 0) {
			if (e === this.poolMemory_ || e.allocatorIdentity !== void 0 && e.allocatorIdentity === this.poolMemory_.allocatorIdentity) return;
			throw new Error("ScriptPool memory must be chosen before the first pooled component");
		}
		if (!t) this.poolMemory_ = e;
	}
	/** @internal The rows behind `component`, or undefined if it has none. */
	poolFor(e) {
		return this.pools_.get(e);
	}
	hasPortableAssetRefs(e) {
		return this.pools_.get(e)?.hasPortableAssetRefs ?? false;
	}
	/**
	* @internal Re-view every pool. A wasm heap grows for one pool and detaches
	* the views of all of them, so this is a set operation and not a per-pool
	* one. Idempotent: a caller that is unsure may call it.
	*/
	refreshPools() {
		for (const e of this.pools_.values()) e.refresh();
	}
	/**
	* The pool `component` uses, creating it on first sight. `null` once for a
	* shape that cannot be flat, and remembered as null so the check is not
	* repeated per insert.
	*/
	pool_(e) {
		if (this.releasingPools_) throw new Error("Script pools are being released");
		const t = this.pools_.get(e._id);
		if (t) return t;
		if (this.notPooled_.has(e._id)) return null;
		const n = La(e._default);
		if (!n) {
			this.notPooled_.add(e._id);
			return null;
		}
		const r = new Ra(n, 64, this.poolMemory_, {
			fields: () => e.assetFields,
			addressChanged: () => {
				this.layoutEpoch_++;
			}
		});
		this.pools_.set(e._id, r);
		this.refreshPools();
		return r;
	}
	insert(e, t, n) {
		let r;
		if (n !== null && n !== void 0 && typeof n === "object") {
			const e = Object.create(null);
			for (const [t, r] of Object.entries(n)) if (r !== void 0) e[t] = r;
			const i = z(t._name, t._default, e, t.assetFields);
			if (i.length > 0) throw new Error(B(t._name, i));
			r = e;
		}
		const i = this.getStorage(t);
		const a = this.pool_(t);
		if (a) {
			const { view: n, isNew: o } = a.put(e, t._default, r);
			if (o) this.layoutEpoch_++;
			i.set(e, n);
			this.note_(e, t);
			return {
				value: n,
				isNew: o
			};
		}
		const o = t.create(r);
		const s = !i.has(e);
		i.set(e, o);
		this.note_(e, t);
		return {
			value: o,
			isNew: s
		};
	}
	/**
	* Record that `entity` carries `component`. The index and the per-component
	* maps are one membership fact, so every write that adds a component has to
	* come through here or `getEntityComponentIds` starts answering a subset.
	*/
	note_(e, t) {
		let n = this.entityComponents_.get(e);
		if (!n) {
			n = /* @__PURE__ */ new Set();
			this.entityComponents_.set(e, n);
		}
		n.add(t._id);
	}
	get(e, t) {
		const n = this.tsStorage_.get(t._id);
		if (!n) throw new Error(`Component not found: ${t._name}`);
		return n.get(e);
	}
	has(e, t) {
		return this.tsStorage_.get(t._id)?.has(e) ?? false;
	}
	remove(e, t) {
		this.tsStorage_.get(t._id)?.delete(e);
		if (this.pools_.get(t._id)?.delete(e)) this.layoutEpoch_++;
		const n = this.entityComponents_.get(e);
		if (n) n.delete(t._id);
	}
	/**
	* Store a whole value, answering whether the entity lacked the component —
	* the caller owns the structural bookkeeping an addition needs. Invalid data
	* warns rather than throwing as `insert` does: a scene load and the reconciler
	* write through here, where one bad field must not take a frame down.
	*/
	set(t, n, r) {
		if (r !== null && r !== void 0 && typeof r === "object") {
			const t = z(n._name, n._default, r, n.assetFields);
			if (t.length > 0) e.warn("ecs", B(n._name, t));
		}
		const i = this.getStorage(n);
		const a = this.pool_(n);
		if (a) {
			const { view: e, isNew: o } = a.put(t, n._default, r ?? void 0);
			if (o) this.layoutEpoch_++;
			i.set(t, e);
			this.note_(t, n);
			return { isNew: o };
		}
		const o = !i.has(t);
		i.set(t, r);
		this.note_(t, n);
		return { isNew: o };
	}
	getStorage(e) {
		let t = this.tsStorage_.get(e._id);
		if (!t) {
			t = /* @__PURE__ */ new Map();
			this.tsStorage_.set(e._id, t);
		}
		return t;
	}
	getStorageById(e) {
		return this.tsStorage_.get(e);
	}
	getEntityComponentIds(e) {
		return this.entityComponents_.get(e);
	}
	/** Re-order every component's storage so queries iterate in rank order — the
	*  script half of {@link World.applyEntityOrder}. */
	reorderStorages(e) {
		for (const t of this.tsStorage_.values()) da(t, e);
	}
	removeEntity(e) {
		const t = this.entityComponents_.get(e);
		if (!t) return [];
		const n = [];
		for (const r of t) {
			this.tsStorage_.get(r)?.delete(e);
			if (this.pools_.get(r)?.delete(e)) this.layoutEpoch_++;
			n.push(r);
		}
		this.entityComponents_.delete(e);
		return n;
	}
	/**
	* @internal Live map sizes for the resource census.
	*
	* `storages` counts component types ever stored and never shrinks by design
	* (an emptied storage is kept for reuse), so the census tracks it as bounded
	* while `rows` and `entities` are the conserved pair.
	*/
	sizes() {
		let e = 0;
		for (const t of this.tsStorage_.values()) e += t.size;
		return {
			storages: this.tsStorage_.size,
			rows: e,
			entities: this.entityComponents_.size
		};
	}
};
//#endregion
//#region src/ecs/NameIndex.ts
var Ua = class {
	constructor() {
		this.nameToEntities_ = /* @__PURE__ */ new Map();
		this.entityToName_ = /* @__PURE__ */ new Map();
	}
	update(e, t) {
		const n = this.entityToName_.get(e);
		if (n !== void 0) this.unlink_(n, e);
		if (t) {
			let n = this.nameToEntities_.get(t);
			if (!n) this.nameToEntities_.set(t, n = /* @__PURE__ */ new Set());
			n.add(e);
			this.entityToName_.set(e, t);
		} else this.entityToName_.delete(e);
	}
	remove(e) {
		const t = this.entityToName_.get(e);
		if (t !== void 0) {
			this.unlink_(t, e);
			this.entityToName_.delete(e);
		}
	}
	findByName(e) {
		const t = this.nameToEntities_.get(e);
		if (!t) return null;
		let n = null;
		for (const e of t) n = e;
		return n;
	}
	/** @internal Live map sizes for the resource census. */
	sizes() {
		return {
			names: this.nameToEntities_.size,
			entities: this.entityToName_.size
		};
	}
	unlink_(e, t) {
		const n = this.nameToEntities_.get(e);
		if (!n) return;
		n.delete(t);
		if (n.size === 0) this.nameToEntities_.delete(e);
	}
};
//#endregion
//#region src/ecs/ChangeTracker.ts
/**
* Per-component history with per-component retention: rows exist only while a
* reader holds the component, pruned to the LOWEST claim on it. Two of these
* exist — removal history and membership topology — because a consumer of one
* must not keep the other alive; the ownership rule is written once.
*
* A reader is a LEASE: it must advance or be disposed. Nothing prunes past a
* parked one, deliberately — it is indistinguishable from one about to catch up
* — so a holder that can go idle advances anyway.
*/
var Wa = class {
	constructor(e = false) {
		this.sequenced_ = e;
		this.rows_ = /* @__PURE__ */ new Map();
		this.readers_ = /* @__PURE__ */ new Map();
		this.cursorReaders_ = /* @__PURE__ */ new Map();
		this.sequence_ = 0;
	}
	hasReaders(e) {
		return this.readers_.has(e) || this.cursorReaders_.has(e);
	}
	record(e, t, n) {
		let r = this.rows_.get(e);
		if (!r) {
			r = [];
			this.rows_.set(e, r);
		}
		r.push(this.sequenced_ ? {
			entity: t,
			tick: n,
			sequence: ++this.sequence_
		} : {
			entity: t,
			tick: n
		});
	}
	sequence() {
		return this.sequence_;
	}
	registerCursor(e, t) {
		let n = this.cursorReaders_.get(e);
		if (!n) {
			n = /* @__PURE__ */ new Map();
			this.cursorReaders_.set(e, n);
		}
		n.set(t, this.sequence_);
	}
	sinceCursor(e, t) {
		const n = this.cursorReaders_.get(e)?.get(t);
		if (n === void 0) return [];
		const r = this.rows_.get(e);
		if (!r) return [];
		let i = 0, a = r.length;
		while (i < a) {
			const e = i + a >>> 1;
			if (r[e].sequence <= n) i = e + 1;
			else a = e;
		}
		const o = [];
		for (let e = i; e < r.length; e++) o.push(r[e].entity);
		return o;
	}
	advanceCursor(e, t, n) {
		const r = this.cursorReaders_.get(e);
		if (!r?.has(t)) return;
		r.set(t, n);
		this.prune_(e);
	}
	/** How many rows are buffered, at any tick. An UPPER bound on what `since`
	*  would return, in O(1) — enough for a caller choosing between reading this
	*  journal and a scan it can size, without materializing either. */
	buffered(e) {
		return this.rows_.get(e)?.length ?? 0;
	}
	/** Rows after `sinceTick`, in the order they happened. May repeat an entity. */
	since(e, t) {
		const n = this.rows_.get(e);
		if (!n) return [];
		const r = [];
		for (const e of n) if (e.tick > t) r.push(e.entity);
		return r;
	}
	register(e, t, n) {
		let r = this.readers_.get(e);
		if (!r) {
			r = /* @__PURE__ */ new Map();
			this.readers_.set(e, r);
		}
		r.set(t, n);
	}
	advance(e, t, n) {
		const r = this.readers_.get(e);
		if (!r?.has(t)) return;
		r.set(t, n + 1);
		this.prune_(e);
	}
	dispose(e, t) {
		this.readers_.get(e)?.delete(t);
		this.cursorReaders_.get(e)?.delete(t);
		this.prune_(e);
	}
	readerCount(e) {
		return (this.readers_.get(e)?.size ?? 0) + (this.cursorReaders_.get(e)?.size ?? 0);
	}
	totalRows() {
		let e = 0;
		for (const t of this.rows_.values()) e += t.length;
		return e;
	}
	prune_(e) {
		const t = this.readers_.get(e);
		const n = this.cursorReaders_.get(e);
		if (!t?.size) this.readers_.delete(e);
		if (!n?.size) this.cursorReaders_.delete(e);
		if (!t?.size && !n?.size) {
			this.rows_.delete(e);
			return;
		}
		const r = this.rows_.get(e);
		if (!r) return;
		let i = Infinity;
		for (const e of t?.values() ?? []) if (e < i) i = e;
		let a = Infinity;
		for (const e of n?.values() ?? []) if (e < a) a = e;
		let o = 0;
		while (o < r.length && r[o].tick < i && (r[o].sequence ?? -Infinity) <= a) o++;
		if (o === r.length) this.rows_.delete(e);
		else if (o > 0) r.splice(0, o);
	}
};
var Ga = class {
	constructor() {
		this.worldTick_ = 0;
		this.componentAddedTicks_ = /* @__PURE__ */ new Map();
		this.componentIncarnations_ = /* @__PURE__ */ new Map();
		this.nextIncarnation_ = 1;
		this.componentChangedTicks_ = /* @__PURE__ */ new Map();
		this.componentAddedSequences_ = /* @__PURE__ */ new Map();
		this.componentChangedSequences_ = /* @__PURE__ */ new Map();
		this.changeSequence_ = 0;
		this.revision_ = 0;
		this.revisions_ = /* @__PURE__ */ new Map();
		this.removals_ = new Wa(true);
		this.topology_ = new Wa(true);
		this.writes_ = new Wa(true);
		this.trackedComponents_ = /* @__PURE__ */ new Set();
		this.componentLastChangedTick_ = /* @__PURE__ */ new Map();
		this.nextReaderId_ = 1;
	}
	advanceTick() {
		this.worldTick_++;
	}
	getWorldTick() {
		return this.worldTick_;
	}
	enableChangeTracking(e) {
		this.trackedComponents_.add(e._id);
	}
	enableChangeSequenceTracking(e, t) {
		const n = t ? this.componentAddedSequences_ : this.componentChangedSequences_;
		if (n.has(e._id)) return;
		this.enableChangeTracking(e);
		const r = t ? this.componentAddedTicks_ : this.componentChangedTicks_;
		let i = r.get(e._id);
		if (!i) {
			i = /* @__PURE__ */ new Map();
			r.set(e._id, i);
		}
		const a = {
			rows: i,
			latest: -1
		};
		n.set(e._id, a);
		if (i.size) {
			const e = ++this.changeSequence_;
			a.latest = e;
			for (const [t, n] of i) i.set(t, {
				tick: n,
				sequence: e
			});
		}
	}
	getChangeSequence() {
		return this.changeSequence_;
	}
	resolveChangeSequenceMatcher(e, t) {
		this.enableChangeSequenceTracking(e, t);
		const n = (t ? this.componentAddedSequences_ : this.componentChangedSequences_).get(e._id).rows;
		return (e, t) => (n.get(e)?.sequence ?? -1) > t;
	}
	isAddedAfterSequence(e, t, n) {
		return ((this.componentAddedSequences_.get(t._id)?.rows.get(e))?.sequence ?? -1) > n;
	}
	isChangedAfterSequence(e, t, n) {
		return ((this.componentChangedSequences_.get(t._id)?.rows.get(e))?.sequence ?? -1) > n;
	}
	anyAddedAfterSequence(e, t) {
		return (this.componentAddedSequences_.get(e._id)?.latest ?? -1) > t;
	}
	anyChangedAfterSequence(e, t) {
		return (this.componentChangedSequences_.get(e._id)?.latest ?? -1) > t;
	}
	enableIncarnationTracking(e) {
		if (!this.componentIncarnations_.has(e._id)) this.componentIncarnations_.set(e._id, /* @__PURE__ */ new Map());
	}
	getComponentIncarnation(e, t) {
		return this.componentIncarnations_.get(t._id)?.get(e) ?? 0;
	}
	isAddedSince(e, t, n) {
		const r = this.componentAddedTicks_.get(t._id);
		if (!r) return false;
		const i = r.get(e);
		return i !== void 0 && (typeof i === "number" ? i : i.tick) > n;
	}
	isChangedSince(e, t, n) {
		const r = this.componentChangedTicks_.get(t._id);
		if (!r) return false;
		const i = r.get(e);
		return i !== void 0 && (typeof i === "number" ? i : i.tick) > n;
	}
	/** True if ANY entity changed `component` after `sinceTick`. O(1) — reads the
	*  per-component last-changed tick, not the per-entity map. */
	anyChangedSince(e, t) {
		return (this.componentLastChangedTick_.get(e._id) ?? -1) > t;
	}
	getRemovedEntitiesSince(e, t) {
		return this.removals_.since(e._id, t);
	}
	/**
	* Entities whose MEMBERSHIP in `component` moved after `sinceTick` — gained
	* or lost, and deliberately not saying which. A consumer re-reads the world
	* to find out; this only says who is worth re-reading.
	*/
	getTopologyChangedEntitiesSince(e, t) {
		return this.topology_.since(e._id, t);
	}
	registerMutationCursor(e, t) {
		const n = this.nextReaderId_++;
		this.mutationJournal_(t).registerCursor(e._id, n);
		return n;
	}
	mutationSequence(e) {
		return this.mutationJournal_(e).sequence();
	}
	mutationsForCursor(e, t, n) {
		return this.mutationJournal_(t).sinceCursor(e._id, n);
	}
	advanceMutationCursor(e, t, n, r) {
		this.mutationJournal_(t).advanceCursor(e._id, n, r);
	}
	disposeMutationCursor(e, t, n) {
		this.mutationJournal_(t).dispose(e._id, n);
	}
	mutationJournal_(e) {
		return e === "write" ? this.writes_ : this.topology_;
	}
	mutationRevision(e, t) {
		let n = this.revisions_.get(e._id);
		if (!n) {
			n = [0, 0];
			this.revisions_.set(e._id, n);
		}
		return n[t === "write" ? 0 : 1];
	}
	recordRevision_(e, t) {
		const n = this.revisions_.get(e);
		if (n) n[t ? 1 : 0] = ++this.revision_;
	}
	registerTopologyReaderFrom(e, t) {
		const n = this.nextReaderId_++;
		this.topology_.register(e._id, n, t);
		return n;
	}
	advanceTopologyReader(e, t, n) {
		this.topology_.advance(e._id, t, n);
	}
	disposeTopologyReader(e, t) {
		this.topology_.dispose(e._id, t);
	}
	/** @internal How many readers hold `component`'s membership journal. */
	topologyReaderCount(e) {
		return this.topology_.readerCount(e._id);
	}
	/** Entities whose `component` was written after `sinceTick`. Says nothing
	*  about WHICH field, or whether the value actually differs. */
	getWrittenEntitiesSince(e, t) {
		return this.writes_.since(e._id, t);
	}
	bufferedWriteRows(e) {
		return this.writes_.buffered(e._id);
	}
	registerWriteReaderFrom(e, t) {
		const n = this.nextReaderId_++;
		this.writes_.register(e._id, n, t);
		return n;
	}
	advanceWriteReader(e, t, n) {
		this.writes_.advance(e._id, t, n);
	}
	disposeWriteReader(e, t) {
		this.writes_.dispose(e._id, t);
	}
	/** @internal How many readers hold `component`'s write journal. */
	writeReaderCount(e) {
		return this.writes_.readerCount(e._id);
	}
	/**
	* A tick-based claim for windows after the current tick. System queries
	* use a cursor instead, distinguishing events within the same tick.
	*/
	registerRemovedReader(e) {
		return this.registerRemovedReaderFrom(e, this.worldTick_ + 1);
	}
	registerRemovedCursorReader(e) {
		const t = this.nextReaderId_++;
		this.removals_.registerCursor(e._id, t);
		return t;
	}
	getRemovalSequence() {
		return this.removals_.sequence();
	}
	getRemovedEntitiesForReader(e, t) {
		return this.removals_.sinceCursor(e._id, t);
	}
	advanceRemovedCursorReader(e, t, n) {
		this.removals_.advanceCursor(e._id, t, n);
	}
	/**
	* A claim starting at an explicit tick, for a reader whose window is not
	* "since I last ran". A sampler that reads with a one-tick overlap must
	* claim from that same floor, or another reader's prune can take a row it
	* was always going to ask for.
	*/
	registerRemovedReaderFrom(e, t) {
		const n = this.nextReaderId_++;
		this.removals_.register(e._id, n, t);
		return n;
	}
	/**
	* This reader has finished a run whose window ended at `lastRunTick`, so it
	* will never ask for a row at or before it again. Tick-based samplers read
	* `tick > lastRunTick`, which is why the claim is the tick after.
	*/
	advanceRemovedReader(e, t, n) {
		this.removals_.advance(e._id, t, n);
	}
	/** Give up the claim, and let the watermark move at once — history with no
	*  owner is not history anyone can ask for. */
	disposeRemovedReader(e, t) {
		this.removals_.dispose(e._id, t);
	}
	/** @internal How many readers hold `component`'s history — for the fixtures
	*  that assert a disposed reader stopped pinning it. */
	removedReaderCount(e) {
		return this.removals_.readerCount(e._id);
	}
	recordAdded(e, t) {
		this.recordRevision_(e._id, true);
		this.componentIncarnations_.get(e._id)?.set(t, this.nextIncarnation_++);
		if (this.topology_.hasReaders(e._id)) this.topology_.record(e._id, t, this.worldTick_);
		if (!this.trackedComponents_.has(e._id)) return;
		const n = this.componentAddedSequences_.get(e._id);
		if (n) {
			this.recordSequence_(n, t);
			return;
		}
		let r = this.componentAddedTicks_.get(e._id);
		if (!r) {
			r = /* @__PURE__ */ new Map();
			this.componentAddedTicks_.set(e._id, r);
		}
		r.set(t, this.worldTick_);
	}
	/**
	* Whether anything is asking about this component's changes. `recordChanged`
	* self-gates on the same answer; this exists so a caller marking a whole
	* query's worth of entities can ask ONCE instead of per entity.
	*/
	isTracked(e) {
		return this.trackedComponents_.has(e._id);
	}
	recordChanged(e, t) {
		this.recordRevision_(e._id, false);
		if (this.writes_.hasReaders(e._id)) this.writes_.record(e._id, t, this.worldTick_);
		if (!this.trackedComponents_.has(e._id)) return;
		const n = this.componentChangedSequences_.get(e._id);
		if (n) {
			this.recordSequence_(n, t);
			this.componentLastChangedTick_.set(e._id, this.worldTick_);
			return;
		}
		let r = this.componentChangedTicks_.get(e._id);
		if (!r) {
			r = /* @__PURE__ */ new Map();
			this.componentChangedTicks_.set(e._id, r);
		}
		r.set(t, this.worldTick_);
		this.componentLastChangedTick_.set(e._id, this.worldTick_);
	}
	recordSequence_(e, t) {
		const n = ++this.changeSequence_;
		e.latest = n;
		const r = e.rows.get(t);
		if (r) {
			r.tick = this.worldTick_;
			r.sequence = n;
		} else e.rows.set(t, {
			tick: this.worldTick_,
			sequence: n
		});
	}
	recordRemoved(e, t) {
		this.recordRemovedById(e._id, t);
	}
	/**
	* The gate lives here rather than in each caller: despawn reaches script
	* components through this id-only entry point and builtins through
	* recordRemoved, and when only the latter checked, the same despawn was
	* recorded for one kind and dropped for the other.
	*/
	recordRemovedById(e, t) {
		this.recordRevision_(e, true);
		this.componentIncarnations_.get(e)?.delete(t);
		if (this.topology_.hasReaders(e)) this.topology_.record(e, t, this.worldTick_);
		if (this.removals_.hasReaders(e)) this.removals_.record(e, t, this.worldTick_);
		if (!this.trackedComponents_.has(e)) return;
		this.componentAddedTicks_.get(e)?.delete(t);
		this.componentChangedTicks_.get(e)?.delete(t);
		this.componentLastChangedTick_.set(e, this.worldTick_);
	}
	/**
	* @internal Live map sizes for the resource census.
	*
	* `removedRows` is bounded by what registered readers still owe: rows exist
	* only while a `Removed` reader holds the component, and are pruned to the
	* lowest claim whenever one advances or goes away.
	*/
	sizes() {
		const e = (e) => {
			let t = 0;
			for (const n of e.values()) t += n.size;
			return t;
		};
		const t = this.removals_.totalRows();
		let n = 0;
		for (const e of this.componentAddedSequences_.values()) n += e.rows.size;
		for (const e of this.componentChangedSequences_.values()) n += e.rows.size;
		return {
			tracked: this.trackedComponents_.size,
			addedRows: e(this.componentAddedTicks_),
			changedRows: e(this.componentChangedTicks_),
			removedRows: t,
			sequenceRows: n
		};
	}
};
//#endregion
//#region src/ecs/QueryCache.ts
var Ka = class {
	constructor() {
		this.structuralVersion_ = 0;
		this.componentVersions_ = /* @__PURE__ */ new Map();
		this.cache_ = /* @__PURE__ */ new Map();
		this.hits_ = 0;
		this.misses_ = 0;
		this.componentInvalidations_ = 0;
	}
	get structuralVersion() {
		return this.structuralVersion_;
	}
	markStructuralChange() {
		this.structuralVersion_++;
	}
	/** A component's current version — for a derived set that has to recompute
	*  when it moves, without standing up a second invalidation scheme. */
	componentVersion(e) {
		return this.componentVersions_.get(e) ?? 0;
	}
	markComponentDirty(e) {
		const t = this.componentVersions_.get(e) ?? 0;
		this.componentVersions_.set(e, t + 1);
	}
	/**
	* Drop every cached result. For changes no per-component version describes —
	* a reorder (see World.applyEntityOrder) moves entities within results that are
	* otherwise still correct, so nothing else would recompute them.
	*/
	invalidateAll() {
		this.cache_.clear();
		this.structuralVersion_++;
	}
	getOrCompute(e, t, n) {
		const r = this.cache_.get(e);
		if (r) {
			if (this.checkValidity_(r, t)) {
				this.hits_++;
				return r.result;
			}
			this.componentInvalidations_++;
		}
		this.misses_++;
		const i = n();
		const a = /* @__PURE__ */ new Map();
		for (const e of t) a.set(e, this.componentVersions_.get(e) ?? 0);
		this.cache_.set(e, {
			componentVersions: a,
			result: i
		});
		return i;
	}
	/** Snapshot of counters. Read-only; callers can diff across frames. */
	getStats() {
		return {
			hits: this.hits_,
			misses: this.misses_,
			componentInvalidations: this.componentInvalidations_,
			size: this.cache_.size
		};
	}
	/** Reset counters without dropping cached entries. */
	resetStats() {
		this.hits_ = 0;
		this.misses_ = 0;
		this.componentInvalidations_ = 0;
	}
	/** True when every dependent component is unchanged since the entry was cached. */
	checkValidity_(e, t) {
		for (const n of t) if ((this.componentVersions_.get(n) ?? 0) !== (e.componentVersions.get(n) ?? 0)) return false;
		return true;
	}
};
//#endregion
//#region src/ecs/bridge/engineApi.ts
let K = null;
/** Install the native host's engine API (by the native runtime); null clears it. */
function qa(e) {
	K = e;
}
/**
* The engine entry points for this app: the wasm module when there is one, else
* the native host's bindings. Null only when neither exists (a pure logic host),
* which every call site already handles by optional-chaining its call.
*/
function Ja(e) {
	return e.wasmModule ?? K;
}
/**
* The native host's engine API, for the few callers that sit BELOW an App — the
* World, which on a device has a registry but no wasm module to reach the engine
* through. Null on the web (where the module is the answer) and on a logic host.
*/
function Ya() {
	return K;
}
/**
* The same answer for a world rather than an app, so a caller holding one does
* not open-code the module-else-native choice this file exists to make. Typed
* structurally: the World imports this module, not the other way round.
*/
function Xa(e) {
	return e.getWasmModule() ?? K;
}
//#endregion
//#region src/ecs/world.ts
/**
* @file    world.ts
* @brief   ECS World with C++ Registry integration
*/
function Za() {
	return t().editorBridge;
}
function q(t, ...n) {
	const r = Za();
	if (!r) return;
	const i = r[t];
	if (typeof i !== "function") return;
	try {
		i.apply(r, n);
	} catch (n) {
		e.warn("world", `EditorBridge.${String(t)} threw`, n);
	}
}
let Qa = 1;
const $a = /* @__PURE__ */ new WeakMap();
function eo(e) {
	let t = $a.get(e);
	if (t === void 0) {
		t = Qa++;
		$a.set(e, t);
	}
	return t;
}
const J = [];
function to(e, t = [], n = [], r) {
	J.length = 0;
	for (const t of e) J.push(eo(t));
	J.sort((e, t) => e - t);
	let i = J.join(",");
	if (t.length > 0) {
		J.length = 0;
		for (const e of t) J.push(eo(e));
		J.sort((e, t) => e - t);
		i += "|+" + J.join(",");
	}
	if (n.length > 0) {
		J.length = 0;
		for (const e of n) J.push(eo(e));
		J.sort((e, t) => e - t);
		i += "|-" + J.join(",");
	}
	if (r) i += "|F=" + r;
	return i;
}
/** Components whose value feeds the world-transform composition. Hierarchy is
*  in here too: a reparent moves a subtree without touching its transforms. */
const no = /* @__PURE__ */ new Set([
	"Transform",
	"Parent",
	"Children"
]);
/**
* The cache dependencies of a query, Disabled included: switching one entity off
* changes what EVERY query answers. Shared because QueryInstance and the AOT
* plan precompute this set once and would each have to remember.
*/
function ro(e, t, n, r = []) {
	const i = [F._id];
	for (const t of e) i.push(t._id);
	for (const e of t) i.push(e._id);
	for (const e of n) i.push(e._id);
	for (const e of r) i.push(e._id);
	return i;
}
/**
* The entity store, as `GetWorld()` hands it to a system — the escape hatch for
* work the declared parameters cannot express. Prefer `Query`/`Res`/`Commands`:
* those declare their access, so the scheduler can see it and the cache can serve
* them. The frozen surface here is what a game does with entities; what the frame
* runner, the query cache and the editor's projection need is `@internal`.
*
* @public
*/
var io = class {
	constructor() {
		this.builtin_ = new Oa();
		this.scripts_ = new Ha();
		this.names_ = new Ua();
		this.changes_ = new Ga();
		this.queries_ = new Ka();
		this.inactive_ = null;
		this.inactiveVersion_ = -1;
		this.coreActivityEpoch_ = -1;
		this.coreDisconnect_ = /* @__PURE__ */ new Set();
		this.entities_ = /* @__PURE__ */ new Map();
		this.indexGeneration_ = /* @__PURE__ */ new Map();
		this.iterationDepth_ = 0;
		this.queryCostEnabled_ = false;
		this.nextEntityIndex_ = 0;
		this.nextGeneration_ = 0;
		this.spawnCallbacks_ = [];
		this.despawnCallbacks_ = [];
		this.assetFieldResolver_ = null;
		this.despawning_ = null;
		this.abortedReported_ = false;
		this.speculation_ = null;
		this.addressOf_ = /* @__PURE__ */ new Map();
	}
	/** @internal */
	get builtin() {
		return this.builtin_;
	}
	/**
	* Bind this world to an engine core. The embedding contract, not the game
	* one: a host instantiates the module and calls this, and everything below
	* reaches the same registry through {@link getCppRegistry}.
	*
	* @internal
	*/
	connectCpp(e, t, n) {
		if (this.getCppRegistry()) this.notifyCoreDisconnect_();
		this.addressOf_.clear();
		this.builtin_.connect(e, t, n);
		for (const t of this.scripts_.getStorageById(F._id)?.keys() ?? []) e.setEntityEnabled?.(t, false);
		this.coreActivityEpoch_ = e.activityEpoch?.() ?? -1;
		this.queries_.markComponentDirty(F._id);
	}
	/** @internal */
	disconnectCpp() {
		this.notifyCoreDisconnect_();
		this.addressOf_.clear();
		this.builtin_.disconnect();
		this.coreActivityEpoch_ = -1;
		this.queries_.markComponentDirty(F._id);
	}
	/** @internal Whether an engine core is bound — false in a pure-JS world. */
	get hasCpp() {
		return this.builtin_.hasCpp;
	}
	/** @internal */
	getCppRegistry() {
		return this.builtin_.getCppRegistry();
	}
	/** @internal Release native leases before the owning core is disconnected. */
	onCoreDisconnect(e) {
		this.coreDisconnect_.add(e);
		return () => {
			this.coreDisconnect_.delete(e);
		};
	}
	notifyCoreDisconnect_() {
		for (const t of [...this.coreDisconnect_]) try {
			t();
		} catch (t) {
			e.warn("world", "Core disconnect callback error", t);
		}
	}
	/** @internal Refresh membership mirrors after an observed native mutation. */
	refreshBuiltinMembership(e, t) {
		if (!w(t) || !this.valid(e)) return;
		const n = this.builtin_.getEntitySet(t._cppName);
		const r = this.builtin_.getBuiltinMethods(t._cppName).has(e);
		if (n && n.has(e) !== r) {
			if (r) n.add(e);
			else n.delete(e);
			this.queries_.markStructuralChange();
		}
		this.queries_.markComponentDirty(t._id);
	}
	/** @internal */
	getWasmModule() {
		return this.builtin_.getWasmModule();
	}
	/**
	* Create an entity with no components. Throws during query iteration —
	* mutating the set a query is walking is what `Commands` exists to defer.
	*/
	spawn(e) {
		if (this.speculation_) throw new Error("Cannot spawn entity inside a speculation. Use its Commands, which allocate no identity until the step commits.");
		if (this.isIterating()) throw new Error("Cannot spawn entity during query iteration. Use Commands to defer entity creation until after iteration completes.");
		const t = this.allocateEntity_();
		this.commitSpawn_(t, e);
		return t;
	}
	/**
	* @internal An identity for a spawn {@link Commands} will apply later — what
	* `cmds.spawn(...).id()` answers while a query is running. Allowed mid-iteration
	* because it touches no component storage: a bare id is in no query. The spawn
	* itself (name, components, spawn callbacks) happens at
	* {@link commitReservedSpawn}, when the commands flush.
	*/
	reserveEntity() {
		if (this.speculation_) throw new Error("Cannot reserve an entity inside a speculation.");
		return this.allocateEntity_();
	}
	/** @internal Finish a spawn begun by {@link reserveEntity}. */
	commitReservedSpawn(e, t) {
		this.commitSpawn_(e, t);
	}
	allocateEntity_() {
		let e;
		const t = this.builtin_.getCppRegistry();
		if (t) try {
			e = t.create();
		} catch (e) {
			R(e, "spawn");
			throw e;
		}
		else {
			const t = ++this.nextEntityIndex_;
			const n = this.indexGeneration_.get(t) ?? 0;
			e = $t(t, n);
		}
		let n = 0;
		const r = this.builtin_.getWasmModule();
		if (r && t) try {
			n = r.registry_getGeneration(t, e);
		} catch {}
		else n = ++this.nextGeneration_;
		this.entities_.set(e, n);
		this.indexGeneration_.set(L(e), Qt(e));
		return e;
	}
	commitSpawn_(t, n) {
		this.queries_.markStructuralChange();
		if (n !== void 0) this.insert(t, I, { value: n });
		for (const n of this.spawnCallbacks_) try {
			n(t);
		} catch (t) {
			e.warn("world", "Spawn callback error", t);
		}
		q("onEntitySpawned", t, n);
	}
	/**
	* Destroy `entity` and its whole subtree — children before parents, so none
	* is left orphaned and still drawing. Already-gone entities are ignored, and
	* as with {@link spawn} this throws during query iteration.
	*/
	despawn(e) {
		if (this.speculation_) throw new Error("Cannot despawn entity inside a speculation. Use its Commands, which apply only if the step commits.");
		if (this.isIterating()) throw new Error("Cannot despawn entity during query iteration. Use Commands to defer entity destruction until after iteration completes.");
		if (!this.valid(e) || this.despawning_?.has(e)) return;
		const t = this.builtin_.getCppRegistry();
		if (t?.destructionPending?.(e)) return;
		this.despawnSubtree_(e, t);
	}
	/** Depth-first teardown of `entity` and its descendants (children before parent). */
	despawnSubtree_(e, t) {
		const n = this.despawning_ ??= /* @__PURE__ */ new Set();
		const r = [], i = [], a = [];
		const o = [{
			entity: e,
			children: null,
			next: 0
		}];
		try {
			while (o.length) {
				const e = o[o.length - 1];
				if (e.children === null) {
					if (!this.valid(e.entity) || n.has(e.entity) || t?.destructionPending?.(e.entity)) {
						o.pop();
						continue;
					}
					n.add(e.entity);
					r.push(e.entity);
					e.children = this.childEntitiesOf_(e.entity, true);
				}
				if (e.next < e.children.length) o.push({
					entity: e.children[e.next++],
					children: null,
					next: 0
				});
				else {
					a.push(e.entity);
					o.pop();
				}
			}
			if (t && t.hasParent(e)) try {
				t.setParent(e, 0);
			} catch (t) {
				R(t, `despawn(detach ${e})`);
			}
			if (t) {
				for (const e of r) if (t.reserveDestruction(e)) i.push(e);
			}
			for (const e of a) if (this.valid(e)) this.despawnOne_(e, t);
		} finally {
			for (const e of i) t.releaseDestruction(e);
			for (const e of r) n.delete(e);
			if (n.size === 0) this.despawning_ = null;
		}
	}
	despawnOne_(t, n) {
		q("onEntityDespawned", t);
		for (const n of this.despawnCallbacks_) try {
			n(t);
		} catch (t) {
			if (t instanceof l) {
				if (!this.abortedReported_) {
					this.abortedReported_ = true;
					e.warn("world", "Despawn callbacks stopped: the engine module has aborted", t);
				}
				continue;
			}
			e.warn("world", "Despawn callback error", t);
		}
		this.names_.remove(t);
		if (n) try {
			n.destroy(t);
		} catch (e) {
			R(e, `despawn(entity=${t})`);
		}
		this.entities_.delete(t);
		this.queries_.markStructuralChange();
		for (const e of this.builtin_.deleteFromEntitySets(t)) {
			const n = O(e);
			if (n) {
				this.changes_.recordRemoved(n, t);
				this.queries_.markComponentDirty(n._id);
			}
		}
		this.queries_.markComponentDirty(N._id);
		this.queries_.markComponentDirty(P._id);
		const r = this.scripts_.removeEntity(t);
		for (const e of r) {
			this.changes_.recordRemovedById(e, t);
			this.queries_.markComponentDirty(e);
		}
	}
	/**
	* Run `callback` whenever an entity is created; the returned function
	* unsubscribes. A throw is logged and swallowed, so one bad listener cannot
	* stop the others or the spawn itself.
	*/
	onSpawn(e) {
		this.spawnCallbacks_.push(e);
		return () => {
			const t = this.spawnCallbacks_.indexOf(e);
			if (t !== -1) this.spawnCallbacks_.splice(t, 1);
		};
	}
	/**
	* Run `callback` whenever an entity is destroyed, once per entity in a
	* subtree teardown; the returned function unsubscribes. This is the hook a
	* per-entity side table is cleaned up from.
	*/
	onDespawn(e) {
		this.despawnCallbacks_ = [...this.despawnCallbacks_, e];
		return () => {
			const t = this.despawnCallbacks_.indexOf(e);
			if (t !== -1) this.despawnCallbacks_ = this.despawnCallbacks_.filter((e, n) => n !== t);
		};
	}
	/** Whether `entity` currently exists. False for one never spawned and for a
	*  despawned one alike — {@link isStale} tells the two apart. */
	valid(e) {
		return this.entities_.has(e);
	}
	/** @internal True throughout subtree teardown, including queued ancestors. */
	isDestructionPending(e) {
		return !!this.despawning_?.has(e) || !!this.builtin_.getCppRegistry()?.destructionPending?.(e);
	}
	/** Effective activity, including ancestors; unlike valid(), an inactive
	* entity remains available for inspection, cleanup and serialization. */
	isEntityActive(e) {
		return this.valid(e) && !this.inactiveEntities_()?.has(e);
	}
	/**
	* True if `entity` refers to a slot that has been recycled — its index is
	* currently live, but held by a *different* generation. Useful for
	* diagnostic logs: `valid()` alone can't distinguish "never existed" from
	* "was despawned and its slot reassigned" since both return false.
	*/
	isStale(e) {
		if (this.entities_.has(e)) return false;
		const t = L(e);
		const n = this.indexGeneration_.get(t);
		return n !== void 0 && n !== Qt(e);
	}
	/** How many entities exist. */
	entityCount() {
		return this.entities_.size;
	}
	/**
	* @internal Live sizes of every map the world keeps, for the resource census.
	*
	* `indexSlots` never shrinks by design — it is keyed by entity INDEX, which
	* the registry recycles, so it settles at the session's peak. One that keeps
	* climbing means indices are not being reused, which entityCount() cannot show.
	*/
	getStorageSizes() {
		return {
			entities: this.entities_.size,
			indexSlots: this.indexGeneration_.size,
			spawnCallbacks: this.spawnCallbacks_.length,
			despawnCallbacks: this.despawnCallbacks_.length,
			coreDisconnectCallbacks: this.coreDisconnect_.size,
			names: this.names_.sizes(),
			scripts: this.scripts_.sizes(),
			changes: this.changes_.sizes(),
			queryCacheEntries: this.queries_.getStats().size
		};
	}
	/** @internal Structural version the query cache invalidates against. */
	getWorldVersion() {
		this.syncActivityEpoch_();
		return this.queries_.structuralVersion;
	}
	/** @internal Cumulative query-cache counters (hits, misses, invalidation causes). */
	getQueryCacheStats() {
		return this.queries_.getStats();
	}
	/** @internal Reset the query-cache counters. Entries themselves are kept. */
	resetQueryCacheStats() {
		this.queries_.resetStats();
	}
	/**
	* @internal Whether queries count what they scan. Per-World rather than a
	* module flag: the editor realm and the play realm are separate Apps in one
	* process, and a shared switch would have each turn the other's accounting on.
	*/
	setQueryCostEnabled(e) {
		this.queryCostEnabled_ = e;
	}
	/** @internal */
	get queryCostEnabled() {
		return this.queryCostEnabled_;
	}
	/** @internal Iteration depth is what makes spawn/despawn refuse mid-query. */
	beginIteration() {
		this.iterationDepth_++;
	}
	/** @internal */
	endIteration() {
		this.iterationDepth_--;
		if (this.iterationDepth_ < 0) {
			e.warn("world", "World.endIteration: mismatched begin/end calls");
			this.iterationDepth_ = 0;
		}
	}
	/** @internal Depth is reset rather than unwound when a frame aborts. */
	resetIterationDepth() {
		this.iterationDepth_ = 0;
	}
	/**
	* @internal Set the guard aside for a system suspended at an `await`, and
	* give it back when that system resumes.
	*
	* The depth is the WORLD's, and a system parked mid-query would otherwise
	* lend its iteration to whoever runs next: their spawn is refused for an
	* iteration that is not theirs, and their reset frees a query still walking.
	*/
	suspendIteration() {
		const e = this.iterationDepth_;
		this.iterationDepth_ = 0;
		return e;
	}
	/** @internal Pairs with {@link suspendIteration}. */
	resumeIteration(e) {
		this.iterationDepth_ = e;
	}
	/** @internal */
	isIterating() {
		return this.iterationDepth_ > 0;
	}
	/** Every entity, in storage order — which is the order queries walk and,
	*  within a sorting layer, the order the renderer draws. A fresh array. */
	getAllEntities() {
		return Array.from(this.entities_.keys());
	}
	/**
	* Reorder the world's storage so every iteration follows `entities`.
	*
	* Within a sorting layer the renderer draws in the order it walks the ECS —
	* so an entity that iterates later lands on top. That order is storage order,
	* which a scene gets for free by spawning in its authored order and which this
	* re-establishes on a world that is already populated: the picture a reload
	* would give, without respawning anything (entity ids, component values and
	* every subsystem keyed on them survive untouched).
	*
	* Entities left out of `entities` keep their relative order after the listed
	* ones. Both halves of the world move together — the engine's component pools
	* and the JS-side storages the SDK's own queries walk — so an editor's outliner
	* drag and a game's "bring this card to the front" mean one thing.
	*
	* @param entities the desired iteration order (first iterates first, draws first)
	*/
	/** @internal */
	applyEntityOrder(t) {
		if (t.length === 0) return;
		if (this.isIterating()) {
			e.warn("world", "applyEntityOrder ignored during query iteration");
			return;
		}
		const n = ua(t);
		this.pushEntityOrderToCore_(t);
		da(this.entities_, n);
		this.builtin_.reorderEntitySets(n);
		this.scripts_.reorderStorages(n);
		this.queries_.invalidateAll();
	}
	/** Marshal the order to whichever core is connected (see applyEntityOrder). */
	pushEntityOrderToCore_(e) {
		const t = this.builtin_.getCppRegistry();
		if (!t) return;
		const n = Xa(this);
		const r = n?.renderer_setEntityDrawOrder;
		if (!n || !r || !n._malloc || !n._free || !n.HEAPU32) return;
		try {
			u({
				_malloc: n._malloc,
				_free: n._free
			}, (i) => {
				const a = i(e.length * 4);
				n.HEAPU32.set(e, a >> 2);
				r.call(n, t, a, e.length);
			});
		} catch (t) {
			R(t, `applyEntityOrder(count=${e.length})`);
		}
	}
	/** Keep {@link Parent} and {@link Children} consistent when reparenting. */
	setParent(e, t) {
		this.trySetParent(e, t);
	}
	/** Reject invalid relationships without changing hierarchy or notifications. */
	trySetParent(e, t) {
		if (t === 4294967295) t = 0;
		if (this.despawning_?.has(e) || this.despawning_?.has(t)) return false;
		if (!this.valid(e) || t !== 0 && !this.valid(t)) return false;
		const n = this.builtin_.getCppRegistry();
		if (n) try {
			if ((n.hasParent(e) ? n.getParent(e).entity : 0) === t) return !n.destructionPending?.(e) && !n.destructionPending?.(t);
			if (n.setParent(e, t) === false) return false;
		} catch (n) {
			R(n, `setParent(child=${e}, parent=${t})`);
			return false;
		}
		const r = t === 0 ? null : t;
		this.trackHierarchyWrite_(e, r);
		q("onParentChanged", e, r);
		return true;
	}
	/** Detach `entity` from its parent, leaving its own children attached to it. */
	removeParent(e) {
		if (this.despawning_?.has(e)) return;
		if (!this.valid(e)) return;
		const t = this.builtin_.getCppRegistry();
		if (t?.destructionPending?.(e)) return;
		if (t) try {
			t.removeParent(e);
		} catch (t) {
			R(t, `removeParent(entity=${e})`);
		}
		this.trackHierarchyWrite_(e, null);
		q("onParentChanged", e, null);
	}
	/** `entity`'s children, snapshotted out of the wasm vector that holds them. */
	childEntitiesOf_(e, t = false) {
		const n = this.builtin_.getCppRegistry();
		if (!n || !n.hasChildren(e)) return [];
		const r = [];
		try {
			const t = n.getChildren(e).entities;
			try {
				const e = t.size();
				for (let n = 0; n < e; n++) r.push(t.get(n));
			} finally {
				t.delete();
			}
		} catch (n) {
			R(n, `getChildren(entity=${e})`);
			if (t) throw n;
		}
		return r;
	}
	insertHierarchy_(e, t, n) {
		if (t._id === N._id) {
			const t = n?.entity;
			if (t === void 0 || t === 0) {
				this.removeParent(e);
				return { entity: 0 };
			}
			this.setParent(e, t);
			return this.has(e, N) ? this.get(e, N) : { entity: 0 };
		}
		const r = n?.entities ?? [];
		for (const t of r) this.setParent(t, e);
		return { entities: this.builtin_.hasCpp ? this.childEntitiesOf_(e) : [...r] };
	}
	isHierarchyComponent_(e) {
		return e._id === N._id || e._id === P._id;
	}
	trackHierarchyWrite_(e, t) {
		const n = this.builtin_.getOrCreateEntitySet(N._cppName);
		const r = this.builtin_.getOrCreateEntitySet(P._cppName);
		if (this.scripts_.getStorageById(F._id)?.size) this.queries_.markComponentDirty(F._id);
		if (t === null) {
			if (n.delete(e)) this.changes_.recordRemoved(N, e);
		} else {
			if (!n.has(e)) {
				n.add(e);
				this.changes_.recordAdded(N, e);
			}
			this.recordComponentWrite_(e, N);
			if (!r.has(t)) {
				r.add(t);
				this.changes_.recordAdded(P, t);
			}
			this.recordComponentWrite_(t, P);
		}
		this.queries_.markStructuralChange();
		this.queries_.markComponentDirty(N._id);
		this.queries_.markComponentDirty(P._id);
	}
	/**
	* Add `component` to `entity`, with `data` merged over the component's
	* defaults, and answer the stored value. Adding one that is already there
	* replaces it.
	*/
	insert(e, t, n) {
		this.speculation_?.record(this, e, t);
		if (this.isHierarchyComponent_(t)) return this.insertHierarchy_(e, t, n);
		if (w(t)) {
			const r = this.takeAssetRefs_(t, n);
			const i = this.insertBuiltin_(e, t, r?.clean ?? n);
			if (r) this.resolveAssetRefs_(e, t, r.authored);
			return i;
		}
		return this.insertScript_(e, t, n);
	}
	/**
	* Store a whole component value and stamp the change tick a `Changed` filter
	* reads. Insert-or-replace: an entity that lacks the component gets it.
	*/
	set(e, t, n) {
		this.speculation_?.record(this, e, t);
		if (this.isHierarchyComponent_(t)) {
			this.insertHierarchy_(e, t, n);
			return;
		}
		if (w(t)) {
			const r = this.takeAssetRefs_(t, n);
			if (r) {
				this.set(e, t, r.clean);
				this.resolveAssetRefs_(e, t, r.authored);
				return;
			}
			if (this.builtin_.hasCpp && !this.has(e, t)) {
				this.insert(e, t, n);
				return;
			}
			if (this.builtin_.hasCpp) try {
				const r = t._default;
				const i = n;
				let a = i;
				for (const e of Object.keys(i)) if (!d(r, e)) {
					if (a === i) a = { ...i };
					delete a[e];
				}
				a = Re(r, a);
				this.builtin_.replace(e, t._cppName, H(a, t.colorKeys), t.entityFields ?? []);
			} catch (n) {
				R(n, `set(${t._name}, entity=${e})`);
			}
			this.recordComponentWrite_(e, t);
			q("onComponentChanged", e, t._name);
			return;
		}
		const { isNew: r } = this.scripts_.set(e, t, n);
		if (r) {
			this.queries_.markComponentDirty(t._id);
			this.queries_.markStructuralChange();
			this.changes_.recordAdded(t, e);
			q("onComponentAdded", e, t._name);
		}
		this.recordComponentWrite_(e, t);
		if (t._id === I._id) this.names_.update(e, n.value);
		q("onComponentChanged", e, t._name);
	}
	/**
	* @internal What turns an asset path written into an engine-backed
	* component's handle field (`Sprite.texture = 'assets/hero.png'`,
	* `MeshRenderer.mesh = 'builtin:cube'`) into the handle. Installed by the
	* asset layer on every core; see bindAssetReferenceTracking.
	*/
	setAssetFieldResolver(e) {
		this.assetFieldResolver_ = e;
	}
	/**
	* An engine-backed component's asset fields hold handles, and the engine
	* cannot store a string there: written straight through, `texture` read
	* back as the path while the engine held 0, and nothing drew. A string in
	* one is a path to load — the same ref a scene file carries — so it leaves
	* the data here (the field takes its default until the load lands) and goes
	* to the resolver.
	*/
	takeAssetRefs_(e, t) {
		const n = e.assetFields;
		if (!t || !n || n.length === 0) return null;
		let r = null;
		for (const { field: i } of n) {
			if (typeof t[i] !== "string") continue;
			r ??= { ...t };
			r[i] = e._default[i] ?? 0;
		}
		return r ? {
			clean: r,
			authored: t
		} : null;
	}
	resolveAssetRefs_(t, n, r) {
		if (this.assetFieldResolver_) {
			this.assetFieldResolver_(t, n, r);
			return;
		}
		e.warn("world", `${n._name} on entity ${t} was given an asset path, but this world has no asset layer to load it: the field holds no handle. Load it first (await assets.loadTexture(path)) and write the handle.`);
	}
	/**
	* Edit a component in place and report the change — the write path for
	* "read it, adjust a field, keep the rest". The draft is BORROWED for the
	* call, and for a script component it IS the stored object, so nothing may
	* keep it. Reporting is unconditional; a false positive costs one look.
	*
	* @throws if `entity` does not carry `component`.
	*/
	update(e, t, n) {
		if (!this.has(e, t)) throw new Error(`update(${t._name}, entity=${e}): the entity does not carry it. Use insert() or set() to add a component.`);
		if (w(t)) {
			const r = this.builtin_.get(e, t);
			try {
				n(r);
			} finally {
				this.set(e, t, r);
			}
			return;
		}
		const r = this.scripts_.get(e, t);
		try {
			n(r);
		} finally {
			this.recordComponentWrite_(e, t);
			if (t._id === I._id) this.names_.update(e, r.value);
			q("onComponentChanged", e, t._name);
		}
	}
	/**
	* The component's value, to READ. Writing to the result is deprecated: it
	* stores nothing for an engine-backed component and changes a script one
	* with nothing observing it — use {@link update}, {@link set} or `Mut()`.
	* Asking for a component the entity lacks throws; {@link tryGet} allows it.
	*/
	get(e, t) {
		this.speculation_?.record(this, e, t);
		if (w(t)) return this.builtin_.get(e, t);
		return this.scripts_.get(e, t);
	}
	/** Whether `entity` carries `component`. */
	has(e, t) {
		if (t._builtin) {
			if (!this.builtin_.hasCpp) return false;
			const n = t._cppName;
			const r = this.builtin_.getEntitySet(n);
			if (r) return r.has(e);
			return this.builtin_.getBuiltinMethods(n).has(e);
		}
		return this.scripts_.has(e, t);
	}
	/** {@link get}, answering null instead of throwing when the component is
	*  absent. Reading only, on the same terms — writing to the result is
	*  deprecated; {@link update} is the edit. */
	tryGet(e, t) {
		this.speculation_?.record(this, e, t);
		if (w(t)) {
			if (!this.builtin_.hasCpp) return null;
			const n = this.builtin_.getEntitySet(t._cppName);
			if (n && !n.has(e)) return null;
			try {
				const r = this.builtin_.getBuiltinMethods(t._cppName);
				if (!n && !r.has(e)) return null;
				return W(r.get(e), t);
			} catch (n) {
				R(n, `tryGet(${t._name}, entity=${e})`);
				return null;
			}
		}
		const n = this.scripts_.getStorageById(t._id);
		if (!n) return null;
		const r = n.get(e);
		return r !== void 0 ? r : null;
	}
	/** Take `component` off `entity`. Throws during query iteration, as
	*  {@link spawn} does. */
	remove(e, t) {
		this.speculation_?.record(this, e, t);
		if (this.isIterating()) throw new Error("Cannot remove component during query iteration. Use Commands to defer component removal until after iteration completes.");
		if (t._id === N._id) {
			this.removeParent(e);
			return;
		}
		if (t._id === P._id) {
			for (const t of this.childEntitiesOf_(e)) this.removeParent(t);
			return;
		}
		if (w(t)) {
			this.builtin_.remove(e, t);
			this.changes_.recordRemoved(t, e);
			this.queries_.markComponentDirty(t._id);
			this.queries_.markStructuralChange();
			q("onComponentRemoved", e, t._name);
		} else this.removeScript_(e, t);
	}
	insertBuiltin_(e, t, n) {
		const { merged: r, isNew: i } = this.builtin_.insert(e, t, n);
		if (i) {
			this.queries_.markComponentDirty(t._id);
			this.queries_.markStructuralChange();
			this.changes_.recordAdded(t, e);
			q("onComponentAdded", e, t._name);
		}
		this.recordComponentWrite_(e, t);
		q("onComponentChanged", e, t._name);
		return r;
	}
	insertScript_(e, t, n) {
		const { value: r, isNew: i } = this.scripts_.insert(e, t, n);
		if (i) {
			this.queries_.markComponentDirty(t._id);
			this.queries_.markStructuralChange();
			this.changes_.recordAdded(t, e);
			q("onComponentAdded", e, t._name);
		}
		this.recordComponentWrite_(e, t);
		if (t._id === I._id) this.names_.update(e, r.value);
		q("onComponentChanged", e, t._name);
		return r;
	}
	removeScript_(e, t) {
		if (t._id === I._id) this.names_.remove(e);
		this.scripts_.remove(e, t);
		if (t._id === F._id) this.builtin_.getCppRegistry()?.setEntityEnabled?.(e, true);
		this.changes_.recordRemoved(t, e);
		this.queries_.markComponentDirty(t._id);
		this.queries_.markStructuralChange();
		q("onComponentRemoved", e, t._name);
	}
	/** The entity with this {@link Name}, or null. Names are not identities —
	*  with two matches, which one comes back is not defined. */
	findEntityByName(e) {
		return this.names_.findByName(e);
	}
	/** @internal Pre-resolve a component to its direct storage/getter for fast iteration. */
	resolveGetter(e, t = "borrowed") {
		if (w(e)) {
			if (!this.builtin_.hasCpp) return null;
			if (this.builtin_.getWasmModule()) {
				const n = this.builtin_.resolvePtrGetter(e._cppName, t);
				if (n) return n;
			}
			const n = this.builtin_.getBuiltinMethods(e._cppName);
			if (e.colorKeys.length === 0 && e.entityFields.length === 0 && U(e._cppName).length === 0) return (e) => n.get(e);
			return (t) => W(n.get(t), e);
		}
		const n = this.scripts_.getStorageById(e._id);
		if (!n) return null;
		return (e) => n.get(e);
	}
	/** @internal Pre-resolve a component to a direct has-check for fast query matching. */
	resolveHas(e) {
		if (w(e)) {
			if (!this.builtin_.hasCpp) return null;
			const t = this.builtin_.getBuiltinMethods(e._cppName);
			return (e) => t.has(e);
		}
		const t = this.scripts_.getStorageById(e._id);
		if (!t) return null;
		return (e) => t.has(e);
	}
	/** @internal Pre-resolve a component to a direct setter for fast Mut write-back. */
	resolveSetter(e) {
		if (w(e)) {
			if (!this.builtin_.hasCpp) return null;
			if (this.builtin_.getWasmModule()) {
				const t = this.builtin_.resolvePtrSetter(e._cppName);
				if (t) return t;
			}
			const t = e._cppName;
			const { colorKeys: n, entityFields: r } = e;
			if (n.length === 0 && r.length === 0 && U(t).length === 0) {
				const e = this.builtin_.getBuiltinMethods(t);
				return (t, n) => e.add(t, n);
			}
			return (e, i) => this.builtin_.replace(e, t, H(i, n), r);
		}
		if (!this.scripts_.getStorageById(e._id)) return null;
		return (t, n) => {
			this.scripts_.set(t, e, n);
		};
	}
	/** @internal Per-frame reuse of the query instance pool. */
	resetQueryPool() {}
	/** The names of every component on `entity` — for inspectors and diagnostics;
	*  a system asks {@link has} about the definitions it knows. */
	getComponentTypes(e) {
		return this.componentTypes_(e);
	}
	/** @internal Inspect a group with one script catalogue index, preserving input order. */
	getComponentTypesBatch(e) {
		if (e.length === 0) return [];
		const t = /* @__PURE__ */ new Map();
		for (const [e, n] of D()) if (!t.has(n._id)) t.set(n._id, e);
		return e.map((e) => this.componentTypes_(e, t));
	}
	componentTypes_(t, n) {
		const r = this.builtin_.componentNames(t);
		const i = new Set(r ?? []);
		const a = this.builtin_.getMethodCache();
		for (const [n, o] of r === null ? a : this.builtin_.getExtraMethodCache()) try {
			if (o.has(t)) i.add(n);
		} catch (t) {
			e.warn("world", `Component check failed for ${n}`, t);
		}
		if (this.builtin_.hasCpp) {
			for (const [n, o] of r === null ? Qe() : $e()) if (w(o) && !a.has(n)) try {
				if (this.builtin_.getBuiltinMethods(o._cppName).has(t)) i.add(n);
			} catch (t) {
				e.warn("world", `Builtin check failed for ${n}`, t);
			}
		}
		const o = this.scripts_.getEntityComponentIds(t);
		if (o) {
			const e = n ? null : D();
			for (const t of o) {
				if (n) {
					const e = n.get(t);
					if (e !== void 0) i.add(e);
					continue;
				}
				for (const [n, r] of e) if (r._id === t) {
					i.add(n);
					break;
				}
			}
		}
		return Array.from(i);
	}
	/**
	* Every entity switched off, ITSELF or by an ancestor.
	*
	* Derived, not tagged down the tree: a scene that wrote the tag on each
	* descendant would lose which of them the author switched off. Recomputed
	* when the tag or the hierarchy moves; free when nothing is switched off.
	*/
	inactiveEntities_() {
		const e = this.builtin_.getCppRegistry();
		if (e?.isEntityActive && e.hasInactiveEntities) return e.hasInactiveEntities() ? { has: (t) => !e.isEntityActive(t) } : null;
		const t = this.scripts_.getStorageById(F._id);
		if (!t || t.size === 0) return null;
		const n = this.queries_.componentVersion(F._id);
		if (this.inactive_ && this.inactiveVersion_ === n) return this.inactive_.set;
		const r = /* @__PURE__ */ new Set();
		const i = (e) => {
			if (r.has(e)) return;
			r.add(e);
			if (!this.has(e, P)) return;
			for (const t of this.get(e, P).entities) i(t);
		};
		for (const e of t.keys()) i(e);
		this.inactive_ = { set: r };
		this.inactiveVersion_ = n;
		return r;
	}
	resolveStorages_(e, t, n) {
		for (const r of e) if (w(r)) {
			if (!this.builtin_.hasCpp) return false;
			n.push(this.builtin_.getBuiltinMethods(r._cppName));
		} else {
			const e = this.scripts_.getStorageById(r._id);
			if (!e) return false;
			t.push(e);
		}
		return true;
	}
	collectComponentIds_(e, t, n) {
		return ro(e, t, n);
	}
	/**
	* Entities carrying every component in `components`, narrowed by `with` and
	* `without`. Answered from the query cache, so calling it every frame is the
	* intended use; the array is the cache's own and must not be mutated.
	*
	* @public
	*/
	getEntitiesWithComponents(e, t = [], n = []) {
		return this.queryEntities(e, t, n);
	}
	/**
	* @internal The same walk, with the cache key, dependency ids and predicate
	* filter supplied by the caller. `QueryInstance` computes those once per
	* query so a cache hit allocates nothing — which is why they are not
	* parameters of the frozen door above: they are the cache's shape, and
	* freezing them would freeze it.
	*/
	queryEntities(e, t = [], n = [], r, i, a) {
		this.syncActivityEpoch_();
		const o = r ?? to(e, t, n);
		let s;
		if (a) s = a;
		else {
			s = this.collectComponentIds_(e, t, n);
			if (i) for (const e of i.deps) s.push(e._id);
		}
		const c = e.includes(F) || t.includes(F) || n.includes(F);
		return this.queries_.getOrCompute(o, s, () => {
			const r = [];
			const a = c ? null : this.inactiveEntities_();
			const o = [];
			const s = [];
			if (!this.resolveStorages_(e, o, s)) return [];
			let l = null;
			let u = null;
			if (t.length > 0) {
				l = [];
				u = [];
				if (!this.resolveStorages_(t, l, u)) return [];
			}
			let d = null;
			let f = null;
			if (n.length > 0) {
				d = [];
				f = [];
				this.resolveStorages_(n, d, f);
			}
			let p = null;
			let m = Infinity;
			for (let e = 0; e < o.length; e++) {
				const t = o[e].size;
				if (t < m) {
					m = t;
					p = o[e];
				}
			}
			for (const t of e) if (w(t)) {
				const e = this.builtin_.getEntitySet(t._cppName);
				if (e && e.size < m) {
					m = e.size;
					p = e;
				}
			}
			const h = p ? p.keys() : this.entities_.keys();
			const g = o.length;
			const _ = s.length;
			for (const e of h) {
				if (a?.has(e)) continue;
				let t = true;
				for (let n = 0; n < g; n++) if (!o[n].has(e)) {
					t = false;
					break;
				}
				if (t) {
					for (let n = 0; n < _; n++) if (!s[n].has(e)) {
						t = false;
						break;
					}
				}
				if (t && l) {
					for (let n = 0; n < l.length; n++) if (!l[n].has(e)) {
						t = false;
						break;
					}
					if (t) {
						for (let n = 0; n < u.length; n++) if (!u[n].has(e)) {
							t = false;
							break;
						}
					}
				}
				if (t && d) {
					for (let n = 0; n < d.length; n++) if (d[n].has(e)) {
						t = false;
						break;
					}
					if (t) {
						for (let n = 0; n < f.length; n++) if (f[n].has(e)) {
							t = false;
							break;
						}
					}
				}
				if (t && i && !i.match(e)) t = false;
				if (t) r.push(e);
			}
			return r;
		});
	}
	/** @internal The frame runner's clock for change detection. */
	advanceTick() {
		this.changes_.advanceTick();
	}
	/** @internal */
	getWorldTick() {
		return this.changes_.getWorldTick();
	}
	/** @internal Opted into by a query that declares an Added/Changed filter;
	*  tracking every component would cost every write. */
	enableChangeTracking(e) {
		this.changes_.enableChangeTracking(e);
	}
	/** @internal Opt a system query into precise change boundaries, separately from tick sampling. */
	enableChangeSequenceTracking(e, t) {
		this.changes_.enableChangeSequenceTracking(e, t);
	}
	/** @internal Latest opted-in component mutation sequence. */
	getChangeSequence() {
		return this.changes_.getChangeSequence();
	}
	/** @internal Bind a live sequence index once for a system query's entity loop. */
	resolveChangeSequenceMatcher(e, t) {
		return this.changes_.resolveChangeSequenceMatcher(e, t);
	}
	/** @internal Live additions after a completed system boundary. */
	isAddedAfterSequence(e, t, n) {
		return this.changes_.isAddedAfterSequence(e, t, n);
	}
	/** @internal Live changes after a completed system boundary. */
	isChangedAfterSequence(e, t, n) {
		return this.changes_.isChangedAfterSequence(e, t, n);
	}
	/** @internal O(1) empty-window checks before enumerating system query candidates. */
	anyAddedAfterSequence(e, t) {
		return this.changes_.anyAddedAfterSequence(e, t);
	}
	/** @internal O(1) empty-window checks before enumerating system query candidates. */
	anyChangedAfterSequence(e, t) {
		return this.changes_.anyChangedAfterSequence(e, t);
	}
	/** @internal Opt in to live component identities, independent of frame ticks. */
	enableIncarnationTracking(e) {
		this.changes_.enableIncarnationTracking(e);
	}
	/** @internal Changes on remove/reinsert, including multiple edits in one tick.
	* Components present before tracking was enabled share the initial identity 0. */
	getComponentIncarnation(e, t) {
		return this.changes_.getComponentIncarnation(e, t);
	}
	/** @internal What `Added`/`Changed` filters are implemented in terms of. */
	isAddedSince(e, t, n) {
		return this.changes_.isAddedSince(e, t, n);
	}
	/** @internal */
	isChangedSince(e, t, n) {
		return this.changes_.isChangedSince(e, t, n);
	}
	/** @internal True if ANY entity changed `component` after `sinceTick` (O(1) gate). */
	anyChangedSince(e, t) {
		return this.changes_.anyChangedSince(e, t);
	}
	/** @internal What a `Removed` query reads. */
	getRemovedEntitiesSince(e, t) {
		return this.changes_.getRemovedEntitiesSince(e, t);
	}
	/** @internal A tick-based removal lease for samples after the current tick. */
	registerRemovedReader(e) {
		return this.changes_.registerRemovedReader(e);
	}
	/** @internal A removal lease starting at the current event sequence. */
	registerRemovedCursorReader(e) {
		return this.changes_.registerRemovedCursorReader(e);
	}
	/** @internal Latest removal sequence, independent of frame ticks. */
	getRemovalSequence() {
		return this.changes_.getRemovalSequence();
	}
	/** @internal Unacknowledged removals belonging to this cursor reader. */
	getRemovedEntitiesForReader(e, t) {
		return this.changes_.getRemovedEntitiesForReader(e, t);
	}
	/** @internal Release only events this run observed, preserving later removals. */
	advanceRemovedCursorReader(e, t, n) {
		this.changes_.advanceRemovedCursorReader(e, t, n);
	}
	/** @internal A claim from an explicit tick, for a reader that reads with an
	*  overlap rather than "since I last ran". */
	registerRemovedReaderFrom(e, t) {
		return this.changes_.registerRemovedReaderFrom(e, t);
	}
	/** @internal That reader is done with everything up to `lastRunTick`. */
	advanceRemovedReader(e, t, n) {
		this.changes_.advanceRemovedReader(e, t, n);
	}
	/** @internal The reader is gone; its share of the watermark goes with it. */
	disposeRemovedReader(e, t) {
		this.changes_.disposeRemovedReader(e, t);
	}
	/** @internal How many readers hold `component`'s removal history. */
	removedReaderCount(e) {
		return this.changes_.removedReaderCount(e);
	}
	/** @internal A claim on `component`'s MEMBERSHIP journal — who gained or
	*  lost it — independent of ordinary change tracking. */
	registerTopologyReaderFrom(e, t) {
		return this.changes_.registerTopologyReaderFrom(e, t);
	}
	/** @internal A mutation cursor distinguishes writes within one world tick. */
	registerMutationCursor(e, t) {
		return this.changes_.registerMutationCursor(e, t);
	}
	/** @internal Current boundary to acknowledge after a successful read. */
	mutationSequence(e) {
		return this.changes_.mutationSequence(e);
	}
	/** @internal Component stamps survive released mutation-history readers. */
	mutationRevision(e, t) {
		return this.changes_.mutationRevision(e, t);
	}
	/** @internal Unacknowledged component mutations for this reader. */
	mutationsForCursor(e, t, n) {
		return this.changes_.mutationsForCursor(e, t, n);
	}
	/** @internal Preserve mutations that arrived after the read's boundary. */
	advanceMutationCursor(e, t, n, r) {
		this.changes_.advanceMutationCursor(e, t, n, r);
	}
	/** @internal Release this reader's history claim. */
	disposeMutationCursor(e, t, n) {
		this.changes_.disposeMutationCursor(e, t, n);
	}
	/** @internal Entities worth re-reading because their membership moved. */
	getTopologyChangedEntitiesSince(e, t) {
		return this.changes_.getTopologyChangedEntitiesSince(e, t);
	}
	/** @internal That reader is done with everything up to `lastRunTick`. */
	advanceTopologyReader(e, t, n) {
		this.changes_.advanceTopologyReader(e, t, n);
	}
	/** @internal The reader is gone; its share of the watermark goes with it. */
	disposeTopologyReader(e, t) {
		this.changes_.disposeTopologyReader(e, t);
	}
	/** @internal How many readers hold `component`'s membership journal. */
	topologyReaderCount(e) {
		return this.changes_.topologyReaderCount(e);
	}
	/** @internal A claim on `component`'s WRITE journal — which entities had it
	*  written, enumerable sparsely, unlike the per-entity changed map. */
	registerWriteReaderFrom(e, t) {
		return this.changes_.registerWriteReaderFrom(e, t);
	}
	/** @internal Entities whose `component` was written after `sinceTick`. */
	getWrittenEntitiesSince(e, t) {
		return this.changes_.getWrittenEntitiesSince(e, t);
	}
	/** @internal An O(1) upper bound on what `getWrittenEntitiesSince` returns,
	*  for a caller choosing between reading the journal and a scan. */
	bufferedWriteRows(e) {
		return this.changes_.bufferedWriteRows(e);
	}
	/** @internal That reader is done with everything up to `lastRunTick`. */
	advanceWriteReader(e, t, n) {
		this.changes_.advanceWriteReader(e, t, n);
	}
	/** @internal The reader is gone; its share of the watermark goes with it. */
	disposeWriteReader(e, t) {
		this.changes_.disposeWriteReader(e, t);
	}
	/** @internal How many readers hold `component`'s write journal. */
	writeReaderCount(e) {
		return this.changes_.writeReaderCount(e);
	}
	/**
	* @internal One place for "this component was written".
	*
	* The composition epoch hangs off the LOGICAL mutation contract, not off the
	* storage path: `set`, `insert`, `update` and a `Mut` write-back all arrive
	* here whether or not the fast pointer setter moved the bytes.
	*/
	recordComponentWrite_(e, t) {
		if (t._id === F._id) this.builtin_.getCppRegistry()?.setEntityEnabled?.(e, false);
		if (no.has(t._name)) this.builtin_.invalidateTransformComposition();
		this.changes_.recordChanged(t, e);
	}
	syncActivityEpoch_() {
		const e = this.builtin_.getCppRegistry()?.activityEpoch?.();
		if (e === void 0 || e === this.coreActivityEpoch_) return;
		if (this.coreActivityEpoch_ === -1) {
			this.coreActivityEpoch_ = e;
			return;
		}
		this.coreActivityEpoch_ = e;
		this.queries_.markComponentDirty(F._id);
		this.queries_.markStructuralChange();
	}
	/** @internal Say composed world transforms are stale, for a producer that
	*  wrote the bytes without going through the mutation seam. */
	invalidateTransformComposition() {
		this.builtin_.invalidateTransformComposition();
	}
	/** @internal Compose world transforms if a producer invalidated them. */
	ensureTransformsComposed() {
		this.builtin_.ensureTransformsComposed();
	}
	/** @internal What the composition staleness counter reads. */
	transformEpoch() {
		return this.builtin_.transformEpoch();
	}
	/** @internal Ask composition to record which entities' output changed.
	*  Answers whether this core can report it at all. */
	setTransformChangeTracking(e) {
		return this.builtin_.setTransformChangeTracking(e);
	}
	/** @internal What every composition since the last acknowledgement changed;
	*  null from a core that cannot say. The ids view engine memory, so a
	*  consumer reads, applies and acknowledges within one turn. */
	compositionChanges() {
		return this.builtin_.compositionChanges();
	}
	/** @internal Acknowledge that set: it starts again. */
	takeCompositionChanges() {
		this.builtin_.takeCompositionChanges();
	}
	/** @internal Mark component as changed without writing data (for in-place Mut query) */
	markChanged(e, t) {
		this.recordComponentWrite_(e, t);
	}
	/** @internal */
	openSpeculation(e) {
		if (this.speculation_) throw new Error("A speculation is already open on this World — nesting is not supported.");
		this.speculation_ = e;
	}
	/** @internal */
	closeSpeculation() {
		this.speculation_ = null;
	}
	/** @internal Whether a step that can be taken back is running. */
	get speculating() {
		return this.speculation_ !== null;
	}
	/** @internal Whether any query is asking about `component`'s changes. */
	isChangeTracked(e) {
		return this.changes_.isTracked(e);
	}
	/**
	* @internal Where script-component rows are allocated from. A wasm runtime
	* installs linear memory here BEFORE any component is added, because
	* compiled code cannot reach a JS-heap array.
	*/
	useScriptPoolMemory(e, t = false) {
		this.scripts_.usePoolMemory(e, t);
	}
	/**
	* @internal `component`'s bytes for `entity`, in the memory compiled code
	* reads: an engine component through the bridge, a script one through its
	* pool. Undefined where there are no flat bytes. The resolver is cached per
	* component — finding it walks a generated table, and this is asked once per
	* entity per frame.
	*/
	addressOfComponent(e, t) {
		return this.addressResolver(e)(t);
	}
	/**
	* @internal One number for "could any component have moved since you last
	* asked": the engine's pools (`Registry::layoutEpoch`) plus this SDK's own (a
	* claimed, released or grown script row). Null where the engine cannot be
	* asked, which means re-resolve. It says nothing about which entities MATCH;
	* that is the query cache's answer, and a caller needing both asks both.
	*/
	layoutEpoch() {
		const e = this.builtin_.layoutEpoch();
		if (e === null && this.builtin_.hasCpp) return null;
		return (e ?? 0) + this.scripts_.layoutEpoch;
	}
	/**
	* @internal The script pools' half of {@link layoutEpoch}, on its own.
	*
	* A host that reads the engine's half itself needs only this one, and must
	* have it: a row added to or deleted from a script pool moves nothing the
	* registry's version numbers can see.
	*/
	scriptLayoutEpoch() {
		return this.scripts_.layoutEpoch;
	}
	/**
	* @internal Where a SCRIPT component's whole column is, for a host that
	* walks it in its own address space. Undefined for an engine component,
	* whose column belongs to the registry and is reached by its own door.
	*/
	scriptSpanOf(e) {
		if (w(e)) return void 0;
		return this.scripts_.poolFor(e._id)?.span();
	}
	/** @internal Whether script rows still carry a portable asset reference. */
	hasPortableScriptAssetRefs(e) {
		return this.scripts_.hasPortableAssetRefs(e._id);
	}
	/** @internal Release script memory after its application stops using it. */
	releaseScriptPools() {
		this.addressOf_.clear();
		this.scripts_.releasePools();
	}
	/**
	* @internal The same answer as a function, for a caller with a whole column
	* to walk: the lookup above is per entity, and a loop that pays it per row is
	* paying to be told the same thing every time.
	*/
	addressResolver(e) {
		let t = this.addressOf_.get(e._id);
		if (t === void 0) {
			t = w(e) ? this.builtin_.resolveComponentAddress(e._cppName) ?? ao : oo(this.scripts_, e._id);
			this.addressOf_.set(e._id, t);
		}
		return t;
	}
};
/** A component whose backend serves no flat memory: never has an address. */
const ao = () => void 0;
/**
* A script component's address, with the pool looked up once rather than per
* entity. Sound because a pool is never dropped once made, and because the pool
* re-views itself after a growth — the block moving is its business, not this
* closure's.
*/
function oo(e, t) {
	let n;
	return (r) => {
		if (n?.disposed) n = void 0;
		n ??= e.poolFor(t);
		return n?.address(r);
	};
}
//#endregion
//#region src/ecs/query.ts
const so = [];
/**
* Ask a {@link Query} for write access to `component`.
*
* An unwrapped engine component is yielded as a copy, so assigning to it changes
* nothing. Wrapped, the yielded data is written back to the world as iteration
* leaves the entity, and the component is marked changed for `Changed()`.
*
* @public
*/
function co(e) {
	return {
		_type: "mut",
		_component: e
	};
}
function lo(e) {
	return typeof e === "object" && e !== null && "_type" in e && e._type === "mut";
}
function uo(e) {
	return {
		_filterType: "added",
		_component: e
	};
}
function fo(e) {
	return {
		_filterType: "changed",
		_component: e
	};
}
function po(e) {
	return typeof e === "object" && e !== null && "_filterType" in e && e._filterType === "added";
}
function mo(e) {
	return typeof e === "object" && e !== null && "_filterType" in e && e._filterType === "changed";
}
function ho(e) {
	return {
		kind: "with",
		component: e
	};
}
function go(e) {
	return {
		kind: "without",
		component: e
	};
}
function _o(...e) {
	return {
		kind: "and",
		filters: e
	};
}
function vo(...e) {
	return {
		kind: "or",
		filters: e
	};
}
function yo(e) {
	return {
		kind: "not",
		filter: e
	};
}
/** Collect every component referenced by a filter expression (for cache-dep tracking). */
function bo(e, t) {
	switch (e.kind) {
		case "with":
		case "without":
			t.push(e.component);
			return;
		case "and":
		case "or":
			for (const n of e.filters) bo(n, t);
			return;
		case "not":
			bo(e.filter, t);
			return;
	}
}
/**
* Serialize a filter expression deterministically for cache keys. Uses
* component `_name` (unique within a registry) so no cross-module numeric
* ID table is required.
*/
function Y(e) {
	switch (e.kind) {
		case "with": return `+${e.component._name}`;
		case "without": return `-${e.component._name}`;
		case "not": return `!(${Y(e.filter)})`;
		case "and": {
			const t = e.filters.map(Y);
			t.sort();
			return `&(${t.join(",")})`;
		}
		case "or": {
			const t = e.filters.map(Y);
			t.sort();
			return `|(${t.join(",")})`;
		}
	}
}
/** Compile a filter expression into a reusable entity-predicate closure. */
function X(e, t) {
	switch (e.kind) {
		case "with": {
			const n = e.component;
			return (e) => t.has(e, n);
		}
		case "without": {
			const n = e.component;
			return (e) => !t.has(e, n);
		}
		case "not": {
			const n = X(e.filter, t);
			return (e) => !n(e);
		}
		case "and": {
			const n = e.filters.map((e) => X(e, t));
			return (e) => {
				for (const t of n) if (!t(e)) return false;
				return true;
			};
		}
		case "or": {
			const n = e.filters.map((e) => X(e, t));
			return (e) => {
				for (const t of n) if (t(e)) return true;
				return false;
			};
		}
	}
}
function xo(e) {
	if (lo(e)) return e._component;
	if (po(e)) return e._component;
	if (mo(e)) return e._component;
	return e;
}
function Z(e, t = [], n = [], r = null) {
	const i = [];
	const a = [];
	const o = [];
	e.forEach((e, t) => {
		if (lo(e)) i.push(t);
		if (po(e)) a.push({
			index: t,
			component: e._component
		});
		else if (mo(e)) o.push({
			index: t,
			component: e._component
		});
	});
	return {
		_type: "query",
		_components: e,
		_mutIndices: i,
		_with: t,
		_without: n,
		_addedFilters: a,
		_changedFilters: o,
		_filter: r,
		with(...i) {
			return Z(e, [...t, ...i], n, r);
		},
		without(...i) {
			return Z(e, t, [...n, ...i], r);
		},
		filter(r) {
			return Z(e, t, n, r);
		}
	};
}
/**
* Match the entities carrying every one of `components`, yielding the entity
* followed by each component's data in the order asked for.
*
* Read-only unless an argument is wrapped in {@link Mut}; narrow further with
* the builder's `with`/`without`, or per-component with `Added()`/`Changed()`.
*
* @public
*/
function So(...e) {
	return Z(e);
}
/**
* A live query, as a system body receives it. Iterate it — each step yields the
* entity followed by its components — or use `forEach`, `single`, `toArray`,
* `count` and `isEmpty`. Any {@link Mut} argument is written back and marked
* changed as iteration leaves each entity, so leaving the loop early is safe.
*
* @public
*/
var Co = class {
	constructor(e, t, n = -1) {
		this.kept_ = [];
		this.lastChangeSequence_ = null;
		this.sequenceMatchers_ = null;
		this.calls_ = 0;
		this.scanned_ = 0;
		this.filtered_ = 0;
		this.world_ = e;
		this.descriptor_ = t;
		this.lastRunTick_ = n;
		this.actualComponents_ = t._components.map(xo);
		this.allRequired_ = this.actualComponents_.concat(t._with);
		this.result_ = new Array(this.actualComponents_.length + 1);
		this.mutData_ = t._mutIndices.map((e) => ({
			component: this.actualComponents_[e],
			data: null
		}));
		if (t._filter) {
			const n = [];
			bo(t._filter, n);
			this.compiledFilter_ = {
				match: X(t._filter, e),
				deps: n
			};
		} else this.compiledFilter_ = null;
		this.cacheKey_ = to(this.allRequired_, t._with, t._without, t._filter ? Y(t._filter) : void 0);
		this.depIds_ = ro(this.allRequired_, t._with, t._without, this.compiledFilter_?.deps ?? []);
		this.getters_ = this.actualComponents_.map((t) => e.resolveGetter(t, "borrowed"));
		this.gettersRetained_ = this.actualComponents_.map((t) => e.resolveGetter(t, "retained"));
		this.mutSetters_ = t._mutIndices.map((t) => e.resolveSetter(this.actualComponents_[t]));
		this.mutIsBuiltin_ = t._mutIndices.map((e) => w(this.actualComponents_[e]));
		for (const n of t._addedFilters) e.enableChangeTracking(n.component);
		for (const n of t._changedFilters) e.enableChangeTracking(n.component);
	}
	/** @internal Update lastRunTick for reuse across system runs */
	resetTick(e) {
		this.lastRunTick_ = e;
	}
	/** @internal System-owned queries use completed runs, not coarse frame ticks. */
	resetChangeSequence(e) {
		if (!this.hasChangeFilters_()) return;
		if (this.lastChangeSequence_ === null) {
			this.sequenceMatchers_ = [];
			for (const e of this.descriptor_._addedFilters) this.sequenceMatchers_.push(this.world_.resolveChangeSequenceMatcher(e.component, true));
			for (const e of this.descriptor_._changedFilters) this.sequenceMatchers_.push(this.world_.resolveChangeSequenceMatcher(e.component, false));
		}
		this.lastChangeSequence_ = e;
	}
	/**
	* Every result reader uses this candidate set. A closed change window is
	* empty in O(1); otherwise the structural query cache supplies the entities
	* before their individual change filters are applied.
	*/
	candidates_() {
		if (this.lastChangeSequence_ !== null) {
			const e = this.lastChangeSequence_;
			let t = false;
			for (const n of this.descriptor_._addedFilters) if (!this.world_.anyAddedAfterSequence(n.component, e)) {
				t = true;
				break;
			}
			if (!t) {
				for (const n of this.descriptor_._changedFilters) if (!this.world_.anyChangedAfterSequence(n.component, e)) {
					t = true;
					break;
				}
			}
			if (t) {
				if (this.world_.queryCostEnabled) this.calls_++;
				return so;
			}
		}
		const e = this.world_.queryEntities(this.allRequired_, this.descriptor_._with, this.descriptor_._without, this.cacheKey_, this.compiledFilter_ ?? void 0, this.depIds_);
		if (this.world_.queryCostEnabled) {
			this.calls_++;
			this.scanned_ += e.length;
		}
		return e;
	}
	/**
	* @internal What this query cost since the last read: how many times it was
	* asked, how many entities that walked, and how many of those a change filter
	* then threw away. Reset by the read, so a frame's figure is that frame's.
	*/
	takeCost() {
		const e = {
			calls: this.calls_,
			scanned: this.scanned_,
			filtered: this.filtered_
		};
		this.calls_ = 0;
		this.scanned_ = 0;
		this.filtered_ = 0;
		return e;
	}
	hasChangeFilters_() {
		return this.descriptor_._addedFilters.length > 0 || this.descriptor_._changedFilters.length > 0;
	}
	passesChangeFilters_(e) {
		const { _addedFilters: t, _changedFilters: n } = this.descriptor_;
		if (t.length === 0 && n.length === 0) return true;
		const r = this.lastRunTick_;
		const i = this.lastChangeSequence_;
		if (i !== null) {
			for (const t of this.sequenceMatchers_) if (!t(e, i)) return this.rejected_();
			return true;
		}
		for (const n of t) if (!this.world_.isAddedSince(e, n.component, r)) return this.rejected_();
		for (const t of n) if (!this.world_.isChangedSince(e, t.component, r)) return this.rejected_();
		return true;
	}
	rejected_() {
		if (this.world_.queryCostEnabled) this.filtered_++;
		return false;
	}
	/**
	* Write buffered Mut() data back to storage for one entity and record a
	* Changed tick for each mutated component. This is the single write-back path
	* shared by the iterator and forEach — keeping the three former copies from
	* drifting apart.
	*
	* Builtin (wasm-backed) components write through a direct ptr / embind setter
	* that pokes component storage without going through world.set(), so the
	* change must be recorded here explicitly to keep Changed()/Added() detection
	* consistent with script components and with world.set(). recordChanged()
	* self-gates on whether any query is actually tracking the component, so on
	* the hot path with nothing listening this is a Set.has() + return.
	*/
	writeMutBack_(e) {
		const t = this.world_;
		if (!t.valid(e)) return;
		const n = this.mutData_;
		const r = this.mutSetters_;
		const i = this.mutIsBuiltin_;
		for (let a = 0; a < n.length; a++) {
			const o = n[a];
			if (i[a]) {
				const n = r[a];
				if (n) {
					n(e, o.data);
					t.markChanged(e, o.component);
				} else t.set(e, o.component, o.data);
			} else t.markChanged(e, o.component);
		}
	}
	/**
	* @internal Write the Mut rows this query's iterator handed out once more,
	* now that the system has returned. Called by the runner, before the
	* system's Commands flush.
	*
	* The iterator's rows are the ones a caller may KEEP, and keeping them is
	* how a system edits after the loop: collect, sort, then change the nearest.
	* A script component's row is its stored object, so that edit already landed;
	* an engine-backed one (Transform, Sprite) is a copy written back as the loop
	* advanced, and an edit made after that was silently dropped. Until the
	* system returns a kept row stays live. The lent rows of {@link forEach} are
	* not tracked and cost nothing here.
	*/
	settleKeptRows() {
		const e = this.kept_;
		if (e.length === 0) return;
		const t = this.world_;
		const n = this.mutData_;
		const r = this.mutSetters_;
		const i = this.mutIsBuiltin_;
		try {
			for (const { entity: a, slot: o, data: s } of e) {
				if (!t.valid(a)) continue;
				const e = n[o].component;
				if (i[o]) {
					const n = r[o];
					if (n) n(a, s);
					else t.set(a, e, s);
				}
				t.markChanged(a, e);
			}
		} finally {
			e.length = 0;
		}
	}
	/**
	* Rows the caller may keep: a fresh array per entity, and for an
	* engine-backed component a fresh value rather than the shared fill target.
	* {@link forEach} lends its row instead and is cheaper for a body that only
	* reads it once.
	*/
	[Symbol.iterator]() {
		const { _mutIndices: e } = this.descriptor_;
		const t = this.actualComponents_;
		const n = this.candidates_();
		const r = t.length;
		const i = e.length > 0;
		const a = this.hasChangeFilters_();
		const o = this.mutData_;
		const s = o.length;
		const c = this.world_;
		const l = this.gettersRetained_;
		const u = this;
		const d = this.kept_;
		let f = 0;
		let p = null;
		let m = false;
		let h = false;
		const g = () => {
			const e = p;
			p = null;
			u.writeMutBack_(e);
		};
		const _ = (e = false) => {
			if (h) return;
			h = true;
			c.endIteration();
			if (p === null || !i) return;
			if (!e) {
				g();
				return;
			}
			try {
				g();
			} catch {}
		};
		const v = {
			value: void 0,
			done: false
		};
		const y = {
			value: void 0,
			done: true
		};
		return {
			next() {
				if (!m) {
					m = true;
					c.beginIteration();
				}
				try {
					while (f < n.length) {
						const m = n[f++];
						if (a && !u.passesChangeFilters_(m)) continue;
						if (p !== null && i) g();
						const h = new Array(r + 1);
						h[0] = m;
						for (let e = 0; e < r; e++) {
							const n = l[e];
							h[e + 1] = n ? n(m) : c.get(m, t[e]);
						}
						if (i) {
							for (let t = 0; t < s; t++) {
								const n = h[e[t] + 1];
								o[t].data = n;
								d.push({
									entity: m,
									slot: t,
									data: n
								});
							}
							p = m;
						}
						v.value = h;
						return v;
					}
				} catch (e) {
					_(true);
					throw e;
				}
				_();
				return y;
			},
			return() {
				_();
				return y;
			}
		};
	}
	/**
	* Run `callback` per matching entity, LENDING it the row: the values are
	* refilled for the next entity, so anything kept past the callback must be
	* copied. The fast path — iterating instead costs an allocation per row
	* (1.2x for script components, 1.7x for engine-backed ones).
	*/
	forEach(e) {
		const { _mutIndices: t } = this.descriptor_;
		const n = this.candidates_();
		const r = this.actualComponents_.length;
		const i = t.length > 0;
		const a = this.hasChangeFilters_();
		const o = this.result_;
		const s = this.mutData_;
		const c = s.length;
		const l = this.world_;
		const u = this.getters_;
		const d = this.actualComponents_;
		l.beginIteration();
		let f = null;
		const p = () => {
			const e = f;
			f = null;
			this.writeMutBack_(e);
		};
		try {
			for (let m = 0; m < n.length; m++) {
				const h = n[m];
				if (a && !this.passesChangeFilters_(h)) continue;
				if (f !== null && i) p();
				o[0] = h;
				for (let e = 0; e < r; e++) {
					const t = u[e];
					o[e + 1] = t ? t(h) : l.get(h, d[e]);
				}
				if (i) {
					for (let e = 0; e < c; e++) s[e].data = o[t[e] + 1];
					f = h;
				}
				switch (r) {
					case 1:
						e(h, o[1]);
						break;
					case 2:
						e(h, o[1], o[2]);
						break;
					case 3:
						e(h, o[1], o[2], o[3]);
						break;
					case 4:
						e(h, o[1], o[2], o[3], o[4]);
						break;
					case 5:
						e(h, o[1], o[2], o[3], o[4], o[5]);
						break;
					case 6:
						e(h, o[1], o[2], o[3], o[4], o[5], o[6]);
						break;
					default: e.apply(null, o);
				}
			}
			if (f !== null && i) p();
		} finally {
			if (f !== null && i) try {
				p();
			} catch {}
			l.endIteration();
		}
	}
	/**
	* The one result, or null. Copied off the iterator's shared row buffer, which
	* the next iteration overwrites — a caller that holds this would otherwise
	* watch it change under them.
	*/
	/** The one row, or null. The iterator's rows are already the caller's to keep. */
	single() {
		for (const e of this) return e;
		return null;
	}
	/**
	* Whether iterating would yield nothing. Asks the entity set rather than
	* running the iterator: taking one step of a Mut() query writes that entity
	* back and records a Changed tick for it, and asking whether a query is empty
	* must not mark anything as having changed.
	*/
	isEmpty() {
		const e = this.candidates_();
		if (!this.hasChangeFilters_()) return e.length === 0;
		for (const t of e) if (this.passesChangeFilters_(t)) return false;
		return true;
	}
	/**
	* How many results iterating would yield. Added()/Changed() are per-entity
	* tick checks rather than part of the entity set the cache returns, so
	* counting has to apply them too — the same pass the iterator makes.
	*/
	count() {
		const e = this.candidates_();
		if (!this.hasChangeFilters_()) return e.length;
		let t = 0;
		for (const n of e) if (this.passesChangeFilters_(n)) t++;
		return t;
	}
	toArray() {
		const e = [];
		for (const t of this) e.push(t);
		return e;
	}
};
function wo(e) {
	return {
		_type: "removed",
		_component: e
	};
}
/**
* The entities that lost a component since this system last ran, as
* {@link Removed} asked for. Yields entities only — the component is gone, so
* there is nothing left to read from it.
*
* @public
*/
var To = class {
	/** Constructing one has NO side effect on the world: a runner that builds
	*  several params and throws on a later one would otherwise leave a claim
	*  on removal history that nothing can ever release. */
	constructor(e, t, n) {
		this.readerId_ = null;
		this.readThrough_ = 0;
		this.world_ = e;
		this.component_ = t;
		this.lastRunTick_ = n;
	}
	/** @internal Claim the history, once the whole parameter set is committed. */
	activateRetention() {
		if (this.readerId_ !== null) return;
		this.world_.enableChangeTracking(this.component_);
		this.readerId_ = this.world_.registerRemovedCursorReader(this.component_);
		this.readThrough_ = this.world_.getRemovalSequence();
	}
	/**
	* @internal This run is over, so release the sequence it observed. A later
	* removal in the same frame is still owed. NOT `resetTick`: a system may
	* await mid-body, and an early release would let another reader's prune
	* take rows this one is still owed.
	*/
	releaseThrough(e) {
		if (this.readerId_ === null) return;
		this.world_.advanceRemovedCursorReader(this.component_, this.readerId_, this.readThrough_);
	}
	/** @internal Give up the claim — the runner evicted or reset this system. */
	dispose() {
		if (this.readerId_ === null) return;
		this.world_.disposeRemovedReader(this.component_, this.readerId_);
		this.readerId_ = null;
	}
	/** @internal Update lastRunTick for reuse across system runs */
	resetTick(e) {
		this.lastRunTick_ = e;
		this.readThrough_ = this.world_.getRemovalSequence();
	}
	read_() {
		if (this.readerId_ === null) return this.world_.getRemovedEntitiesSince(this.component_, this.lastRunTick_);
		this.readThrough_ = this.world_.getRemovalSequence();
		return this.world_.getRemovedEntitiesForReader(this.component_, this.readerId_);
	}
	*[Symbol.iterator]() {
		yield* this.read_();
	}
	isEmpty() {
		return this.read_().length === 0;
	}
	toArray() {
		return this.read_();
	}
};
//#endregion
//#region src/ecs/commands.ts
/** Key order is not a difference a replay should report, so sort it away. */
function Q(e) {
	if (e === null || typeof e !== "object") return JSON.stringify(e) ?? "undefined";
	if (Array.isArray(e)) return `[${e.map(Q).join(",")}]`;
	const t = e;
	return `{${Object.keys(t).sort().map((e) => `${e}:${Q(t[e])}`).join(",")}}`;
}
/**
* Ask a system for a command queue: spawning, despawning and adding or removing
* components, recorded now and applied together.
*
* It flushes when the system returns — on a throw too, and after an async body's
* await — so structural edits never land mid-iteration of that system's queries.
*
* @public
*/
function Eo() {
	return { _type: "commands" };
}
/**
* One entity's share of a {@link CommandsInstance}: chain `insert`/`remove` and
* let the queue apply them. Asking {@link EntityCommands.id} for a spawn's
* entity materialises it early, because an id has to exist to be answered —
* except inside a running query, where the id is reserved and the spawn still
* lands at the flush.
*
* @public
*/
var Do = class {
	constructor(e, t, n) {
		this.components_ = [];
		this.parent_ = null;
		this.commands_ = e;
		if (t === null) {
			this.entityRef_ = { entity: 0 };
			this.isNew_ = true;
			this.spawnName_ = n;
		} else {
			this.entityRef_ = { entity: t };
			this.isNew_ = false;
		}
	}
	/** @internal What this spawn or edit WOULD do, as text a second run can be
	*  compared against — a queued spawn has no entity yet, so identity cannot
	*  be part of the comparison and the composition is. */
	describe() {
		const e = this.components_.map((e) => `${e.component._name}=${Q(e.data)}`).sort();
		return `${this.isNew_ ? "spawn" : `edit#${this.entityRef_.entity}`}${this.spawnName_ ? `:${this.spawnName_}` : ""}(${e.join(",")})${this.parent_ === null ? "" : `<-${this.parent_}`}`;
	}
	insert(e, t) {
		let n;
		if (w(e)) n = {
			...e._default,
			...t
		};
		else n = e.create(t);
		if (this.isNew_) this.components_.push({
			component: e,
			data: n
		});
		else this.commands_.queueInsert(this.entityRef_.entity, e, n);
		return this;
	}
	remove(e) {
		if (!this.isNew_) this.commands_.queueRemove(this.entityRef_.entity, e);
		return this;
	}
	/**
	* Attach this entity under `parent`. The engine keeps {@link Parent} and
	* {@link Children} in step from here — inserting `Parent` yourself writes
	* only one half of the link.
	*/
	childOf(e) {
		if (this.isNew_) this.parent_ = e;
		else this.commands_.queueSetParent(this.entityRef_.entity, e);
		return this;
	}
	id() {
		if (this.isNew_ && this.entityRef_.entity === 0) if (this.commands_.isWorldIterating()) this.entityRef_.entity = this.commands_.reserveEntity();
		else this.finalize();
		return this.entityRef_.entity;
	}
	finalize() {
		if (this.isNew_) {
			this.commands_.spawnImmediate(this.components_, this.entityRef_, this.spawnName_, this.parent_);
			this.isNew_ = false;
			this.parent_ = null;
		}
	}
};
/**
* The command queue a system declared with {@link Commands}. Records structural
* work — spawn, despawn, add or remove a component, install a resource — and
* applies it when the system returns, so nothing moves under a running query.
*
* @public
*/
var Oo = class {
	constructor(e, t) {
		this.pending_ = [];
		this.spawned_ = [];
		this.world_ = e;
		this.resources_ = t;
	}
	spawn(e) {
		const t = new Do(this, null, e);
		this.spawned_.push(t);
		return t;
	}
	entity(e) {
		return new Do(this, e);
	}
	despawn(e) {
		this.pending_.push({
			type: "despawn",
			entity: e
		});
		return this;
	}
	/**
	* A world-level service, for the work no component write can express.
	* Null where nothing installed it — an app assembled without that plugin
	* is a fact to report, not a crash. Here rather than on each context
	* because this is the one door every authored surface already holds.
	*/
	resource(e) {
		return this.resources_.has(e) ? this.resources_.get(e) : null;
	}
	insertResource(e, t) {
		this.pending_.push({
			type: "insert_resource",
			resource: e,
			value: t
		});
		return this;
	}
	queueInsert(e, t, n) {
		this.pending_.push({
			type: "insert",
			entity: e,
			component: t,
			data: n
		});
	}
	queueRemove(e, t) {
		this.pending_.push({
			type: "remove",
			entity: e,
			component: t
		});
	}
	queueSetParent(e, t) {
		this.pending_.push({
			type: "set_parent",
			entity: e,
			parent: t
		});
	}
	/** @internal Whether the world is inside a query walk, where a spawn must wait. */
	isWorldIterating() {
		return this.world_.isIterating();
	}
	/** @internal An identity for a spawn that will be applied at flush. */
	reserveEntity() {
		return this.world_.reserveEntity();
	}
	/** @internal How EntityCommands applies a deferred spawn — `entityRef` is the
	*  handle it already gave the caller, filled in once the entity exists. */
	spawnImmediate(e, t, n, r) {
		let i = t.entity;
		if (i !== 0 && this.world_.valid(i)) this.world_.commitReservedSpawn(i, n);
		else i = this.world_.spawn(n);
		t.entity = i;
		for (const t of e) this.world_.insert(i, t.component, t.data);
		if (r !== null && r !== void 0) this.world_.setParent(i, r);
	}
	/** @internal Everything queued and not yet applied, as comparable text. */
	describe() {
		const e = this.spawned_.map((e) => e.describe());
		const t = this.pending_.map((e) => {
			const t = e;
			return `${t.type}#${t.entity ?? "-"}${t.component ? `:${t.component._name}` : ""}${t.data === void 0 ? "" : `=${Q(t.data)}`}`;
		});
		return [...e, ...t].join("|");
	}
	flush() {
		for (const e of this.spawned_) e.finalize();
		this.spawned_.length = 0;
		for (const t of this.pending_) try {
			this.executeCommand(t);
		} catch (n) {
			e.warn("commands", `Failed to execute command: ${t.type}`, n);
		}
		this.pending_.length = 0;
	}
	executeCommand(t) {
		switch (t.type) {
			case "despawn":
				if (!this.world_.valid(t.entity)) {
					e.warn("commands", `despawn skipped: entity ${t.entity} is already invalid`);
					break;
				}
				this.world_.despawn(t.entity);
				break;
			case "insert":
				if (!this.world_.valid(t.entity)) {
					e.warn("commands", `insert skipped: entity ${t.entity} is invalid`);
					break;
				}
				this.world_.insert(t.entity, t.component, t.data);
				break;
			case "remove":
				if (!this.world_.valid(t.entity)) {
					e.warn("commands", `remove skipped: entity ${t.entity} is invalid`);
					break;
				}
				this.world_.remove(t.entity, t.component);
				break;
			case "set_parent":
				if (!this.world_.valid(t.entity) || !this.world_.valid(t.parent)) {
					e.warn("commands", `childOf skipped: entity ${t.entity} or parent ${t.parent} is invalid`);
					break;
				}
				this.world_.setParent(t.entity, t.parent);
				break;
			case "insert_resource": this.resources_.insert(t.resource, t.value);
		}
	}
};
//#endregion
//#region src/ecs/event.ts
/**
* Declare an event type. The bus is double-buffered: an event sent this frame is
* readable for exactly the next one, so a reader that misses a frame misses the
* event — events are for this-frame signalling, not a queue.
*
* `payload` is a default of the shape `T`, the way a component declares its
* fields. Optional, and needed only where a `@compiled` system reads or writes
* the event: `T` is erased at run time, so without it nothing on this side can
* say what layout the compiled code baked in. The compiler asks for it by name
* and line when a promise depends on it.
*
* @public
*/
function ko(e, t) {
	const n = {
		_id: jo(e),
		_name: e,
		...t === void 0 ? {} : { _default: t }
	};
	Mo.set(e, n);
	return n;
}
const Ao = /* @__PURE__ */ new Map();
function jo(e) {
	let t = Ao.get(e);
	if (t === void 0) {
		t = Symbol(`Event_${e}`);
		Ao.set(e, t);
	}
	return t;
}
const Mo = /* @__PURE__ */ new Map();
/**
* The event a manifest's NAME refers to, or undefined when nothing declared it.
*
* @internal
*/
function No(e) {
	return Mo.get(e);
}
/**
* The payload's fields as compiled code reads them: one entry per leaf, dotted,
* in declaration order. Undefined where the event was declared without a
* payload — which is "cannot say", never "no fields".
*
* @internal
*/
function Po(e) {
	const t = Mo.get(e)?._default;
	if (t === void 0) return void 0;
	const n = [];
	const r = (e, t) => {
		for (const [i, a] of Object.entries(e)) {
			const e = t ? `${t}.${i}` : i;
			if (a !== null && typeof a === "object") r(a, e);
			else n.push(e);
		}
	};
	r(t, "");
	return n;
}
var Fo = class {
	constructor() {
		this.readBuffer_ = [];
		this.writeBuffer_ = [];
	}
	send(e) {
		this.writeBuffer_.push(e);
	}
	getReadBuffer() {
		return this.readBuffer_;
	}
	swap() {
		const e = this.readBuffer_;
		this.readBuffer_ = this.writeBuffer_;
		this.writeBuffer_ = e;
		this.writeBuffer_.length = 0;
	}
	/** @internal How much has been written since the last swap — a speculation
	*  takes this before it runs and un-writes back to it if it is abandoned. */
	writeMark() {
		return this.writeBuffer_.length;
	}
	/** @internal */
	rewindWrite(e) {
		if (e < this.writeBuffer_.length) this.writeBuffer_.length = e;
	}
	/** @internal Payloads written past `mark`, oldest first, as text. */
	writtenSince(e) {
		return this.writeBuffer_.slice(e).map((e) => JSON.stringify(e) ?? "undefined");
	}
};
var Io = class {
	constructor() {
		this.buses_ = /* @__PURE__ */ new Map();
		this.byName_ = /* @__PURE__ */ new Map();
	}
	register(e) {
		if (!this.buses_.has(e._id)) this.make_(e);
	}
	getBus(e) {
		return this.buses_.get(e._id) ?? this.make_(e);
	}
	/** The bus a manifest's name refers to, or undefined if nothing made one. */
	busNamed(e) {
		return this.byName_.get(e);
	}
	make_(e) {
		const t = new Fo();
		this.buses_.set(e._id, t);
		if (e._name) this.byName_.set(e._name, t);
		return t;
	}
	swapAll() {
		for (const e of this.buses_.values()) e.swap();
	}
	/** @internal Where every bus's write half stands right now. */
	writeMarks() {
		const e = /* @__PURE__ */ new Map();
		for (const [t, n] of this.buses_) e.set(t, n.writeMark());
		return e;
	}
	/** @internal Un-write back to `marks`. A bus made DURING the speculation is
	*  absent from them, so it rewinds to empty rather than being left alone. */
	rewindWrites(e) {
		for (const [t, n] of this.buses_) n.rewindWrite(e.get(t) ?? 0);
	}
	/** @internal What has been written since `marks`, as comparable text: a
	*  replay asks whether the same step announces the same things. */
	writtenSince(e) {
		const t = [];
		for (const [n, r] of this.buses_) {
			const i = e.get(n) ?? 0;
			const a = r.writtenSince(i);
			if (a.length > 0) t.push(`${String(n.description ?? n.toString())}:${a.join(",")}`);
		}
		return t.sort().join("|");
	}
};
/**
* Ask a system for send access to an event. The body receives an
* {@link EventWriterInstance}; what it sends is readable next frame.
*
* @public
*/
function Lo(e) {
	return {
		_type: "event_writer",
		_event: e
	};
}
/**
* Ask a system for receive access to an event. Each declaring system keeps its
* own cursor, so two readers both see every event rather than consuming it from
* each other.
*
* @public
*/
function Ro(e) {
	return {
		_type: "event_reader",
		_event: e
	};
}
/**
* The send end of an event, as {@link EventWriter} asked for. What is sent this
* frame is what every reader sees next, so sending is not a call into them.
*
* @public
*/
var zo = class {
	constructor(e) {
		this.bus_ = e;
	}
	send(e) {
		this.bus_.send(e);
	}
};
/**
* The events sent since this system last ran, as {@link EventReader} asked for.
* Reading does not consume: every reader of an event sees the whole frame's
* worth, and the buffer turns over on its own.
*
* @public
*/
var Bo = class {
	constructor(e) {
		this.bus_ = e;
	}
	*[Symbol.iterator]() {
		yield* this.bus_.getReadBuffer();
	}
	isEmpty() {
		return this.bus_.getReadBuffer().length === 0;
	}
	toArray() {
		return [...this.bus_.getReadBuffer()];
	}
};
//#endregion
//#region src/ecs/system.ts
/**
* When in a frame a system runs, in the order listed; `Startup` runs once before
* the first frame. The `Fixed*` three are the simulation's cadence, running zero
* or more times per frame as `Time.fixedDelta` accumulates — where anything that
* must be deterministic belongs.
*
* @public
*/
let Vo = /* @__PURE__ */ function(e) {
	e[e["Startup"] = 0] = "Startup";
	e[e["First"] = 1] = "First";
	e[e["PreUpdate"] = 2] = "PreUpdate";
	e[e["Update"] = 3] = "Update";
	e[e["PostUpdate"] = 4] = "PostUpdate";
	e[e["Last"] = 5] = "Last";
	e[e["FixedPreUpdate"] = 10] = "FixedPreUpdate";
	e[e["FixedUpdate"] = 11] = "FixedUpdate";
	e[e["FixedPostUpdate"] = 12] = "FixedPostUpdate";
	return e;
}({});
/**
* Ask a system for the {@link World} itself. The escape hatch: it declares no
* access, so the scheduler cannot see what the system touches and the query cache
* cannot serve it. Reach for `Query`/`Res`/`Commands` first.
*
* @public
*/
function Ho() {
	return { _type: "get_world" };
}
let Uo = 0;
/**
* Declare a system: what it reads and writes, and the function to run.
*
* Ordering declared here travels with the definition, so it applies wherever
* the system is registered — including the top-level {@link addSystem}, which
* takes no options of its own. Edges given again at the registration site (or
* on the enclosing {@link SystemSet}) are added to these, not replaced.
*
* @public
*/
function Wo(e, t, n) {
	const r = ++Uo;
	return {
		_id: Symbol(`SystemTemplate_${r}`),
		_params: e,
		_fn: t,
		_name: n?.name ?? "",
		_runBefore: n?.runBefore,
		_runAfter: n?.runAfter,
		_runWhenPaused: n?.runWhenPaused,
		_touches: n?.touches
	};
}
/**
* The same system under a scheduler-owned identity and name.
*
* Registration gives a template its own id so the same definition can be added
* twice, and copying the fields by hand at each site is how a field added to
* SystemDef silently stops travelling with it.
*/
function Go(e, t) {
	return {
		...e,
		_id: Symbol(`System_${t}`),
		_name: t
	};
}
/** Union of ordering edges from two sources, preserving first-seen order. */
function Ko(e, t) {
	if (!e?.length) return t?.length ? [...t] : void 0;
	if (!t?.length) return [...e];
	const n = [...e];
	for (const e of t) if (!n.includes(e)) n.push(e);
	return n;
}
/**
* Group systems under one name so ordering and run conditions are written once.
*
* ```ts
* const physics = defineSystemSet('physics', {
*     systems: [applyForces, integrateVelocity],
*     runBefore: ['render'],
*     runIf: () => !paused,
* });
* app.addSystemSetToSchedule(Schedule.FixedUpdate, physics);
* ```
*
* Members keep the order they are listed in; anything constraining `'physics'`
* constrains all of them.
*
* @public
*/
function qo(e, t) {
	if (!e) throw new Error("SystemSet requires a name");
	return {
		_kind: "set",
		_name: e,
		_systems: t.systems,
		_runIf: t.runIf,
		_runBefore: t.runBefore,
		_runAfter: t.runAfter
	};
}
function $() {
	return t().pendingSystems;
}
function Jo(e) {
	$().push({
		schedule: 3,
		system: e
	});
}
/**
* Register a system to run once, before the first frame — where a project spawns
* its world. Startup runs after the engine's own startup, so the components and
* resources a system asks for are there.
*
* @public
*/
function Yo(e) {
	$().push({
		schedule: 0,
		system: e
	});
}
/**
* Register a system in a {@link Schedule}. This is how a project bundle's
* systems reach the loop: the call records them, and the app drains what was
* recorded when it starts, so module-level registration works before an `App`
* exists.
*
* @public
*/
function Xo(e, t) {
	$().push({
		schedule: e,
		system: t
	});
}
/**
* Register a {@link SystemSet} from a project bundle, the module-level twin of
* `App.addSystemSetToSchedule`. Without it a project can define a set — the run
* condition a pause is written as — and have no door to register it through.
*
* @public
*/
function Zo(e, t) {
	$().push({
		schedule: e,
		system: t
	});
}
var Qo = class {
	constructor(e, t, n) {
		this.argsCache_ = /* @__PURE__ */ new Map();
		this.systemTicks_ = /* @__PURE__ */ new Map();
		this.systemChangeSequences_ = /* @__PURE__ */ new Map();
		this.queryCache_ = /* @__PURE__ */ new Map();
		this.removedCache_ = /* @__PURE__ */ new Map();
		this.currentLastRunTick_ = -1;
		this.timings_ = null;
		this.queryCosts_ = null;
		this.aot_ = null;
		this.aotDispatch_ = null;
		this.world_ = e;
		this.resources_ = t;
		this.eventRegistry_ = n ?? null;
	}
	/** @internal Install the twins a build produced. */
	useAot(e) {
		this.aot_ = e;
		this.aotDispatch_ = e ? e.dispatcherFor(this.world_) : null;
	}
	setTimingEnabled(e) {
		this.timings_ = e ? /* @__PURE__ */ new Map() : null;
		this.queryCosts_ = e ? /* @__PURE__ */ new Map() : null;
		this.world_.setQueryCostEnabled(e);
	}
	getTimings() {
		return this.timings_;
	}
	/**
	* Per-system query cost for the frame: what each system's queries walked, and
	* how much of that a change filter then discarded. This is what turns "7ms"
	* into "7ms over 18,400 entities, none of which had changed".
	*/
	getQueryCosts() {
		return this.queryCosts_;
	}
	/** @brief Clear timing data for the current frame */
	clearTimings() {
		this.timings_?.clear();
		this.queryCosts_?.clear();
	}
	/** @brief Remove cached state for a single system */
	evict(e) {
		this.argsCache_.delete(e);
		this.systemTicks_.delete(e);
		this.systemChangeSequences_.delete(e);
		this.queryCache_.delete(e);
		for (const t of this.removedCache_.get(e) ?? []) t.dispose();
		this.removedCache_.delete(e);
	}
	/** @brief Clear all cached state */
	reset() {
		this.argsCache_.clear();
		this.systemTicks_.clear();
		this.systemChangeSequences_.clear();
		this.queryCache_.clear();
		for (const e of this.removedCache_.values()) for (const t of e) t.dispose();
		this.removedCache_.clear();
	}
	run(e) {
		const t = this.aot_?.systems.get(e._name);
		if (t && this.runCompiled_(e, t)) return;
		let n = this.argsCache_.get(e._id);
		if (!n) {
			n = new Array(e._params.length);
			this.argsCache_.set(e._id, n);
		}
		this.currentLastRunTick_ = this.systemTicks_.get(e._id) ?? -1;
		const r = this.systemChangeSequences_.get(e._id) ?? -1;
		const i = this.queryCache_.get(e._id);
		const a = !i;
		const o = i ?? [];
		const s = this.removedCache_.get(e._id) ?? [];
		let c = 0, l = 0;
		for (let t = 0; t < e._params.length; t++) {
			const i = e._params[t];
			if (i._type === "query") {
				if (a) {
					const e = new Co(this.world_, i, this.currentLastRunTick_);
					e.resetChangeSequence(r);
					o.push(e);
					n[t] = e;
				} else {
					const e = o[c];
					e.resetTick(this.currentLastRunTick_);
					e.resetChangeSequence(r);
					n[t] = e;
				}
				c++;
			} else if (i._type === "removed") {
				if (a) {
					const e = i;
					const r = new To(this.world_, e._component, this.currentLastRunTick_);
					s.push(r);
					n[t] = r;
				} else {
					const e = s[l];
					e.resetTick(this.currentLastRunTick_);
					n[t] = e;
				}
				l++;
			} else n[t] = this.resolveParam(i);
		}
		if (a) {
			this.queryCache_.set(e._id, o);
			this.removedCache_.set(e._id, s);
			for (const e of s) e.activateRetention();
		}
		const u = this.timings_ ? performance.now() : 0;
		let d;
		try {
			d = e._fn(...n);
		} catch (t) {
			this.flushSystem_(e, n, u);
			throw t;
		}
		if (d instanceof Promise) {
			const t = this.world_.suspendIteration();
			const r = () => {
				this.world_.resumeIteration(t);
				this.flushSystem_(e, n, u);
			};
			return d.then(r, (e) => {
				r();
				throw e;
			});
		}
		this.flushSystem_(e, n, u);
	}
	/**
	* A compiled system's frame: the dispatcher does the contract, this keeps the
	* scheduler's own books — what it cost, and when it last ran.
	*/
	runCompiled_(e, t) {
		const n = this.timings_ ? performance.now() : 0;
		if (!this.aotDispatch_.run(t)) return false;
		if (this.timings_) {
			const t = e._name;
			this.timings_.set(t, (this.timings_.get(t) ?? 0) + (performance.now() - n));
		}
		this.systemTicks_.set(e._id, this.world_.getWorldTick());
		this.systemChangeSequences_.set(e._id, this.world_.getChangeSequence());
		return true;
	}
	flushSystem_(e, t, n) {
		for (let e = 0; e < t.length; e++) if (t[e] instanceof Co) t[e].settleKeptRows();
		for (let e = 0; e < t.length; e++) if (t[e] instanceof Oo) t[e].flush();
		if (this.queryCosts_) this.harvestQueryCost_(e);
		if (this.timings_) {
			const t = e._name;
			this.timings_.set(t, (this.timings_.get(t) ?? 0) + (performance.now() - n));
		}
		this.world_.resetIterationDepth();
		const r = this.world_.getWorldTick();
		for (const t of this.removedCache_.get(e._id) ?? []) t.releaseThrough(r);
		this.systemTicks_.set(e._id, r);
		this.systemChangeSequences_.set(e._id, this.world_.getChangeSequence());
	}
	harvestQueryCost_(e) {
		const t = this.queryCache_.get(e._id);
		if (!t || t.length === 0) return;
		const n = e._name;
		const r = this.queryCosts_.get(n) ?? {
			calls: 0,
			scanned: 0,
			filtered: 0
		};
		for (const e of t) {
			const t = e.takeCost();
			r.calls += t.calls;
			r.scanned += t.scanned;
			r.filtered += t.filtered;
		}
		if (r.calls > 0) this.queryCosts_.set(n, r);
	}
	resolveParam(e) {
		switch (e._type) {
			case "res": return this.resources_.get(e._resource);
			case "res_mut": return this.resources_.getResMut(e._resource);
			case "commands": return new Oo(this.world_, this.resources_);
			case "event_writer": {
				const t = e;
				const n = this.eventRegistry_ ? this.eventRegistry_.getBus(t._event) : (() => {
					throw new Error("EventRegistry not available");
				})();
				return new zo(n);
			}
			case "event_reader": {
				const t = e;
				const n = this.eventRegistry_ ? this.eventRegistry_.getBus(t._event) : (() => {
					throw new Error("EventRegistry not available");
				})();
				return new Bo(n);
			}
			case "get_world": return this.world_;
			default: throw new Error("Unknown system parameter type");
		}
	}
};
//#endregion
export { Xt as $, Me as $n, x as $t, Co as A, le as An, yt as At, qa as B, ye as Bn, Nt as Bt, uo as C, ne as Cn, jt as Ct, yo as D, oe as Dn, Rt as Dt, co as E, ae as En, N as Et, io as F, me as Fn, Ht as Ft, wa as G, we as Gn, qt as Gt, H, xe as Hn, pt as Ht, to as I, he as In, _t as It, V as J, De as Jn, Dt as Jt, ga as K, Te as Kn, Mt as Kt, ro as L, ge as Ln, ht as Lt, To as M, de as Mn, bt as Mt, ho as N, fe as Nn, Vt as Nt, vo as O, se as On, Bt as Ot, go as P, pe as Pn, ut as Pt, dn as Q, je as Qn, A as Qt, Ja as R, _e as Rn, Ct as Rt, Do as S, te as Sn, Ut as St, fo as T, ie as Tn, xt as Tt, _a as U, Se as Un, St as Ut, Xa as V, be as Vn, Pt as Vt, Ca as W, Ce as Wn, zt as Wt, z as X, ke as Xn, ft as Xt, B as Y, Oe as Yn, Kt as Yt, R as Z, Ae as Zn, We as Zt, ko as _, g as _n, wt as _t, Jo as a, nt as an, h as ar, ln as at, Eo as b, y as bn, vt as bt, Wo as c, Ue as cn, f as cr, sn as ct, Go as d, w as dn, Tt as dt, S as en, Ne as er, en as et, Ro as f, Ke as fn, Et as ft, zo as g, Ge as gn, At as gt, Lo as h, qe as hn, mt as ht, Yo as i, Jt as in, m as ir, cn as it, wo as j, ue as jn, Wt as jt, So as k, ce as kn, Lt as kt, qo as l, et as ln, Ft as lt, Io as m, at as mn, F as mt, Vo as n, Le as nn, Fe as nr, rn as nt, Zo as o, Ze as on, p as or, an as ot, Bo as p, Xe as pn, P as pt, pa as q, Ee as qn, M as qt, Qo as r, O as rn, Ie as rr, tn as rt, Xo as s, rt as sn, d as sr, on as st, Ho as t, lt as tn, Pe as tr, nn as tt, Ko as u, D as un, Ot as ut, Po as v, _ as vn, It as vt, _o as w, re as wn, I as wt, Oo as x, ee as xn, dt as xt, No as y, v as yn, gt as yt, Ya as z, ve as zn, kt as zt };

//# sourceMappingURL=system.js.map