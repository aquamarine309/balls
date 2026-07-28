import { Movable } from "../movable.js";
import { inner, ctx } from "../layout.js";
import { AOE } from "../aoe.js";
import { Vector } from "../vector.js";
import { Timer } from "../timer.js";
import { getOption } from "../options.js";

const BALL_VELOCITY = 0.8 * inner;

export class Ball extends Movable {
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
    this.initialLife = this.life;
    this.radius = config.radius || inner * 0.05;
    this.cdTimer = 0;
    this.skillTimer = -1;
    Ball.all.push(this);
    this.lifeHistory = [];
    this.lastRecorded = this.life;
    this.effects = new Map();
    this.tag = config.tag || Math.random();
    this.partDamage = 0;
    this.passiveDamageTimer = 0;
    this.lifeTime = config.lifeTime || Infinity;
    this.lastCollision = 0;
  }
  
  get canCollide() {
    return this.time - this.lastCollision > 0.3;
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
    if (this.isInvincible) return "∞";
    return this.life;
  }
  
  get isInvincible() {
    return false;
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
    if (this.isInvincible) return;
    this.effects.set(effect, new Timer(
      this.time,
      duration
    ));
  }
  
  get damageReceivedPerSecond() {
    let damage = 0;
    for (const aoe of AOE.all) {
      if (!aoe.has(this.x) || aoe.ball === this) continue;
      if (!aoe.isReady) continue;
      switch (aoe.type) {
        case "ice":
          damage += 3;
          break;
        case "trap":
          damage += 2;
          break;
      }
    }
    for (const ball of Ball.all) {
      if (ball.type !== "spider" || ball === this) continue;
      for (const web of ball.webs) {
        const x1 = web.x;
        const y1 = web.y;
        const x2 = ball.x.x;
        const y2 = ball.x.y;
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
        if ((t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1)) {
          damage += 0.75;
        }
      }
    }
    return damage;
  }
  
  get mass() {
    return this.radius / (inner * 0.05);
  }
  
  receiveDamage(damage) {
    if (damage > 0 && this.isInvincible) return;
    this.life -= damage;
    this.recordLife();
  }
  
  handleAOERestrictions() {
    for (const aoe of AOE.all) {
      if (!aoe.isReady) continue;
      if (aoe.type === "trap") {
        const rel = this.x.minus(aoe.center);
        const dis = rel.length;
        const r1 = this.radius;
        const r2 = aoe.radius;
        if (dis <= r1 + r2 && dis >= r2 - r1) {
          const direction = rel.dot(this.vDirection) > 0;
          let inside;
          if (aoe.ball !== this || direction) {
            if (dis <= r2) {
              this.x = aoe.center.add(rel.scaleTo(r2 - r1 - 2));
              inside = true;
            } else {
              this.x = aoe.center.add(rel.scaleTo(r2 + r1 + 2));
              inside = false;
            }
          } else {
            continue;
          }
          const n = rel.scaleTo(1);
          if (direction === inside) {
            const vn = this.vDirection.dot(n);
            this.vDirection = this.vDirection.minus(n.times(2 * vn));
            if (this.vDirection.length > 0) this.vDirection = this.vDirection.scaleTo(1);
          }
          this.onReflection("trap");
          if (this !== aoe.ball) {
            this.receiveDamage(1);
            aoe.lifeTime -= 0.2;
          }
          Ball.collisionHistory.push({
            balls: [this],
            position: aoe.center.add(rel.scaleTo(r2)),
            time: Ball.time
          });
        }
      }
    }
  }
  
  draw() {
    super.draw();
    if (getOption("info") && isFinite(this.cd) && !this.isSkillActive) {
      const percents = 1 - (1 - this.cdTimer / this.cd) % 1;
      const lz = this.cdTimer < 0;
      ctx.strokeStyle = "#444444";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(this.x.x - this.radius, this.x.y - this.radius * 1.5);
      ctx.lineTo(this.x.x + this.radius, this.x.y - this.radius * 1.5);
      ctx.stroke();
      ctx.closePath();
      if (lz) {
        ctx.strokeStyle = "#ff7777";
      } else if (this.velocityMult < 1) {
        ctx.strokeStyle = "#77aadd";
      } else {
        ctx.strokeStyle = "#888888";
      }
      ctx.beginPath();
      ctx.moveTo(this.x.x - this.radius, this.x.y - this.radius * 1.5);
      ctx.lineTo(this.x.x + this.radius * (2 * percents - 1), this.x.y - this.radius * 1.5);
      ctx.stroke();
      ctx.closePath();
    }
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
  
  tick(diff, fixed) {
    if (this.time >= this.lifeTime) {
      this.life = 0;
    }
    if (this.isDead) return;
    super.tick(diff, fixed);
    this.passiveDamageTimer += diff;
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
    const dps = this.damageReceivedPerSecond;
    if (!this.isInvincible) {
      this.partDamage += dps * diff;
    }
    const floor = Math.floor(this.partDamage);
    if (floor > 0 && this.passiveDamageTimer > 1) {
      this.passiveDamageTimer = 0;
      this.receiveDamage(floor);
      this.partDamage -= floor;
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