# Dungeon modes verification — 18 November 2026 (Brisbane)

The source files and vendored runtime in `DungeonHunter01-working` matched
the supplied temporary `DungeonHunter01-local` copy before this review.
No implementation overwrite was needed. The older partial `experiments` tree
in the parent directory was preserved. Neither supplied full directory contained
Git metadata, so branch identity and staged/unstaged changes could not be
verified during that review. No commit, merge, push, or branch creation was performed during browser verification.

## Results

- Local build passed, including pinned runtime integrity verification and kit generation.
- All eight Node tests passed.
- Edge 157 browser checks passed for textured 3D and Basic. Screenshots were
  inspected: the 3D scene shows stone wall/floor textures; Basic uses solid blocks.
- 3D loaded all four mesh assets and both textures. Basic made no kit requests.
- Query parameters cannot override the startup mode. Disconnect/rejoin retains
  the mode. The test stops its own Estella process before starting the next mode.
- Authoritative game snapshots continued after each Estella host was stopped.
- The existing three-view browser acceptance test passed in 3D: movement,
  action intents, reconnect, no privileged messages, no JavaScript errors,
  and zero settled camera/server drift.
- The 30-second steady-state run measured 59.88 median FPS and 59.17 sampled
  1% low FPS across 2,816 tile meshes. WASM heap stayed at 17,301,504 bytes.
  Initial scene startup produced a slow frame and temporary waiting status;
  steady-state measurements exclude warmup and are not a cold-start guarantee.

Evidence is local under `experiments/estella-client/evidence/`:
`dungeon-modes-results.json`, `dungeon-3d-acceptance.json`,
`dungeon-3d.png`, and `dungeon-basic.png`.

## Reproduce

Keep the authoritative server running on port 8080. With the Estella host
stopped and port 5173 free, run `npm run test:dungeon-modes` from
`experiments/estella-client`. This test owns only its temporary Estella hosts;
it never stops the game server. For the existing three-view test, start
`npm start -- --dungeon-mode=3d` separately, then run `npm run test:browser`.

For manual play-testing, the final local host was left in 3D mode. Close its
browser tab, stop only the Estella host, and start it with
`npm start -- --dungeon-mode=basic` to switch. Reopen the browser tab.
Human gameplay feel, other devices, and LAN testing remain outside these checks.

## GitHub synchronization

At the user's subsequent request, a separate local clone on
`feature/estella-poc` was created from GitHub head `a2c1859`. Its tracked
source matched the verified local copy except for the dungeon-mode changes;
line-ending-only differences and older evidence were preserved. The renderer,
mode test, documentation, and new JSON evidence are included in this update.
The cloned build and all eight tests passed. `main` remains unchanged.
