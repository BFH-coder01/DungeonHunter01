function lovr.conf(t)
  -- Headless dedicated server: no window, no GPU pipeline. This is what
  -- runs on the Raspberry Pi.
  t.headless = true

  t.modules.audio = false
  t.modules.graphics = false
  t.modules.headset = false
  t.modules.math = true
  t.modules.physics = false -- flip on if/when server-side collision needs it
  t.modules.thread = false
  t.modules.timer = true

  t.window = nil
end
