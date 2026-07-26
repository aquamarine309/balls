import { Movable } from "./movable.js";
import { AOE } from "./aoe.js";
import { Ball } from "./balls/ball.js";
import { inner, ctx } from "./layout.js";
import { GameImages } from "./main.js";

const PARTICLE_VELOCITY = inner;

export class Particle extends Movable {
  static all = [];
  static dead = [];
  static time = 0;
  
  static tick(diff) {
    Particle.time += diff;
    Particle.all.forEach(x => x.tick(diff));
    Particle.all = Particle.all.filter(x => !x.isDead);
    Particle.dead = Particle.dead.filter(x => Particle.time - x.time <= 0.5);
  }
  
  static draw() {
    Particle.all.forEach(x => x.draw());
  }
  
  constructor(config, ball) {
    super(config);
    this.lifeTime = config.lifeTime ?? Infinity;
    this.maxCollision = config.maxCollision ?? Infinity;
    this.radius = config.radius ?? inner * 0.01;
    this.type = config.type;
    this.ball = ball;
    Particle.all.push(this);
    this.history = [];
    this.historyTick = 0;
  }
  
  get color() {
    if (this.type === "magicball") {
      switch (this.config.effect) {
        case "fire":
          return "#ff6365";
        case "ice":
          return "#a0a3ef";
        case "health":
          return "#65ee44";
      }
    }
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
  
  trace(pos, diff, acc = 3) {
    const rel = pos.minus(this.x);
    this.vDirection = this.vDirection.scaleTo(1);
    this.vDirection = this.vDirection.add(rel.scaleTo(diff * acc)).scaleTo(1);
  }
  
  tick(diff) {
    if (this.isDead) return;
    if (this.type === "arrow" && this.config.target && !this.config.target.isDead) {
      this.trace(this.config.target.x, diff);
    }
    if (this.type === "magicball" && !this.ball.isDead) {
      if (this.time < 2) {
        const rel = this.ball.x.minus(this.x);
        const dis = rel.length;
        const v = this.v.length;
        this.vDirection = this.vDirection.scaleTo(v);
        const a = 0.8 * v * v / dis; // 稀释
        const r = this.ball.radius * 2;
        this.vDirection = this.vDirection
          .add(this.vDirection.rotate().scaleTo(a * diff))
          .add(rel.scaleTo((dis - r) * 0.05))
          .scaleTo(1);
      } else {
        const other = Ball.all.find(x => x !== this.ball);
        if (other) this.trace(other.x, diff, 10);
      }
    }
    super.tick(diff);
    this.historyTick++;
    if (this.historyTick >= 5) {
      this.history.push(this.x);
      if (this.history.length >= 60) this.history.shift();
      this.historyTick = 0;
    }
    this.checkBall();
    this.checkAOE();
    this.lifeTime -= diff;
    if (this.isDead) this.onDead();
  }
  
  checkAOE() {
    for (const aoe of AOE.all) {
      if (!aoe.isReady) continue;
      if (aoe.ball === this.ball) continue;
      if (aoe.type === "trap") {
        const rel = this.x.minus(aoe.center);
        const dis = rel.length;
        const r1 = this.radius;
        const r2 = aoe.radius;
        if (dis <= r1 + r2 && dis >= r2 - r1) {
          this.lifeTime = 0;
          aoe.lifeTime -= 0.2;
        }
      }
    }
  }
  
  checkBall() {
    for (const ball of Ball.all) {
      if (this.x.minus(ball.x).length < ball.radius) {
        const allowSelf = ["healing", "magicball"];
        if (!allowSelf.includes(this.type) && ball === this.ball) {
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
              ball.receiveDamage(-3);
            } else {
              ball.receiveDamage(3);
            }
            break;
          case "arrow":
            ball.receiveDamage(1);
            break;
          case "magicball":
            switch (this.config.effect) {
              case "fire":
                if (ball !== this.ball) {
                    ball.receiveDamage(3);
                }
                break;
              case "ice":
                if (ball !== this.ball) {
                    ball.applyEffect("ice", 2);
                }
                break;
              case "health":
                if (ball === this.ball) {
                  ball.receiveDamage(-1);
                }
            }
        }
        return;
      }
    }
  }
  
  onDead() {
    Particle.dead.push({
      position: this.x,
      color: this.color,
      time: Particle.time
    });
    switch (this.type) {
      case "ice": {
        const range = new AOE({
          center: this.x,
          radius: inner * 0.3,
          lifeTime: 3,
          border: true
        }, this.ball);
      }
    }
  }
  
  draw() {
    if (this.type !== "arrow") {
      super.draw();
      this.drawTrail();
      return;
    }
    const offset = 3.57;
    const angle = Math.atan2(this.v.y, this.v.x) + offset;
    ctx.save();
    ctx.translate(this.x.x, this.x.y);
    ctx.rotate(angle);
    const img = GameImages.arrow;
    const size = this.radius * 5;
    ctx.drawImage(img, -size, -size, 2 * size, 2 * size);
    ctx.restore();
  }
  
  drawTrail() {
    if (this.history.length < 2) return;

    const head = this.history[this.history.length - 1];
    const tail = this.history[0];

    const grad = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
    
    grad.addColorStop(0, 'rgb(0, 0, 0, 0)'); 
    grad.addColorStop(1, this.color); 

    ctx.strokeStyle = grad;
    ctx.lineWidth = this.radius / 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(this.history[0].x, this.history[0].y);
    for (let i = 1; i < this.history.length; i++) {
      ctx.lineTo(this.history[i].x, this.history[i].y);
    }
    ctx.stroke();
  }
}