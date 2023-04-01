const mapContainer = document.getElementById("tree");

let latestProgram = null;
let selectionHandler = null;
let network = null;
let nodes = null;
let edges = null;

function setupNetwork() {
  nodes = new vis.DataSet();
  edges = new vis.DataSet();

  network = new vis.Network(
    mapContainer,
    { nodes, edges },
    {
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
          border: "#cfa34a",
          background: "#16213b",
          highlight: {
            border: "#f1cf7b",
            background: "#223358"
          }
        },
        font: {
          color: "#f4efe4",
          face: "Trebuchet MS",
          size: 16
        }
      },
      edges: {
        color: "#cfa34a",
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
    }
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
  }
};
