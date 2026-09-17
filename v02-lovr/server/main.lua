local enet = require("enet")
local protocol = require("shared.protocol")

local PORT = 7878
local TICK_RATE = 20 -- Hz, matches v01's snapshot cadence order of magnitude

local host
local peers = {} -- peer -> { id = number, name = string }
local nextPlayerId = 1

function lovr.load()
  host = enet.host_create("*:" .. PORT)
  print(("dungeonhunter v02 server listening on udp/%d"):format(PORT))
end

local function onConnect(event)
  local id = nextPlayerId
  nextPlayerId = nextPlayerId + 1
  peers[event.peer] = { id = id }
  print(("player %d connected from %s"):format(id, tostring(event.peer)))
  -- TODO: send protocol.MSG.WELCOME with initial world/dungeon state
end

local function onDisconnect(event)
  local player = peers[event.peer]
  if player then
    print(("player %d disconnected"):format(player.id))
    peers[event.peer] = nil
    -- TODO: broadcast death/despawn event, drop inventory (mirrors v01
    -- damage()/respawn semantics in src/server/game.js)
  end
end

local function onReceive(event)
  local player = peers[event.peer]
  if not player then return end
  -- TODO: decode event.data per protocol.MSG, validate, and feed into an
  -- authoritative game/tick model analogous to src/server/game.js. The
  -- server must never trust position/health/damage/inventory from here —
  -- only intent (movement/aim/action), same rule as v01.
end

local tickAccum = 0

function lovr.update(dt)
  host:service(0)
  for event in host.events do
    if event.type == "connect" then
      onConnect(event)
    elseif event.type == "disconnect" then
      onDisconnect(event)
    elseif event.type == "receive" then
      onReceive(event)
    end
  end

  tickAccum = tickAccum + dt
  local tickInterval = 1 / TICK_RATE
  while tickAccum >= tickInterval do
    tickAccum = tickAccum - tickInterval
    -- TODO: advance authoritative simulation one tick, then fan out
    -- protocol.MSG.SNAPSHOT to each peer on protocol.CHANNEL.STATE
    -- (interest-managed per player, not a global broadcast).
  end
end

function lovr.quit()
  if host then
    host:flush()
  end
end
