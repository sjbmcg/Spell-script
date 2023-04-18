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
    selectedSpell.textContent = spell.name;
    selectedSummary.textContent = `Locals: ${localsText}. Calls: ${callsText}.`;
  }

  function showExpressionInfo() {
    selectedSpell.textContent = "Expression mode";
    selectedSummary.textContent =
      "Type maths like 1+1 or build functions with hero, spell, warp, and loot.";
  }

  function renderProgram(program) {
    latestProgram = program;
    window.FunctionMap.render(program);
    showSpellInfo(program.entrySpell);
    window.FunctionMap.select(program.entrySpell);
  }

  function runCode() {
    const source = codingSpace.value;

    try {
      const report = window.EndlessLab.run(source);

      if (report.mode === "script") {
        renderProgram(report.program);
        resultBox.textContent = `Result: ${window.EndlessLab.formatValue(report.lastLoot)}`;
        statusBanner.textContent = `Status: running ${report.program.spells.length} spell${report.program.spells.length === 1 ? "" : "s"}`;
        outputLog.textContent = [
          ...(report.output.length ? report.output : ["No say output."]),
          `Return: ${window.EndlessLab.formatValue(report.lastLoot)}`
        ].join("\n");
        return;
      }

      latestProgram = null;
      window.FunctionMap.clear();
      showExpressionInfo();
      resultBox.textContent = `Result: ${window.EndlessLab.formatValue(report.result)}`;
      statusBanner.textContent = "Status: expression mode";
      outputLog.textContent = `Return: ${window.EndlessLab.formatValue(report.result)}`;
    } catch (error) {
      latestProgram = null;
      window.FunctionMap.clear();
      showSpellInfo(null);
      resultBox.textContent = "Result: waiting";
      statusBanner.textContent = `Status: ${error.message}`;
      outputLog.textContent = `Error: ${error.message}`;
    }
  }

  window.FunctionMap.setSelectionHandler((spellName) => {
    showSpellInfo(spellName);
  });

  loadSampleButton.addEventListener("click", () => {
    codingSpace.value = window.starterProgram;
    runCode();
  });

  runButton.addEventListener("click", () => {
    runCode();
  });

  codingSpace.addEventListener("input", () => {
    window.clearTimeout(inputTimer);
    inputTimer = window.setTimeout(runCode, 120);
  });

  renderHints();
  codingSpace.value = window.starterProgram;
  runCode();
})();
