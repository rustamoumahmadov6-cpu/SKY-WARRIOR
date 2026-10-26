"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const $ = (id) => document.getElementById(id);

const ui = {
  main: $("mainMenu"),
  missions: $("missionPanel"),
  hud: $("hud"),
  pause: $("pausePanel"),
  result: $("resultPanel"),
  badge: $("missionBadge"),
  speed: $("speed"),
  altitude: $("altitude"),
  heading: $("heading"),
  score: $("score"),
  objective: $("objective"),
  controls: $("mobileControls"),
  aircraft: $("aircraftSelect")
};

let W = 0;
let H = 0;
let lastTime = 0;
let running = false;
let paused = false;
let mission = "free";
let soundOn = true;
let audio = null;
let animationId = 0;
let rings = [];
let clouds = [];
let score = 0;
let distance = 0;
let ringCount = 0;
let worldTime = 0;

const keys = Object.create(null);
const touch = Object.create(null);

const plane = {
  x: 0,
  y: 0,
  speed: 120,
  altitude: 500,
  heading: 0,
  pitch: 0,
  roll: 0
};

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawScene();
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function makeWorld() {
  clouds = [];
  rings = [];

  for (let i = 0; i < 22; i++) {
    clouds.push({
      x: randomRange(0, W),
      y: randomRange(0, H * 0.72),
      size: randomRange(20, 65),
      depth: randomRange(0.3, 1)
    });
  }

  for (let i = 0; i < 8; i++) {
    rings.push({
      x: randomRange(-W * 0.4, W * 0.4),
      y: randomRange(-H * 0.3, H * 0.3),
      z: 600 + i * 420,
      passed: false
    });
  }
}

function drawCloud(cloud) {
  const size = cloud.size;
  ctx.fillStyle = "rgba(255,255,255,0.83)";
  ctx.beginPath();
  ctx.ellipse(cloud.x, cloud.y, size, size * 0.3, 0, 0, Math.PI * 2);
  ctx.ellipse(
    cloud.x - size * 0.3,
    cloud.y - size * 0.1,
    size * 0.45,
    size * 0.3,
    0, 0, Math.PI * 2
  );
  ctx.ellipse(
    cloud.x + size * 0.3,
    cloud.y - size * 0.13,
    size * 0.5,
    size * 0.34,
    0, 0, Math.PI * 2
  );
  ctx.fill();
}

function drawMountains() {
  const horizon = H * 0.62 + plane.pitch * 1.2;

  ctx.fillStyle = "#567d80";
  ctx.beginPath();
  ctx.moveTo(0, horizon);

  for (let x = 0; x <= W + 80; x += 80) {
    const y = horizon - randomMountain(x) * 0.15;
    ctx.lineTo(x, y);
  }

  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#385c68";
  ctx.beginPath();
  ctx.moveTo(0, horizon + 35);

  for (let x = 0; x <= W + 70; x += 70) {
    ctx.lineTo(x, horizon + 20 - randomMountain(x + 170) * 0.12);
  }

  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();
}

function randomMountain(x) {
  return Math.abs(Math.sin(x * 0.018) * 120 +
    Math.sin(x * 0.047) * 65);
}

function drawPlane() {
  ctx.save();
  ctx.translate(W / 2, H * 0.57);
  ctx.rotate(plane.roll * 0.008);

  ctx.fillStyle = "#101e2a";
  ctx.strokeStyle = "#c8e9f5";
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(0, -42);
  ctx.lineTo(9, -8);
  ctx.lineTo(43, 15);
  ctx.lineTo(43, 23);
  ctx.lineTo(7, 17);
  ctx.lineTo(4, 35);
  ctx.lineTo(17, 43);
  ctx.lineTo(17, 48);
  ctx.lineTo(0, 43);
  ctx.lineTo(-17, 48);
  ctx.lineTo(-17, 43);
  ctx.lineTo(-4, 35);
  ctx.lineTo(-7, 17);
  ctx.lineTo(-43, 23);
  ctx.lineTo(-43, 15);
  ctx.lineTo(-9, -8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#45d7ff";
  ctx.beginPath();
  ctx.moveTo(0, -33);
  ctx.lineTo(4, -7);
  ctx.lineTo(0, 2);
  ctx.lineTo(-4, -7);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawRings() {
  if (mission !== "rings") return;

  for (const ring of rings) {
    if (ring.passed) continue;

    const scale = 500 / Math.max(100, ring.z);
    const x = W / 2 + ring.x * scale;
    const y = H * 0.57 + ring.y * scale;
    const radius = Math.max(4, 45 * scale);

    ctx.strokeStyle = "#ffe37b";
    ctx.lineWidth = Math.max(2, 7 * scale);
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * 1.15, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawScene() {
  if (!W || !H) return;

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#0876b8");
  sky.addColorStop(0.58, "#7dc8ed");
  sky.addColorStop(1, "#e4f7ff");

  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  for (const cloud of clouds) drawCloud(cloud);

  drawMountains();
  drawRings();
  drawPlane();

  if (running && !paused) {
    ctx.fillStyle = "#071727bb";
    ctx.font = "bold 12px Arial";
    ctx.fillText("SKY-WARRIOR", 16, H - 18);
  }
}

function setPanel(panel) {
  for (const name of ["main", "missions", "hud", "pause", "result"]) {
    ui[name].classList.add("hidden");
  }

  if (panel) ui[panel].classList.remove("hidden");
}

function resetFlight() {
  plane.x = 0;
  plane.y = 0;
  plane.speed = 120;
  plane.altitude = 500;
  plane.heading = 0;
  plane.pitch = 0;
  plane.roll = 0;

  score = 0;
  distance = 0;
  ringCount = 0;
  worldTime = 0;

  makeWorld();
  updateHUD();
}

function startGame(selectedMission = "free") {
  mission = selectedMission;
  paused = false;
  running = true;

  resetFlight();
  setPanel("hud");
  ui.controls.classList.remove("hidden");

  const names = {
    free: "FREE FLIGHT",
    rings: "RING CHALLENGE",
    distance: "DISTANCE RUN",
    altitude: "ALTITUDE CHALLENGE"
  };

  ui.badge.textContent = names[mission] || names.free;
  ui.objective.textContent = getObjective();
  lastTime = performance.now();

  if (animationId) cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(gameLoop);
}

function getObjective() {
  if (mission === "rings") return "Аз ҳалқаҳои зард гузар!";
  if (mission === "distance") return "Масофаи парвозро зиёд кун!";
  if (mission === "altitude") return "Ба баландии 3000 метр бирас!";
  return "Ба парвоз оғоз кун!";
}

function updateFlight(dt) {
  const left = keys.ArrowLeft || keys.a || touch.left;
  const right = keys.ArrowRight || keys.d || touch.right;
  const up = keys.ArrowUp || keys.w || touch.up;
  const down = keys.ArrowDown || keys.s || touch.down;
  const accelerating = keys.Shift || keys[" "] || touch.accelerate;
  const braking = keys.Control || touch.brake;

  if (accelerating) plane.speed += 100 * dt;
  else plane.speed -= 12 * dt;

  if (braking) plane.speed -= 140 * dt;

  plane.speed = Math.max(0, Math.min(850, plane.speed));

  if (left) plane.heading -= 65 * dt;
  if (right) plane.heading += 65 * dt;

  plane.heading = (plane.heading + 360) % 360;

  if (up) plane.pitch = Math.max(-120, plane.pitch - 90 * dt);
  if (down) plane.pitch = Math.min(120, plane.pitch + 90 * dt);

  plane.pitch *= Math.pow(0.95, dt * 60);
  plane.roll = (right ? 1 : 0) - (left ? 1 : 0);

  plane.altitude += (-plane.pitch * 0.9 + (plane.speed - 120) * 0.02) * dt;
  plane.altitude = Math.max(0, Math.min(12000, plane.altitude));

  const travelled = plane.speed * dt / 3.6;
  distance += travelled;
  worldTime += dt;

  for (const cloud of clouds) {
    cloud.x -= (plane.speed * 0.05 + 12) * cloud.depth * dt;
    if (cloud.x < -100) {
      cloud.x = W + 100;
      cloud.y = randomRange(0, H * 0.65);
    }
  }

  if (mission === "rings") {
    for (const ring of rings) {
      ring.z -= plane.speed * 0.55 * dt;

      if (!ring.passed && ring.z < 60) {
        ring.passed = true;
        ringCount++;
        score += 100;
      }
    }

    if (rings.every(r => r.passed)) {
      for (let i = 0; i < 8; i++) {
        rings.push({
          x: randomRange(-W * 0.4, W * 0.4),
          y: randomRange(-H * 0.3, H * 0.3),
          z: 600 + i * 420,
          passed: false
        });
      }
    }
  } else {
    score = Math.floor(distance / 10);
  }

  if (mission === "altitude" && plane.altitude >= 3000) {
    finishGame("МИССИЯ ИҶРО ШУД!", "Ту ба баландии 3000 метр расидӣ!");
    return;
  }

  updateHUD();
}

function updateHUD() {
  ui.speed.textContent = Math.round(plane.speed);
  ui.altitude.textContent = Math.round(plane.altitude);
  ui.heading.textContent = String(Math.round(plane.heading)).padStart(3, "0") + "°";
  ui.score.textContent = score;

  if (mission === "rings") {
    ui.objective.textContent = "Ҳалқаҳо: " + ringCount;
  } else if (mission === "distance") {
    ui.objective.textContent = "Масофа: " + (distance / 1000).toFixed(2) + " км";
  } else {
    ui.objective.textContent = getObjective();
  }
}

function gameLoop(time) {
  if (!running || paused) return;

  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  updateFlight(dt);
  drawScene();

  if (running && !paused) {
    animationId = requestAnimationFrame(gameLoop);
  }
}

function pauseGame() {
  if (!running) return;
  paused = true;
  setPanel("pause");
  ui.controls.classList.add("hidden");
  drawScene();
}

function resumeGame() {
  if (!running) return;
  paused = false;
  setPanel("hud");
  ui.controls.classList.remove("hidden");
  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);
}

function finishGame(title, message) {
  running = false;
  paused = false;
  setPanel("result");
  ui.controls.classList.add("hidden");
  $("resultTitle").textContent = title;
  $("resultText").textContent = message + " Хол: " + score;
  drawScene();
}

function showMenu() {
  running = false;
  paused = false;
  if (animationId) cancelAnimationFrame(animationId);
  ui.controls.classList.add("hidden");
  setPanel("main");
  drawScene();
}

function playSound() {
  if (!soundOn) return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audio) audio = new AudioContextClass();
    if (audio.state === "suspended") audio.resume();

    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(440, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      660, audio.currentTime + 0.12
    );

    gain.gain.setValueAtTime(0.12, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.15);

    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.16);
  } catch (error) {
    console.warn("Audio is unavailable", error);
  }
}

function toggleSound() {
  soundOn = !soundOn;
  $("soundBtn").textContent = soundOn ? "🔊 Садо" : "🔇 Бесадо";
  if (soundOn) playSound();
}

function bindControls() {
  $("freeFlightBtn").addEventListener("click", () => {
    playSound();
    startGame("free");
  });

  $("missionBtn").addEventListener("click", () => setPanel("missions"));
  $("backBtn").addEventListener("click", () => setPanel("main"));

  document.querySelectorAll("[data-mission]").forEach(button => {
    button.addEventListener("click", () => {
      playSound();
      startGame(button.dataset.mission);
    });
  });

  $("pauseBtn").addEventListener("click", pauseGame);
  $("resumeBtn").addEventListener("click", resumeGame);
  $("exitBtn").addEventListener("click", showMenu);
  $("resetBtn").addEventListener("click", () => startGame(mission));
  $("soundBtn").addEventListener("click", toggleSound);
  $("againBtn").addEventListener("click", () => startGame(mission));
  $("resultMenuBtn").addEventListener("click", showMenu);

  window.addEventListener("keydown", event => {
    keys[event.key] = true;
    keys[event.key.toLowerCase()] = true;

    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) {
      event.preventDefault();
    }

    if (event.key === "Escape" && running && !paused) pauseGame();
  });

  window.addEventListener("keyup", event => {
    keys[event.key] = false;
    keys[event.key.toLowerCase()] = false;
  });

  document.querySelectorAll("[data-control]").forEach(button => {
    const control = button.dataset.control;

    const start = event => {
      event.preventDefault();
      touch[control] = true;
      try { button.setPointerCapture(event.pointerId); } catch (_) {}
    };

    const stop = event => {
      event.preventDefault();
      touch[control] = false;
    };

    button.addEventListener("pointerdown", start);
    button.addEventListener("pointerup", stop);
    button.addEventListener("pointercancel", stop);
    button.addEventListener("lostpointercapture", stop);
  });

  window.addEventListener("blur", () => {
    for (const key in keys) keys[key] = false;
    for (const key in touch) touch[key] = false;
  });

  window.addEventListener("resize", resizeCanvas);
}

function initializeGame() {
  makeWorld();
  bindControls();
  resizeCanvas();
  setPanel("main");
}

initializeGame();
