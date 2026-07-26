import { size, inner, border, ctx } from "./layout.js";
import { Ball } from "./balls/ball.js";
import { Particle } from "./particle.js";
import { handleAllCollisions } from "./collision.js";
import { AOE } from "./aoe.js";
import { Balls } from "./balls/balls.js";
import { GlobalRNG } from "./global-rng.js";
import { Vector } from "./vector.js";

function drawBorder() {
  ctx.beginPath();
  ctx.lineWidth = 2 * border;
  ctx.strokeStyle = "#cccccc";
  ctx.rect(0, 0, size, size);
  ctx.stroke();
  ctx.closePath();
}

function drawBackground() {
  for (const ball of Ball.all) {
    switch (ball.type) {
      case "wdc":
        drawWDC(ball);
        break;
      case "spider":
        drawSpider(ball);
        break;
    }
  }
  ctx.fillStyle = "#7BC0FD";
  for (const entry of Ball.collisionHistory) {
    const alpha = (Ball.time - entry.time) / 2;
    ctx.globalAlpha = (1 - alpha) ** 4;
    ctx.beginPath();
    ctx.arc(entry.position.x, entry.position.y, 2 + 20 * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
  }
  ctx.lineWidth = 5;
  for (const entry of Particle.dead) {
    ctx.strokeStyle = entry.color;
    const alpha = (Particle.time - entry.time) / 0.5;
    ctx.globalAlpha = (1 - alpha) ** 4;
    ctx.beginPath();
    ctx.arc(entry.position.x, entry.position.y, 2 + 20 * alpha, 0, Math.PI * 2);
    ctx.stroke();
    ctx.closePath();
  }
  ctx.globalAlpha = 1;
}

function drawWDC(ball) {
  if (!ball.isSkillActive) return;
  ctx.strokeStyle = "#31435a";
  ctx.lineWidth = 2;
  const rate = ball.skillTimer / ball.skillTime;
  let prog = 1;
  const animation = 0.1;
  if (rate < animation) {
    prog = rate / animation;
  } else if (rate > 1 - animation) {
    prog = (1 - rate) / animation;
  }
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * size / 3, border);
    ctx.lineTo(i * size / 3, prog * size - border);
    ctx.stroke();
    ctx.closePath();
  }
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(border, i * size / 3);
    ctx.lineTo(prog * size - border, i * size / 3);
    ctx.stroke();
    ctx.closePath();
  }
  const collisions = Ball.collisionHistory.filter(x => (
      x.balls.includes(ball)
      && Ball.time - x.time < ball.skillTimer
      && x.balls.length === 2
    ));
  ctx.fillStyle = "#445566";
  for (const entry of collisions) {
    const pos = entry.position;
    ctx.globalAlpha = (1 - (Ball.time - entry.time) / 2) ** 2 * prog;
    const x = Math.floor(3 * pos.x / size);
    const y = Math.floor(3 * pos.y / size);
    ctx.fillRect(x * inner / 3 + border, y * inner / 3 + border, inner / 3, inner / 3);
  }
  ctx.globalAlpha = prog;
  ctx.fillStyle = "#667788";
  ctx.font = "bold 50px monospace";
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const damage = ball.gridDamages[j * 3 + i];
      const x = size * (i + 0.5) / 3;
      const y = size * (j + 0.5) / 3;
      ctx.fillText(damage, x, y);
    }
  }
  ctx.globalAlpha = 1;
}

function drawSpider(ball) {
  ctx.lineWidth = 2;
  ctx.strokeStyle = ball.color;
  ctx.fillStyle = "#999999";
  for (const web of ball.webs) {
    ctx.beginPath();
    ctx.moveTo(ball.x.x, ball.x.y);
    ctx.lineTo(web.x, web.y);
    ctx.stroke();
    ctx.closePath();
    ctx.beginPath();
    ctx.arc(web.x, web.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
  }
}

let lastUpdate;
let remainingTime = 0;
export function render() {
  const part = 0.001;
  requestAnimationFrame(() => render());
  if (!lastUpdate) {
    lastUpdate = Date.now();
    return;
  }
  const timeDiff = Date.now() - lastUpdate
  lastUpdate += timeDiff;
  const diff = timeDiff / 1000 + remainingTime;
  const iter = Math.min(100, Math.floor(diff / part));
  remainingTime = diff - part * iter;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < iter; i++) {
    Ball.tick(part);
    handleAllCollisions();
    Particle.tick(part);
    AOE.tick(part);
  }
  drawBackground();
  AOE.draw();
  Particle.draw();
  Ball.draw();
  drawBorder();
}

export function setToSeed(seed) {
  if (seed === 0 || Math.abs(seed) > 9e15) return;
  GlobalRNG.initialSeed = seed;
  GlobalRNG.seed = seed;
  Ball.all = [];
  Particle.all = [];
  AOE.all = [];
  lastUpdate = null;
  remainingTime = 0;
  init();
}

export function init() {
  const ballTypes = Balls.slice();
  const repeatable = document.querySelector("#same-ball").checked;
  const notFixed = document.querySelector("#ball-size").checked;
  let count = 0;
  do {
    const x = size * GlobalRNG.random();
    const y = size * GlobalRNG.random();
    const vx = GlobalRNG.random() - 0.5;
    const vy = GlobalRNG.random() - 0.5;
    const idx = Math.floor(ballTypes.length * GlobalRNG.random());
    let type = ballTypes[idx];
    if (!repeatable) {
      ballTypes.splice(idx, 1);
    }
    new type({
      x: new Vector(x, y),
      v: new Vector(vx, vy),
      radius: inner * 0.05 * (notFixed ? 0.5 + GlobalRNG.random() : 1)
    });
    count++
  } while (GlobalRNG.random() < 1 / count && ballTypes.length > 0);
  const info = document.querySelector("#info");
  info.innerHTML = Ball.all.map(x => `<span style='color: ${x.color}'>${x.name}</span>`).join(" VS ") + `<br>当前种子：${GlobalRNG.initialSeed}`;
}

document.querySelector("#load-seed").addEventListener("click", function() {
  const input = parseInt(document.querySelector("#seed-input").value);
  if (Number.isNaN(input)) return;
  setToSeed(input);
});

document.querySelector("#random-generate").addEventListener("click", function() {
  setToSeed(Math.floor(Math.random() * Date.now()) + 1);
});