let mapData = null;

async function loadMap() {
  const res = await fetch("/brahe-kepler-newton/data/history.json");
  return await res.json();
}

function drawMap(data) {
  const canvas = document.getElementById("map");
  const ctx = canvas.getContext("2d");

  canvas.width = window.innerWidth * 0.6;
  canvas.height = 600;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // LINKS
    ctx.strokeStyle = "#999";
    ctx.lineWidth = 2;

    data.links.forEach(link => {
      const a = data.nodes.find(n => n.id === link.from);
      const b = data.nodes.find(n => n.id === link.to);

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      // label
      ctx.fillStyle = "#333";
      ctx.font = "12px Arial";
      ctx.fillText(
        link.label,
        (a.x + b.x) / 2,
        (a.y + b.y) / 2
      );
    });

    // NODES
    data.nodes.forEach(node => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, 25, 0, Math.PI * 2);

      ctx.fillStyle =
        node.type === "person" ? "#4a90e2" : "#7ed321";

      ctx.fill();

      ctx.fillStyle = "#000";
      ctx.textAlign = "center";
      ctx.fillText(node.label, node.x, node.y + 45);
    });
  }

  draw();

  // click handling
  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    data.nodes.forEach(node => {
      const dx = x - node.x;
      const dy = y - node.y;

      if (Math.sqrt(dx * dx + dy * dy) < 25) {
        showInfo(node);
      }
    });
  });

  function showInfo(node) {
    document.getElementById("infoTitle").textContent = node.label;
    document.getElementById("infoBody").textContent = node.description;
  }
}

async function main() {
  mapData = await loadMap();
  drawMap(mapData);
}

main();