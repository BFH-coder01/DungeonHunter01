# Network configuration

`network.mjs` is the single location for development address and port defaults.
Processes read overrides from their environment at startup. No `.env` loader is
required: use PowerShell `$env:NAME='value'` or your deployment's environment settings.

| Setting | Purpose |
| --- | --- |
| `HOST`, `PORT` | Authoritative game listener; defaults to all interfaces, port 8080 |
| `ESTELLA_PROFILE` | `game` (default), `portals`, or `spells`; selects explicit default ports and game-link visibility |
| `ESTELLA_HOST`, `ESTELLA_PORT` | Estella HTTP listener |
| `ESTELLA_GAME_PORT` | Game port advertised to the browser; hostname comes from the page URL |
| `ESTELLA_GAME_URL` | Optional complete `ws://` or `wss://` public endpoint, including reverse-proxy path |
| `LOCAL_HOSTNAME` | Override startup-link hostname; otherwise uses the bind hostname, or localhost for wildcard listeners |
| `FIXTURE_HOST` | Preview/test fixture listener; defaults to the configured test bind address (loopback) |
| `SPELL_TEST_PORT`, `PORTAL_TEST_PORT`, `COMBAT_FIXTURE_PORT` | Individual fixture ports |
| `TEST_HOST`, `TEST_BIND_HOST` | Browser-test destination and listener addresses; bind defaults to `TEST_HOST` |
| `TEST_CLIENT_PORT`, `TEST_GAME_PORT` | Tests using an existing ordinary client/game |
| `TEST_AUX_GAME_PORT`, `TEST_MALFORMED_PORT` | Disposable compatibility/security endpoints |
| `TEST_PORTAL_CLIENT_PORT`, `TEST_PORTAL_GAME_PORT` | Isolated portal browser suite |
| `TEST_SPELL_CLIENT_PORT`, `TEST_SPELL_GAME_PORT` | Isolated spell browser suite |
| `PROBE_URL`, `GAME_URL` | Full URLs for the native particle probe and legacy browser check |

Ports must be integers from 0 to 65535. Port 0 is useful for disposable listeners
that report their assigned port; a browser's advertised game port must be nonzero.
Invalid values fail at startup instead of silently selecting a default.

The Estella host publishes only `mode` and public connection settings through
`/startup.json`. The client does not infer a game server from its own port. An HTTPS
page selects WSS automatically unless an explicit game URL is provided. Never put
secrets in a public game URL. Changing settings or rendering mode requires stopping
and restarting the Estella host; the authoritative game server can stay running.

## LAN spell preview with custom ports

In the fixture terminal, from `experiments/estella-client`:

```powershell
$env:FIXTURE_HOST='0.0.0.0'
$env:SPELL_TEST_PORT='9084'
node tests/spells-fixture-server.mjs
```

In the client terminal:

```powershell
$env:ESTELLA_PROFILE='spells'
$env:ESTELLA_HOST='0.0.0.0'
$env:ESTELLA_PORT='6176'
$env:ESTELLA_GAME_PORT='9084'
$env:ESTELLA_DIST='dist-spells'
npm run build
npm start -- --dungeon-mode=3d
```

Open `http://<server-LAN-address>:6176` from a machine allowed to reach those ports.
The game address automatically uses that same LAN hostname with port 9084.
Use arrow keys to turn on LAN HTTP if the browser restricts mouse capture.
Remove an override with `Remove-Item Env:SETTING_NAME` before returning to defaults.
