const canvas = document.getElementById("starCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let stars = [];
let yaw = 0;
let pitch = 0;
let scale = 500;

const Rendering = {
    FishEye: 0,
    Spherical: 1,
    SphericalExternal: 2,
};
const RenderingNames = ["Fish eye", "Spherical", "Spherical (external observer)"];
let rendering = Rendering.FishEye;

let dragging = false;
let lastX, lastY;

// Mouse control
canvas.addEventListener("mousedown", e => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
});

canvas.addEventListener("mouseup", () => dragging = false);

canvas.addEventListener("mousemove", e => {
    if (!dragging) return;
    yaw += (e.clientX - lastX) * 0.01;
    pitch += (e.clientY - lastY) * 0.01;
    lastX = e.clientX;
    lastY = e.clientY;
    draw();
});

canvas.addEventListener("wheel", e => {
    e.preventDefault();
    scale *= (e.deltaY > 0) ? 0.9 : 1.1;
    draw();
});

canvas.addEventListener("contextmenu", (e) => {
  e.preventDefault(); // prevent the default browser context menu
  rendering = (rendering + 1) % RenderingNames.length;
  draw();
});

// Projection function
function project(x, y, z) {
    let y1 = y * Math.cos(pitch) - z * Math.sin(pitch);
    let z1 = y * Math.sin(pitch) + z * Math.cos(pitch);
    let x2 = x * Math.cos(yaw) + z1 * Math.sin(yaw);
    let z2 = -x * Math.sin(yaw) + z1 * Math.cos(yaw);
    return { x: x2, y: y1, z: z2 };
}

// Draw function
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    
    for (const star of stars) {
        const p = project(star.x, star.y, star.z);
        
        let screenX, screenY;

        if (rendering === Rendering.Spherical) {
          if (p.z <= 0) continue;
          const r = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
          if (r === 0) continue;
          const azimuth = Math.atan2(p.x, p.z);
          const elevation = Math.asin(p.y / r);
          screenX = cx + azimuth * scale;
          screenY = cy - elevation * scale;
        } else if (rendering === Rendering.SphericalExternal) {
          const r = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
          if (r === 0) continue;
          screenX = cx - (p.x / r) * scale;
          screenY = cy - (p.y / r) * scale;
        } else { // rendering === Rendering.FishEye
          if (p.z <= 0) continue;
          screenX = cx - (p.x / p.z) * scale;
          screenY = cy - (p.y / p.z) * scale;
        }
        
        let alpha = star.mag <= -1 ? 1 :
        star.mag >= 6.5 ? 0 :
        1 - (star.mag + 1) / (6.5 + 1);
        
        if (alpha <= 0) continue;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = "white";
    ctx.font = "16px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("Projection: " + RenderingNames[rendering], 10, 10);
}

const stars = [];

fetch("http://localhost:7474/db/milkyway/tx/commit", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Basic " + btoa("neo4j:gameoflife"),
  },
  body: JSON.stringify({
    statements: [{
      statement: `
        MATCH (s:Star)
        WHERE s.magnitude <= 6.5
        RETURN s.magnitude AS magnitude, s.position.x AS x, s.position.y AS y, s.position.z AS z
      `
    }]
  })
})
.then(response => response.json())
.then(data => {
  const rows = data.results[0].data;
  for (const row of rows) {
    const [mag, x, y, z] = row.row;
    stars.push({ mag, x, y, z });
  }
  draw(); // render after load
})
.catch(err => console.error("Failed to load stars via HTTP:", err));

// Load CSV
/*Papa.parse('./stars.csv', {
    download: true,
    header: true, // auto uses first line as column names
    skipEmptyLines: true,
    dynamicTyping: true, // automatically converts numbers
    complete: function(results) {
        stars = results.data
        .map(row => ({
            mag: row.magnitude,
            x: row.x,
            y: row.y,
            z: row.z
        }))
        .filter(star =>
                typeof star.mag === 'number' &&
                typeof star.x === 'number' &&
                typeof star.y === 'number' &&
                typeof star.z === 'number'
                );
        
        draw();
    },
    error: function(err) {
        console.error("PapaParse failed:", err);
    }
});*/
