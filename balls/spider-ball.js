import { Ball } from "./ball.js";

export class SpiderBall extends Ball {
  get color() { return "#cdcef0"; }
  get type() { return "spider"; }
  get name() { return "蜘蛛"; }

  waiting = null;
  webs = [];

  onDead() {
    this.webs = [];
  }

  onReflection(direction) {
    if (direction === "trap") return;
    this.webs.push(this.x);
    const threshold = 30;
    if (this.webs.length > threshold) {
      this.webs.shift();
    }
  }
}