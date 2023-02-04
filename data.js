const starterProgram = `hero main

spell main
  stash player = "Stephen"
  say "Logging into Endless Online as " + player
  warp bank
  stash gold = warp sewer
  say "Gold found: " + gold
  loot gold
end

spell bank
  say "Visiting Aeven bank."
  loot "bank done"
end

spell sewer
