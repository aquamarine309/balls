export class Vector {
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
  }
}