"use strict";

// SKY WARRIOR - Flight Engine v1
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let W = 0, H = 0;
let running = false;
let lastTime = 0;
let elapsed = 0;

const plane = {
  x: 0,
  y: 0,
  speed: 280,
  altitude: 1200,
  heading: 0,
  pitch: 0,
  roll: 0,
  score: 0
};

const input = {
  left: false,
  right: false,
  up: false,
  down: false,
  boost: false
};

let clouds = [];
let stars = [];
let rings = [];
let mission = "free";
let ringsPassed = 0;
let muted = false;
let audioContext = null;

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;

  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  plane.x = W / 2;
  plane.y = H * 0.60;

  createSky();
  draw();
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function createSky() {
  clouds = [];
  stars = [];

  for (let i = 0; i < 65; i++) {
    clouds.push({
      x: random(-W, W * 2),
      y: random(-H, H),
      size: random(18, 75),
      depth: random(0.2, 1)
    });
  }

  for (let i = 0; i < 90; i++) {
    stars.push({
      x: random(0, W),
      y: random(0, H * 0.55),
      size: random(0.5, 2)
    });
  }
}

function sky() {
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, "#07162e");
  gradient.addColorStop(0.36, "#28658e");
  gradient.addColorStop(0.72, "#8fc1d7");
  gradient.addColorStop(1, "#e4d8bd");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  stars.forEach(s => {
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillRect(s.x, s.y, s.size, s.size);
  });

  const glow = ctx.createRadialGradient(
    W * 0.76, H * 0.27, 5,
    W * 0.76, H * 0.27, H * 0.35
  );

  glow.addColorStop(0, "rgba(255,225,160,0.45)");
  glow.addColorStop(1, "rgba(255,225,160,0)");

  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Distant mountain silhouettes
  drawMountains(H * 0.70, "#526f82", 0.035);
  drawMountains(H * 0.76, "#314f63", 0.055);
  drawMountains(H * 0.83, "#203b4e", 0.08);
}

function drawMountains(base, color, heightFactor) {
  ctx.beginPath();
  ctx.moveTo(0, H);

  for (let x = 0; x <= W + 20; x += 20) {
    const wave =
      Math.sin(x * 0.012 + elapsed * 0.00008) * 0.5 +
      Math.sin(x * 0.027) * 0.3 +
      Math.cos(x * 0.006) * 0.2;

    ctx.lineTo(x, base - wave * H * heightFactor * 5);
  }

  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawCloud(c) {
  const x = c.x;
  const y = c.y;
  const s = c.size;

  ctx.save();
  ctx.globalAlpha = 0.12 + c.depth * 0.30;
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "#ffffff";
  ctx.shadowBlur = 18 * c.depth;

  ctx.beginPath();
  ctx.ellipse(x, y, s, s * 0.28, 0, 0, Math.PI * 2);
  ctx.ellipse(x - s * 0.35, y + 2, s * 0.48, s * 0.24, 0, 0, Math.PI * 2);
  ctx.ellipse(x + s * 0.3, y - s * 0.08, s * 0.52, s * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawPlane() {
  const x = W / 2 + plane.x - W / 2;
  const y = H * 0.62 + plane.pitch * 35;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(plane.roll * 0.42);

  const passenger =
    document.getElementById("aircraftSelect").value === "passenger";

  // Engine glow
  if (plane.speed > 350) {
    ctx.fillStyle = "rgba(76,220,255,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 24, 5, plane.speed / 35, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.shadowColor = "#00111e";
  ctx.shadowBlur = 12;

  // Wings
  ctx.fillStyle = passenger ? "#f2f4f5" : "#b6c7d2";
  ctx.beginPath();
  ctx.moveTo(0, -29);
  ctx.lineTo(passenger ? 10 : 7, -6);
  ctx.lineTo(38, 13);
  ctx.lineTo(35, 18);
  ctx.lineTo(7, 9);
  ctx.lineTo(5, 22);
  ctx.lineTo(13, 28);
  ctx.lineTo(11, 31);
  ctx.lineTo(2, 27);
  ctx.lineTo(0, 34);
  ctx.lineTo(-2, 27);
  ctx.lineTo(-11, 31);
  ctx.lineTo(-13, 28);
  ctx.lineTo(-5, 22);
  ctx.lineTo(-7, 9);
  ctx.lineTo(-35, 18);
  ctx.lineTo(-38, 13);
  ctx.lineTo(-7, -6);
  ctx.closePath();
  ctx.fill();

  // Cockpit
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#183e55";
  ctx.beginPath();
  ctx.ellipse(0, -13, 3.5, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawReticle() {
  const x = W / 2;
  const y = H * 0.43;

  ctx.strokeStyle = "rgba(159,245,255,0.8)";
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(x - 17, y);
  ctx.lineTo(x - 6, y);
  ctx.moveTo(x + 6, y);
  ctx.lineTo(x + 17, y);
  ctx.moveTo(x, y - 17);
  ctx.lineTo(x, y - 6);
  ctx.moveTo(x, y + 6);
  ctx.lineTo(x, y + 17);
  ctx.stroke();
}

function draw() {
  if (!W || !H) return;

  sky();

  clouds.forEach(drawCloud);

  if (running) {
    drawRings();
  }

  drawPlane();
  drawReticle();
}

function drawRings() {
  rings.forEach(r => {
    const scale = Math.max(0.1, r.depth);
    const x = W / 2 + r.x * scale;
    const y = H * 0.45 + r.y * scale;
    const radius = 60 * scale;

    ctx.strokeStyle = "#ffe09a";
    ctx.lineWidth = Math.max(1, 4 * scale);
    ctx.shadowColor = "#ffbd4a";
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * 0.72, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur = 0;
    r.depth -= 0.003 * (plane.speed / 280);

    if (r.depth <= 0.12) {
      r.depth = random(0.9, 1.3);
      r.x = random(-W * 0.4, W * 0.4);
      r.y = random(-H * 0.25, H * 0.25);
    }
  });
}

function update(dt) {
  if (!running) return;

  elapsed += dt * 1000;

  const acceleration = input.boost ? 440 : 140;
  const maxSpeed =
    document.getElementById("aircraftSelect").value === "passenger"
      ? 920 : 1850;

  if (input.boost) {
    plane.speed += acceleration * dt;
  } else {
    plane.speed += (280 - plane.speed) * dt * 0.12;
  }

  plane.speed = Math.max(0, Math.min(maxSpeed, plane.speed));

  if (input.left) plane.roll = Math.max(-1, plane.roll - dt * 2);
  else if (input.right) plane.roll = Math.min(1, plane.roll + dt * 2);
  else plane.roll *= 0.94;

  if (input.up) plane.pitch = Math.max(-1, plane.pitch - dt);
  if (input.down) plane.pitch = Math.min(1, plane.pitch + dt);

  plane.heading =
    (plane.heading + plane.roll * dt * 40 + 360) % 360;

  plane.altitude += plane.pitch * dt * 75;
  plane.altitude = Math.max(100, Math.min(15000, plane.altitude));

  clouds.forEach(c => {
    c.y += (plane.speed / 280) * c.depth * dt * 32;
    c.x -= plane.roll * c.depth * dt * 90;

    if (c.y > H + 100) {
      c.y = -100;
      c.x = random(-W, W * 2);
    }

    if (c.x < -150) c.x = W + 100;
    if (c.x > W + 150) c.x = -100;
  });

  plane.score += dt * plane.speed / 10;

  updateHUD();
  updateMission(dt);
}

function updateHUD() {
  const speed = document.getElementById("speed");
  const altitude = document.getElementById("altitude");
  const heading = document.getElementById("heading");
  const score = document.getElementById("score");

  if (speed) speed.textContent = Math.round(plane.speed);
  if (altitude) altitude.textContent = Math.round(plane.altitude);
  if (heading) heading.textContent = String(Math.round(plane.heading)).padStart(3, "0");
  if (score) score.textContent = String(Math.floor(plane.score)).padStart(6, "0");
}

function updateMission(dt) {
  if (mission === "distance" && plane.score >= 1500) {
    completeMission("LONG HAUL", "Масофаи ҳадаф тай шуд!");
  }

  if (mission === "altitude" && plane.altitude >= 5000) {
    completeMission("HIGH ALTITUDE", "Ба баландии 5000 метр расидӣ!");
  }

  if (mission === "rings") {
    ringsPassed += dt * (plane.speed / 280);

    if (ringsPassed >= 20) {
      completeMission("GATE RUN", "Миссия бомуваффақият анҷом ёфт!");
    }
  }
}

function completeMission(title, message) {
  running = false;
  document.getElementById("hud").classList.add("hidden");

  document.getElementById("resultTitle").textContent = title;
  document.getElementById("resultText").textContent =
    message + " Холҳо: " + Math.floor(plane.score);

  document.getElementById("resultPanel").classList.remove("hidden");
}

function startGame(mode = "free") {
  mission = mode;
  running = true;
  elapsed = 0;
  ringsPassed = 0;

  plane.speed = 280;
  plane.altitude = 1200;
  plane.heading = 0;
  plane.pitch = 0;
  plane.roll = 0;
  plane.score = 0;

  rings = [];

  for (let i = 0; i < 6; i++) {
    rings.push({
      x: random(-W * 0.3, W * 0.3),
      y: random(-H * 0.2, H * 0.2),
      depth: random(0.4, 1.3)
    });
  }

  document.getElementById("mainMenu").classList.add("hidden");
  document.getElementById("missionPanel").classList.add("hidden");
  document.getElementById("pausePanel").classList.add("hidden");
  document.getElementById("resultPanel").classList.add("hidden");
  document.getElementById("hud").classList.remove("hidden");

  document.getElementById("missionBadge").textContent =
    mode === "free" ? "FREE FLIGHT" : "MISSION: " + mode.toUpperCase();

  const objective = document.getElementById("objective");
  if (objective) {
    objective.textContent =
      mode === "free" ? "FREE FLIGHT · EXPLORE" :
      mode === "rings" ? "GATE RUN · FLY THROUGH THE SKY" :
      mode === "distance" ? "LONG HAUL · KEEP FLYING" :
      "HIGH ALTITUDE · CLIMB TO 5000 M";
  }

  lastTime = performance.now();
  requestAnimationFrame(loop);
}

function loop(now) {
  if (!running) return;

  const dt = Math.min((now - lastTime) / 1000, 0.04);
  lastTime = now;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

function pauseGame() {
  if (!running) return;

  running = false;
  document.getElementById("pausePanel").classList.remove("hidden");
}

function resumeGame() {
  document.getElementById("pausePanel").classList.add("hidden");
  running = true;
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

function exitToMenu() {
  running = false;
  document.getElementById("hud").classList.add("hidden");
  document.getElementById("pausePanel").classList.add("hidden");
  document.getElementById("resultPanel").classList.add("hidden");
  document.getElementById("mainMenu").classList.remove("hidden");
  draw();
}

function setControl(name, value) {
  if (name in input) input[name] = value;
}

window.addEventListener("keydown", e => {
  const keys = {
    ArrowLeft: "left", a: "left", A: "left",
    ArrowRight: "right", d: "right", D: "right",
    ArrowUp: "up", w: "up", W: "up",
    ArrowDown: "down", s: "down", S: "down",
    Shift: "boost"
  };

  const control = keys[e.key];
  if (control) {
    input[control] = true;
    e.preventDefault();
  }
});

window.addEventListener("keyup", e => {
  const keys = {
    ArrowLeft: "left", a: "left", A: "left",
    ArrowRight: "right", d: "right", D: "right",
    ArrowUp: "up", w: "up", W: "up",
    ArrowDown: "down", s: "down", S: "down",
    Shift: "boost"
  };

  if (keys[e.key]) input[keys[e.key]] = false;
});

document.querySelectorAll("[data-control]").forEach(button => {
  const name = button.dataset.control;

  const down = e => {
    e.preventDefault();
    setControl(name, true);
    button.setPointerCapture?.(e.pointerId);
  };

  const up = e => {
    e.preventDefault();
    setControl(name, false);
  };

  button.addEventListener("pointerdown", down);
  button.addEventListener("pointerup", up);
  button.addEventListener("pointercancel", up);
  button.addEventListener("lostpointercapture", up);
});

let touchX = null;
let touchY = null;

canvas.addEventListener("pointerdown", e => {
  if (!running) return;
  touchX = e.clientX;
  touchY = e.clientY;
});

canvas.addEventListener("pointermove", e => {
  if (!running || touchX === null) return;

  const dx = e.clientX - touchX;
  const dy = e.clientY - touchY;

  plane.roll = Math.max(-1, Math.min(1, dx / 120));
  plane.pitch = Math.max(-1, Math.min(1, dy / 120));

  touchX = e.clientX;
  touchY = e.clientY;
});

canvas.addEventListener("pointerup", () => {
  touchX = null;
  touchY = null;
});

document.getElementById("freeFlightBtn")
  .addEventListener("click", () => startGame("free"));

document.getElementById("missionBtn")
  .addEventListener("click", () => {
    document.getElementById("mainMenu").classList.add("hidden");
    document.getElementById("missionPanel").classList.remove("hidden");
  });

document.getElementById("backBtn")
  .addEventListener("click", () => {
    document.getElementById("missionPanel").classList.add("hidden");
    document.getElementById("mainMenu").classList.remove("hidden");
  });

document.querySelectorAll("[data-mission]").forEach(button => {
  button.addEventListener("click", () => startGame(button.dataset.mission));
});

document.getElementById("pauseBtn")
  .addEventListener("click", pauseGame);

document.getElementById("resumeBtn")
  .addEventListener("click", resumeGame);

document.getElementById("exitBtn")
  .addEventListener("click", exitToMenu);

document.getElementById("resetBtn")
  .addEventListener("click", () => startGame(mission));

document.getElementById("againBtn")
  .addEventListener("click", () => startGame(mission));

document.getElementById("resultMenuBtn")
  .addEventListener("click", exitToMenu);

document.getElementById("soundBtn")
  .addEventListener("click", () => {
    muted = !muted;
    document.getElementById("soundBtn").textContent = muted ? "♫̸" : "♫";
  });

window.addEventListener("resize", resize);

resize();
