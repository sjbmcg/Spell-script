const mapContainer = document.getElementById("tree");

let latestProgram = null;
let selectionHandler = null;
let network = null;
let nodes = null;
let edges = null;

function readThemeColor(name, fallback) {
  const value = window.getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

function currentNetworkOptions() {
  return {
    interaction: {
      hover: true,
      selectable: true,
      keyboard: false,
      multiselect: false,
      dragNodes: false
    },
    nodes: {
      shape: "box",
      borderWidth: 2,
      margin: 12,
      color: {
        border: readThemeColor("--node-border", "#d27d99"),
        background: readThemeColor("--node-bg", "#fff8fb"),
        highlight: {
          border: readThemeColor("--node-highlight-border", "#c35b82"),
          background: readThemeColor("--node-highlight-bg", "#ffe8f0")
        }
      },
      font: {
        color: readThemeColor("--node-text", "#6e4958"),
        face: "Palatino Linotype",
        size: 16
      }
    },
    edges: {
      color: readThemeColor("--edge-color", "#cc8ba2"),
      smooth: false,
      arrows: { to: true }
    },
    layout: {
      hierarchical: {
        direction: "DU",
        sortMethod: "directed",
        levelSeparation: 120,
        nodeSpacing: 90,
        treeSpacing: 150
      }
    },
    physics: false
  };
}

function setupNetwork() {
  nodes = new vis.DataSet();
  edges = new vis.DataSet();

  network = new vis.Network(
    mapContainer,
    { nodes, edges },
    currentNetworkOptions()
  );

  network.on("selectNode", (params) => {
    if (selectionHandler && params.nodes.length) {
      selectionHandler(params.nodes[0]);
    }
  });
}

function renderFallback(program) {
  mapContainer.className = "fallback-map";
  mapContainer.innerHTML = "";

  if (!program) {
    return;
  }

  program.spells.forEach((spell) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "fallback-node";
    button.textContent = spell.calls.length
      ? `${spell.name} -> ${spell.calls.join(", ")}`
      : spell.name;
    button.addEventListener("click", () => {
      if (selectionHandler) {
        selectionHandler(spell.name);
      }
    });
    mapContainer.appendChild(button);
  });
}

if (window.vis && window.vis.DataSet && window.vis.Network) {
  setupNetwork();
}

window.FunctionMap = {
  render(program) {
    latestProgram = program;

    if (!network) {
      renderFallback(program);
      return;
    }

    mapContainer.className = "";
    nodes.clear();
    edges.clear();

    if (!program) {
      return;
    }

    program.spells.forEach((spell) => {
      nodes.add({
        id: spell.name,
        label: spell.name,
        title: spell.locals.length
          ? `Locals: ${spell.locals.join(", ")}`
          : "No locals"
      });

      spell.calls.forEach((callName) => {
        edges.add({
          from: spell.name,
          to: callName
        });
      });
    });
  },

  clear() {
    latestProgram = null;

    if (!network) {
      mapContainer.className = "fallback-map";
      mapContainer.innerHTML = "";
      return;
    }

    nodes.clear();
    edges.clear();
  },

  select(spellName) {
    if (!spellName) {
      return;
    }

    if (!network) {
      if (selectionHandler) {
        selectionHandler(spellName);
      }
      return;
    }

    network.selectNodes([spellName]);
    network.focus(spellName, {
      scale: 1,
      animation: {
        duration: 200,
        easingFunction: "easeInOutQuad"
      }
    });
  },

  setSelectionHandler(handler) {
    selectionHandler = handler;
  },

  refreshTheme() {
    if (!network) {
      return;
    }

    network.setOptions(currentNetworkOptions());
  }
};
