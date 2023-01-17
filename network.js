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
