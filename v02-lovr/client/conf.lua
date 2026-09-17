function lovr.conf(t)
  t.window.title = "DungeonHunter"
  t.window.width = 1280
  t.window.height = 720
  t.window.vsync = 1

  -- t.headset.drivers left at default so this falls back to a flatscreen
  -- window on a desktop and to OpenXR when run on a headset.
end
