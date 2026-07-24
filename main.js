const border = 2;
const inner = 600;
const size = inner + border * 2;
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
canvas.width = size;
canvas.height = size;

function drawBorder() {
  ctx.beginPath();
  ctx.lineWidth = 2 * border;
  ctx.strokeStyle = "#cccccc";
  ctx.rect(0, 0, size, size);
  ctx.stroke();
  ctx.closePath();
}

const BALL_VELOCITY = 0.4 * inner;
const PARTICLE_VELOCITY = 0.6 * inner;

const GlobalRNG = {
  initialSeed: Math.floor(Date.now() * Math.random()) + 1,
  seed: 0,
  
  xorShift32(state) {
    /* eslint-disable no-param-reassign */
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    /* eslint-enable no-param-reassign */
    return state;
  },
  
  random() {
    if (this.seed === 0) {
      this.seed = this.initialSeed;
    }
    const state = this.xorShift32(this.seed);
    this.seed = state;
    return state / Math.pow(2, 32) + 0.5;
  }
}

class Vector {
  static zero = new Vector(0);

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  add(vector) {
    return new Vector(this.x + vector.x, this.y + vector.y);
  }

  neg() {
    return new Vector(-this.x, -this.y);
  }

  minus(vector) {
    return this.add(vector.neg());
  }

  times(num) {
    return new Vector(this.x * num, this.y * num);
  }

  get length() {
    return Math.hypot(this.x, this.y);
  }

  scaleTo(value) {
    if (this.length === 0) return this;
    return this.times(value / this.length);
  }

  static fromLengthAngle(length, angle) {
    return new Vector(length * Math.cos(angle), length * Math.sin(angle));
  }
  
  dot(vector) {
    return this.x * vector.x + this.y * vector.y;
  }
  
  sqr() {
    return this.x * this.x + this.y * this.y;
  }
  
  rotate() {
    return new Vector(-this.y, this.x);
  }}

class Movable {
  constructor(config) {
    this.x = config.x;
    this.radius = 0;
    this.config = config;
    this.time = 0;
    this.vDirection = config.v;
  }
  
  get v() {
    return new Vector(0, 0);
  }
  
  get color() {
    return "#ffffff";
  }
  
  get text() {
    return "";
  }
  
  tick(deltaTime) {
    this.time += deltaTime;
    this.x = this.x.add(this.v.times(deltaTime));
    if (this.x.x - this.radius < border) {
      this.x.x = (border + this.radius) * 2 - this.x.x;
      this.vDirection.x = -this.vDirection.x;
      this.onReflection("left");
    }
    if (this.x.x + this.radius > size - border) {
      this.x.x = (size - border - this.radius) * 2 - this.x.x;
      this.vDirection.x = -this.vDirection.x;
      this.onReflection("right");
    }
    if (this.x.y - this.radius < border) {
      this.x.y = (border + this.radius) * 2 - this.x.y;
      this.vDirection.y = -this.vDirection.y;
      this.onReflection("top");
    }
    if (this.x.y + this.radius > size - border) {
      this.x.y = (size - border - this.radius) * 2 - this.x.y;
      this.vDirection.y = -this.vDirection.y;
      this.onReflection("bottom");
    }
  }
  
  onReflection(edge) {}
  
  draw() {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x.x, this.x.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
    ctx.fillStyle = "white";
    ctx.strokeStyle = "black";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${this.radius * 0.8}px monospace`;
    ctx.lineWidth = 2;
    ctx.strokeText(this.text, this.x.x, this.x.y);
    ctx.fillText(this.text, this.x.x, this.x.y);
  }
}

class Timer {
  constructor(time, duration) {
    this.time = time;
    this.duration = duration;
  }
  
  isActive(time) {
    return time - this.time <= this.duration;
  }
}

class AOE {
  static all = [];
  
  static tick(diff) {
    AOE.all.forEach(x => x.tick(diff));
    AOE.all = AOE.all.filter(x => !x.isDead);
  }
  
  static draw() {
    AOE.all.forEach(x => x.draw());
  }
  
  constructor(config, ball) {
    this.config = config;
    this.radius = config.radius;
    this.center = config.center;
    this.lifeTime = config.lifeTime ?? 1;
    this.readyTime = config.readyTime ?? 0;
    this.ball = ball;
    this.border = config.border || false;
    AOE.all.push(this);
  }
  
  has(vec) {
    return vec.minus(this.center).length <= this.radius;
  }
  
  get isReady() {
    return this.config.lifeTime - this.lifeTime >= this.readyTime;
  }
  
  draw() {
    const trapOpacity = this.isReady ? 1 : 0.3;
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.fillStyle = this.ball.color;
    ctx.arc(this.center.x, this.center.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = trapOpacity;
    if (this.border) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = this.ball.color;
      ctx.stroke();
    }
    ctx.closePath();
    ctx.globalAlpha = 1;
  }
  
  get isDead() {
    return this.lifeTime <= 0;
  }
  
  tick(diff) {
    if (this.isDead) return;
    this.lifeTime -= diff;
  }
  
  get type() {
    return this.ball.type;
  }
}

class Particle extends Movable {
  static all = [];
  
  static tick(diff) {
    Particle.all.forEach(x => x.tick(diff));
    Particle.all = Particle.all.filter(x => !x.isDead);
  }
  
  static draw() {
    Particle.all.forEach(x => x.draw());
  }
  
  constructor(config, ball) {
    super(config);
    this.lifeTime = config.lifeTime ?? Infinity;
    this.maxCollision = config.maxCollision ?? Infinity;
    this.radius = inner * 0.01;
    this.type = config.type;
    this.ball = ball;
    Particle.all.push(this);
  }
  
  get color() {
    return this.ball.color;
  }
  
  get v() {
    return this.vDirection.scaleTo(PARTICLE_VELOCITY);
  }
  
  onReflection() {
    this.maxCollision--;
    if (this.maxCollision <= 0) {
      this.lifeTime = 0;
    }
  }
  
  get isDead() {
    return this.lifeTime <= 0;
  }
  
  tick(diff) {
    if (this.isDead) return;
    super.tick(diff);
    this.checkBall();
    this.lifeTime -= diff;
    if (this.isDead) this.onDead();
  }
  
  checkBall() {
    for (const ball of Ball.all) {
      // 粒子的碰撞箱位于中心
      if (this.x.minus(ball.x).length < ball.radius) {
        if (this.type !== "healing" && ball.type === this.ball.type) {
          return;
        }
        this.lifeTime = 0;
        switch (this.type) {
          case "ice":
            ball.applyEffect("ice", 8);
            ball.receiveDamage(5);
            break;
          case "healing":
            if (ball === this.ball) {
              ball.receiveDamage(-5);
            } else {
              ball.receiveDamage(5);
            }
        }
        return;
      }
    }
  }
  
  onDead() {
    switch (this.type) {
      case "ice": {
        const range = new AOE({
          center: this.x,
          radius: inner * 0.3,
          lifeTime: 3
        }, this.ball);
      }
    }
  }
}

class Ball extends Movable {
  static all = [];
  static collisionHistory = [];
  static time = 0;
  
  static tick(diff) {
    Ball.all.forEach(x => x.tick(diff));
    Ball.all = Ball.all.filter(x => !x.isDead);
    Ball.time += diff;
    Ball.collisionHistory = Ball.collisionHistory.filter(x => Ball.time - x.time <= 2);
  }
  
  static draw() {
    Ball.all.forEach(x => x.draw());
  }
  
  constructor(config) {
    super(config);
    this.life = config.life || 100;
    this.radius = inner * 0.05;
    this.cdTimer = 0;
    this.skillTimer = -1;
    Ball.all.push(this);
    this.lifeHistory = [];
    this.lastRecorded = 100;
    this.effects = new Map();
  }
  
  get velocityMult() {
    if (this.effectActive("stun")) return 0;
    let mult = 1;
    if (this.effectActive("ice")) mult *= 0.2;
    for (const range of AOE.all) {
      if (!range.has(this.x) || range.ball === this) continue;
      switch (range.type) {
        case "ice":
          mult *= 0.5;
      }
    }
    return mult;
  }
  
  get v() {
    return this.vDirection.scaleTo(BALL_VELOCITY * this.velocityMult);
  }
  
  get cd() {
    return Infinity;
  }
  
  get skillTime() {
    return 0;
  }
  
  get text() {
    return this.life;
  }
  
  get isDead() {
    return this.life <= 0;
  }
  
  get isSkillActive() { return this.skillTimer >= 0; }
  
  recordLife() {
    const diff = this.life - this.lastRecorded;
    if (diff === 0) return;
    const time = this.time;
    this.lifeHistory.push({ diff, time });
    this.lastRecorded = this.life;
    if (this.isDead) {
      this.onDead();
    }
  }
  
  effectActive(effect) {
    if (!this.effects.has(effect)) return false;
    return this.effects.get(effect).isActive(this.time);
  }
  
  applyEffect(effect, duration) {
    this.effects.set(effect, new Timer(
      this.time,
      duration
    ));
  }
  
  get damageReceivedPerSecond() {
    let damage = 0;
    for (const aoe of AOE.all) {
      if (!aoe.has(this.x) || aoe.ball.type === this.type) continue;
      if (!aoe.isReady) continue;
      switch (aoe.type) {
        case "ice":
        case "trap":
          damage += 3;
      }
    }
    if (this.type !== "spider") {
      const webs = Ball.all.filter(x => x.type === "spider").reduce((a, x) => a.concat(x.fullLasers), []);
      for (const web of webs) {
        const x1 = web[0].x;
        const y1 = web[0].y;
        const x2 = web[1].x;
        const y2 = web[1].y;
        const cx = this.x.x;
        const cy = this.x.y;
        const r = this.radius;
        const a = (x2 - x1) ** 2 + (y2 - y1) ** 2;
        const b = 2 * ((x2 - x1) * (x1 - cx) + (y2 - y1) * (y1 - cy));
        const c = (x1 - cx) ** 2 + (y1 - cy) ** 2 - r ** 2;
        const delta = b * b - 4 * a * c;
        if (delta < 0) continue;
        const t1 = (-b + Math.sqrt(delta)) / (2 * a);
        const t2 = (-b - Math.sqrt(delta)) / (2 * a);
        if ((t1 > 0 && t1 < 1) || (t2 > 0 && t2 < 1)) {
          damage++;
        }
      }
    }
    return damage;
  }
  
  receiveDamage(damage) {
    this.life -= damage;
    this.recordLife();
  }
  
  handleAOERestrictions() {
    for (const aoe of AOE.all) {
      if (!aoe.isReady) continue;
      if (aoe.ball.type === this.type) continue;
      switch (aoe.type) {
        case "trap": {
          const rel = this.x.minus(aoe.center);
          const dis = rel.length;
          const r1 = this.radius;
          const r2 = aoe.radius;
          if (dis <= r1 + r2 && dis >= r2 - r1) {
            let inside;
            if (dis <= r2) {
              this.x = aoe.center.add(rel.scaleTo(r2 - r1 - 2));
              inside = true;
            } else {
              this.x = aoe.center.add(rel.scaleTo(r2 + r1 + 2));
              inside = false;
            }
            const n = rel.scaleTo(1);
            // 内积>0是向外运动，否则向内
            if (rel.dot(this.vDirection) > 0 === inside) {
              const vn = this.vDirection.dot(n);
              this.vDirection = this.vDirection.minus(n.times(2 * vn));
              if (this.vDirection.length > 0) this.vDirection = this.vDirection.scaleTo(1);
            }
            this.receiveDamage(1);
          }
        }
      }
    }
  }
  
  draw() {
    super.draw();
    ctx.font = "25px monospace";
    for (const entry of this.lifeHistory) {
      const alpha = 1 - (this.time - entry.time) / 5;
    const textPos = this.x.minus(new Vector(30, 100 - 80 * alpha));
      ctx.fillStyle = entry.diff > 0 ? "#44ff44" : "#ff4444";
      ctx.globalAlpha = alpha;
      ctx.fillText(`${entry.diff > 0 ? "+" : "-"}${Math.abs(entry.diff)}`, textPos.x, textPos.y);
    }
    ctx.globalAlpha = 1;
  }
  
  /**@abstract */
  onCollision() {}
  
  tick(diff) {
    if (this.isDead) return;
    const timeBefore = this.time;
    super.tick(diff);
    this.handleAOERestrictions();
    if (this.isSkillActive) { 
      this.skillTimer += diff;
      if (this.skillTimer >= this.skillTime) {
        this.skillTimer = -1;
        this.onSkillEnd();
      }
    } else {
      // CD也受到速度干预
      this.cdTimer += diff * this.velocityMult;
    }
    if (this.cdTimer >= this.cd) {
      this.cdTimer = 0;
      this.onSkill();
      this.skillTimer = 0;
    }
    if (Math.floor(this.time) > Math.floor(timeBefore)) {
      this.life -= this.damageReceivedPerSecond;
      this.recordLife();
    }
    this.lifeHistory = this.lifeHistory.filter(entry => entry.time >= this.time - 5);
  }
  
  onSkill() {}
  onSkillEnd() {}
  
  onDead() {}
  
  stopSkill() {
    this.skillTimer = -1;
    this.onSkillEnd();
  }
}

class HealingBall extends Ball {
  get color() { return "#60fe92"; }
  get type() { return "healing"; }
  get name() { return "治疗球"; }
  
  get cd() {
    return 10;
  }
  
  onSkill() {
    let directions = [
      new Vector(1, 0),
      new Vector(-1, 0),
      new Vector(0, 1),
      new Vector(0, -1)
    ];
    if (this.life <= 30) {
      directions.push(
        new Vector(-1, -1),
        new Vector(-1, 1),
        new Vector(1, 1),
        new Vector(1, -1)
      )
    }
    for (const v of directions) {
      new Particle({
        type: "healing",
        x: this.x.add(v.scaleTo(this.radius)),
        v,
        maxCollision: 4
      }, this);
    }
  }
}

class IceBall extends Ball {
  get color() { return "#AEF1FF"; }
  get type() { return "ice"; }
  get name() { return "冰霜球"; }
  
  get cd() {
    return 5;
  }
  
  onSkill() {
    new Particle({
      type: "ice",
      x: this.x.add(this.v.scaleTo(this.radius)),
      v: this.v,
      maxCollision: 3
    }, this);
  }
}

class RamBall extends Ball {
  get color() { return "#fe9873"; }
  
  get type() { return "ram"; }
  get cd() { return 10; }
  get skillTime() { return 5; }
  get name() { return "冲撞球"; }
  
  onSkill() {
    let nearset = null;
    let min = Infinity;
    for (const ball of Ball.all) {
      if (ball === this) continue;
      const distance = ball.x.minus(this.x).length;
      if (distance < min) {
        nearset = ball;
        min = distance;
      }
    }
    if (!nearset) return;
    this.vDirection = nearset.x.minus(this.x).scaleTo(1);
  }
  
  get velocityMult() {
    return super.velocityMult * (this.isSkillActive ? 4 : 1);
  }
  
  onCollision(ball) {
    ball.receiveDamage(Math.floor(this.velocityMult * 3));
    if (this.isSkillActive) {
      ball.cdTimer -= 2;
      ball.applyEffect("stun", 0.5);
    }
    this.stopSkill();
  }
  
  onReflection() {
    this.stopSkill();
  }
}

class WDCBall extends Ball {
  get color() { return "#0355ff"; }
  get type() { return "wdc"; }
  get cd() { return 3; }
  get skillTime() { return 5; }
  get name() { return "WDC"; }
  
  gridDamages = new Array(9).fill(0);
  
  onSkill() {
    for (let i = 0; i < 9; i++) {
      const random = GlobalRNG.random();
      this.gridDamages[i] = Math.floor(random ** 3 * 30) + 5;
    }
  }
  
  onCollision(ball, pos) {
    if (!this.isSkillActive) return;
    const x = Math.floor(3 * pos.x / size);
    const y = Math.floor(3 * pos.y / size);
    ball.receiveDamage(this.gridDamages[3 * y + x]);
  }
}

class TrapBall extends Ball {
  get color() { return "#fe6958"; }
  get type() { return "trap"; }
  get cd() { return 4; }
  get skillTime() { return 0; }
  get name() { return "陷阱师"; }
  
  onSkill() {
    const balls = Ball.all.filter(x => x !== this);
    let pos = null;
    if (balls.length === 0) {
      pos = new Vector(GlobalRNG.random() * size, GlobalRNG.random() * size);
    } else {
      const idx = Math.floor(balls.length * GlobalRNG.random());
      const ball = balls[idx];
      pos = ball.x;
    }
    new AOE({
      center: pos,
      radius: inner * 0.15,
      lifeTime: 4.5,
      border: true,
      readyTime: 1.2
    }, this);
  }
}

class SpiderBall extends Ball {
  get color() { return "#cdcef0"; }
  get type() { return "spider"; }
  get name() { return "蜘蛛"; }
  
  waiting = null;
  webs = [];
  
  get fullLasers() {
    if (this.waiting === null) return this.webs;
    return [...this.webs, [this.waiting, this.x]];
  }
  
  onDead() {
    this.webs = [];
  }
  
  onReflection() {
    if (this.waiting === null) {
      this.waiting = this.x;
    } else {
      this.webs.push([this.waiting, this.x]);
      this.waiting = null;
    }
  }
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
  const collisions = Ball.collisionHistory.filter(x => x.balls.includes(ball) && Ball.time - x.time < ball.skillTimer);
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
  const nodes = [];
  for (const web of ball.fullLasers) {
    ctx.beginPath();
    ctx.moveTo(web[0].x, web[0].y);
    ctx.lineTo(web[1].x, web[1].y);
    ctx.stroke();
    ctx.closePath();
    nodes.push(...web);
  }
  ctx.fillStyle = "#999999";
  for (const node of nodes) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
  }
}

function handleAllCollisions() {
  const MAX_ITER = 8;
  for (let iter = 0; iter < MAX_ITER; iter++) {
    let anyCollision = false;
    
    // Ball vs Ball
    for (let i = 0; i < Ball.all.length; i++) {
      for (let j = i + 1; j < Ball.all.length; j++) {
        if (handleCollision(Ball.all[i], Ball.all[j], iter === 0)) {
          anyCollision = true;
        }
      }
    }
    
    if (!anyCollision) break;
  }
}

function handleCollision(a, b, first) {
  const r = a.x.minus(b.x);
  const dist = r.length;
  const minDist = a.radius + b.radius + 4;
  
  if (dist >= minDist || dist === 0) return false;
  const n = r.scaleTo(1);
  
  const dv = a.v.minus(b.v);
  const dvn = dv.dot(n);
  
  if (dvn < 0) {
    const massA = a.mass || 1;
    const massB = b.mass || 1;
    const totalMass = massA + massB;
    const impulse = (2 * dvn) / totalMass;
    
    a.vDirection = a.vDirection.minus(n.times(impulse * massB)).scaleTo(1);
    b.vDirection = b.vDirection.add(n.times(impulse * massA)).scaleTo(1);
  }
  
  const overlap = minDist - dist;
  const pushA = n.times(overlap * 0.5);
  const pushB = n.times(-overlap * 0.5);
  a.x = a.x.add(pushA);
  b.x = b.x.add(pushB);
  
  if (first) {
    const position = a.x.add(b.x).times(0.5);
    a.onCollision(b, position);
    b.onCollision(a, position);
    Ball.collisionHistory.push({
      time: Ball.time,
      position,
      balls: [a, b]
    });
  }
  
  return true;
}

function render() {
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, size, size);
  requestAnimationFrame(render);
  const diff = 0.03;
  const iter = 100;
  for (let i = 0; i < iter; i++) {
    Ball.tick(diff / iter);
    handleAllCollisions();
    Particle.tick(diff / iter);
    AOE.tick(diff / iter);
  }
  drawBackground();
  Particle.draw();
  AOE.draw();
  Ball.draw();
  drawBorder();
}

function init() {
  const ballTypes = [IceBall, HealingBall, WDCBall, RamBall, SpiderBall, TrapBall];
  let count = 0;
  do {
    const x = size * GlobalRNG.random();
    const y = size * GlobalRNG.random();
    const vx = GlobalRNG.random() - 0.5;
    const vy = GlobalRNG.random() - 0.5;
    const idx = Math.floor(ballTypes.length * GlobalRNG.random());
    let type = ballTypes[idx];
    ballTypes.splice(idx, 1);
    new type({
      x: new Vector(x, y),
      v: new Vector(vx, vy)
    });
    count++
  } while (GlobalRNG.random() < 1 / count && ballTypes.length > 0);
  const info = document.querySelector("#info");
  info.innerHTML = Ball.all.map(x => `<span style='color: ${x.color}'>${x.name}</span>`).join(" VS ") + `<br>种子：${GlobalRNG.initialSeed}`;
}

init();
render();
