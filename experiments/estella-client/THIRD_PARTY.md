# Third-party provenance

The unmodified Estella release runtime and lean SDK are Apache-2.0. Preserve
`vendor/estella/LICENSE` and `NOTICE` when distributing the build. The release
tag, source commit, archive hash and per-file hashes are recorded in README and
`vendor/estella/manifest.json`.

The Web runtime contains or can reference these permissive core dependencies;
their license texts are included under `vendor/estella/licenses/`:

| Dependency | Provenance | License text |
| --- | --- | --- |
| GLM | Estella's pinned submodule `e7970a8b26732f1b0df9690f7180546f8c30e48e` | GLM.txt (MIT option) |
| nlohmann/json | Vendored header identifies v3.11.3 | nlohmann-json.txt (MIT) |
| Yoga | License copied from the pinned Estella source | Yoga.txt (MIT) |
| stb_image / stb_truetype | License blocks copied from pinned vendored headers | stb-image.txt / stb-truetype.txt (MIT / public domain) |

GLM license source:
https://github.com/g-truc/glm/blob/e7970a8b26732f1b0df9690f7180546f8c30e48e/copying.txt

nlohmann license source:
https://github.com/nlohmann/json/blob/v3.11.3/LICENSE.MIT

The upstream NOTICE lists a broader set of optional engine/editor components.
This distribution excludes the editor, FFmpeg, assets from upstream examples,
Spine runtime binaries, video decoders, native runtime and physics modules. The POC never
requests those optional components. The SDK's reachable module files retain
upstream bytes and notices even where they contain unused API declarations.

Playwright 1.56.1 is an Apache-2.0 development-only test dependency managed by
package-lock.json; it is not copied into the game build. Installed Edge/Chrome
is used for testing and is not redistributed.
