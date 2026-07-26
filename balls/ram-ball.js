import { Ball } from "./ball.js";

export class RamBall extends Ball {
  get color() { return "#fe9873"; }

  get type() { return "ram"; }
  get cd() { return 10; }
  get skillTime() { return 5; }
  get name() { return "冲撞球"; }
  get isInvincible() { return this.isSkillActive; }

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