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
