(() => {
  const codingSpace = document.getElementById("coding-space");
  const loadSampleButton = document.getElementById("load-sample");
  const runButton = document.getElementById("run-spellbook");
  const resultBox = document.getElementById("result");
  const statusBanner = document.getElementById("status-banner");
  const outputLog = document.getElementById("output-log");
  const selectedSpell = document.getElementById("selected-spell");
  const selectedSummary = document.getElementById("selected-summary");
  const keywordHintsContainer = document.getElementById("keyword-hints");

  let latestProgram = null;
  let inputTimer = null;

  function renderHints() {
    keywordHintsContainer.innerHTML = "";

    window.keywordHints.forEach((item) => {
      const hint = document.createElement("div");
      hint.className = "hint-chip";
      hint.textContent = `${item.word}: ${item.summary}`;
      keywordHintsContainer.appendChild(hint);
    });
  }

  function showSpellInfo(spellName) {
    const spell = latestProgram && latestProgram.spellsByName[spellName];

    if (!spell) {
      selectedSpell.textContent = "No spell selected";
      selectedSummary.textContent = "Start typing to build the map.";
      return;
    }

    const localsText = spell.locals.length ? spell.locals.join(", ") : "none";
    const callsText = spell.calls.length ? spell.calls.join(", ") : "none";
