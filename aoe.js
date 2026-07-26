import { inner, ctx } from "./layout.js";
import { clamp } from "./utils.js";

export class AOE {
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
    ctx.globalAlpha = 0.2;
    const x = clamp(this.center.x, inner * 0.15, inner * 0.85);
    const y = clamp(this.center.y, inner * 0.15, inner * 0.85);
    ctx.font = `bold ${this.radius * 0.2}px monospace`;
    ctx.fillText(`${this.lifeTime.toFixed(1)}s`, x, y);
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