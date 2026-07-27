import { border, size, ctx } from "./layout.js";

export class Movable {
  constructor(config) {
    this.x = config.x;
    this.radius = 0;
    this.config = config;
    this.time = 0;
    this.vDirection = config.v.scaleTo(1);
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

  tick(deltaTime, fixed = false) {
    this.time += deltaTime;
    if (!fixed) {
      this.x = this.x.add(this.v.times(deltaTime));
    }
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