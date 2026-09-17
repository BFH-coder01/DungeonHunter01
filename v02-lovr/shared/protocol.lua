-- Message type tags shared between server and client, mirroring the role of
-- src/shared/constants.js in v01. Payload shapes are not finalized yet —
-- this only pins down the channel split so replication code has a place to
-- grow into.
--
-- ENet channel plan:
--   CHANNEL.STATE   unreliable, unsequenced — per-tick snapshots (position,
--                   aim, health of visible entities). Lost packets are fine;
--                   a newer snapshot supersedes them.
--   CHANNEL.EVENT   reliable, ordered — discrete events that must all
--                   arrive: attacks landing, pickups, deaths, chat.
--   CHANNEL.INTENT  unreliable, sequenced — client input (movement/aim/
--                   action) sent every frame; only the latest matters.

local protocol = {}

protocol.CHANNEL = {
  STATE = 0,
  EVENT = 1,
  INTENT = 2,
}

protocol.MSG = {
  -- client -> server
  HELLO = "hello",
  INTENT = "intent",

  -- server -> client
  WELCOME = "welcome",
  SNAPSHOT = "snapshot",
  EVENT = "event",
}

return protocol
