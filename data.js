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
  say "Clearing the sewer."
  loot 72
end`;

const keywordHints = [
  { word: "1+1", summary: "plain expressions still work" },
  { word: "hero", summary: "the first spell to run" },
  { word: "spell", summary: "defines a function" },
  { word: "stash", summary: "stores a value in a variable" },
  { word: "say", summary: "prints to the output box" },
  { word: "warp", summary: "calls another spell" },
  { word: "loot", summary: "returns a value" },
  { word: "end", summary: "closes a spell" }
];

window.starterProgram = starterProgram;
window.keywordHints = keywordHints;
