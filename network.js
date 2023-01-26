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
