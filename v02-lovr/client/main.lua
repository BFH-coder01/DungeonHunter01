local enet = require("enet")
local protocol = require("shared.protocol")

-- Point this at the Raspberry Pi's LAN address/hostname once deployed
-- (e.g. "dungeonhunter.local:7878"), same role as the v01 browser client
-- connecting to ws://<pi>:8080.
local SERVER_ADDRESS = "localhost:7878"

local host
local serverPeer
local connected = false

function lovr.load()
  host = enet.host_create()
  serverPeer = host:connect(SERVER_ADDRESS)
end

function lovr.update(dt)
  host:service(0)
  for event in host.events do
    if event.type == "connect" then
      connected = true
      print("connected to server")
      -- TODO: send protocol.MSG.HELLO (name/join request)
    elseif event.type == "disconnect" then
      connected = false
      print("disconnected from server")
    elseif event.type == "receive" then
      -- TODO: decode protocol.MSG.WELCOME / SNAPSHOT / EVENT, feed into
      -- local world state + reconciliation for predicted local movement
    end
  end

  -- TODO: sample input, run local movement prediction, send
  -- protocol.MSG.INTENT on protocol.CHANNEL.INTENT every frame
end

function lovr.draw(pass)
  pass:setColor(0.05, 0.05, 0.08)
  pass:plane(0, 0, 0, 10, 10, -math.pi / 2, 1, 0, 0)

  pass:setColor(1, 1, 1)
  local status = connected and "connected" or "connecting..."
  pass:text(("DungeonHunter v02 — %s"):format(status), 0, 1.5, -3, 0.3)
end

function lovr.quit()
  if serverPeer then
    serverPeer:disconnect()
  end
  if host then
    host:flush()
  end
end
