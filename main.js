const border = 4;
const size = 300 + border * 2;
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
canvas.width = size;
canvas.height = size;

function drawBorder() {
  ctx.beginPath();
  ctx.lineWidth = 2 * border;
  ctx.strokeStyle = "white";
  ctx.rect(0, 0, size, size);
  ctx.stroke();
  ctx.closePath();
}

/**
 * @param {string} value
 * @param {number} index
 * @returns {String}
 */
function commaSection(value, index) {
  if (index === 0) {
    return value.slice(-3);
  }
  return value.slice(-3 * (index + 1), -3 * index);
}

/**
 * @param {string} value
 * @returns {String}
 */
function addCommas(value) {
  let string = "";
  const start = Math.ceil(value.length / 3);
  for (let i = start - 1; i >= 0; i--) {
    string += commaSection(value, i);
    if (i !== 0) string += ",";
  }
  return string;
}

/**
 * @param {String} value
 * @returns {String}
 */
function formatWithCommas(value) {
  const decimalPointSplit = value.split(".");
  decimalPointSplit[0] = decimalPointSplit[0].replace(/\w+$/gu, addCommas);
  return decimalPointSplit.join(".");
}


window.format = function format(value, places = 4, layerExp = 12) {
  const decimal = Decimal.fromValue_noAlloc(value);
  if (decimal.sign < 0) return `-${format(decimal.neg(), places, layerExp)}`;
  if (decimal.sign === 0) return (0).toFixed(Math.min(places, 100));

  const log10Result = decimal.log10();
  const exp = log10Result.floor();
  const expNum = exp.toNumber();

  if (places > 1 && exp.lt(-places)) {
    return formatSmallNumber(decimal, log10Result, places, layerExp);
  }

  if (exp.lt(layerExp)) {
    const fixed = expNum <= 0 ? places : Math.max(places - expNum, 0);
    return formatWithCommas(decimal.toFixed(Math.min(fixed, 100)));
  }

  if (decimal.layer >= 5) {
    const layer = decimal.layer;
    const formatMag = layer < 1e9 ? decimal.mag.toFixed(4) : "";
    const formatLayer = format(layer, 0, layerExp);
    return `${formatMag}F${formatLayer}`;
  }

  return formatLargeNumber(decimal, exp, layerExp);
};

function formatSmallNumber(decimal, log10Result, places, layerExp) {
  let expFloor = log10Result.floor();
  const pow10ExpFloor = Decimal.pow10(expFloor);
  const mantissa = decimal.div(pow10ExpFloor);

  const negExpFloor = expFloor.neg();
  const be = negExpFloor.clampMin(1).log10().gte(9);

  let formatMantissa = be ? "" : mantissa.toFixed(4);
  if (formatMantissa === "10.0000") {
    formatMantissa = "1.0000";
    expFloor = expFloor.add(1);
  }

  const formatExponent = format(expFloor, 0, layerExp);
  return `${formatMantissa}e${formatExponent}`;
}

function formatLargeNumber(decimal, exp, layerExp) {
  const pow10Exp = Decimal.pow10(exp);
  const mantissa = decimal.div(pow10Exp);

  const be = exp.gt(1e9);
  let formatMantissa = be ? "" : mantissa.toFixed(4);
  if (formatMantissa === "10.0000") {
    formatMantissa = "1.0000";
    // eslint-disable-next-line no-param-reassign
    exp = exp.add(1);
  }

  const formatExponent = format(exp, 0, layerExp);
  return `${formatMantissa}e${formatExponent}`;
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
}

const g = 100;

class Ball {
  constructor(config) {
    this.x = config.x;
    this.v = config.v;
    this.radius = 20;
    this.color = config.color;
    this.text = config.text ?? "";
    this.config = config;
    this.a = config.a ?? new Vector(0, g);
    this.value = config.value;
  }
  
  tick(diff) {
    this.v = this.v.add(this.a.times(diff));
    this.x = this.x.add(this.v.times(diff));
    if (this.x.x - this.radius < border) {
      this.x.x = (border + this.radius) * 2 - this.x.x;
      this.v.x = -this.v.x;
    }
    if (this.x.x + this.radius > size - border) {
      this.x.x = (size - border - this.radius) * 2 - this.x.x;
      this.v.x = -this.v.x;
    }
    if (this.x.y - this.radius < border) {
      this.x.y = (border + this.radius) * 2 - this.x.y;
      this.v.y = -this.v.y;
    }
    if (this.x.y + this.radius > size - border) {
      this.x.y = (size - border - this.radius) * 2 - this.x.y;
      this.v.y = -this.v.y;
    }
  }
  
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
    ctx.font = "20px monospace";
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5;
    ctx.strokeText(this.text, this.x.x, this.x.y);
    ctx.globalAlpha = 1;
    ctx.fillText(this.text, this.x.x, this.x.y);
  }
}

const b1 = new Ball({
  x: new Vector(50, 30),
  v: new Vector(60, 0),
  color: "pink",
  value: new Decimal("2"),
  text: "2"
});
const b2 = new Ball({
    x: new Vector(150, 200),
    v: new Vector(-60, -80),
    color: "aquamarine",
    text: "^1",
    value: new Decimal(1)
});
const b3 = new Ball({
  x: new Vector(100, 150),
  v: new Vector(10, 0),
  color: "#F7D366",
  text: "/2",
  value: new Decimal(2),
  a: new Vector(0, -g)
});


function handleMeet(a, b, callback) {
    const r = a.x.minus(b.x);
  if (r.length <= a.radius + b.radius) {
    const v1 = a.v;
    const v2 = b.v;
    const newV1 = v1.add(r.scaleTo(1).times(v2.minus(v1).dot(r.scaleTo(1))));
    const newV2 = v2.add(r.scaleTo(1).times(v1.minus(v2).dot(r.scaleTo(1))));
    const diff = (a.radius + b.radius) - r.length;
    a.v = newV1;
    b.v = newV2;
    a.x = a.x.minus(r.scaleTo(-diff));
    b.x = b.x.minus(r.scaleTo(diff));
    if (callback) {
      callback(a, b);
    }
  }
}

const f1 = (a, b) => {
    a.value = a.value.pow(b.value);
    b.value = b.value.add(1);
    a.text = format(a.value, 0);
    b.text = "^" + format(b.value, 0);
};

const f2 = (a, b) => {
  a.value = a.value.div(b.value).clampMin(2);
  b.value = b.value.pow(b.value.log10().add(1).log10().add(1));
  a.text = format(a.value, 0);
  b.text = "/" + format(b.value, 0);
};

function specialHandle() {
  const d = b2.x.minus(b3.x);
  const k = d.scaleTo(10 * (d.length - 100));
  b3.a = k.add(new Vector(0, -g));
  b2.a = k.neg().add(new Vector(0, g));
  ctx.beginPath();
  ctx.strokeStyle = "white";
  ctx.moveTo(b2.x.x, b2.x.y);
  ctx.lineTo(b3.x.x, b3.x.y);
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.closePath();
}

function getSystemT() {
  return 0.5 * (b1.v.sqr() + b2.v.sqr() + b3.v.sqr());
}

function getSystemU() {
  return 5 * (b2.x.minus(b3.x).length - 100) ** 2 + g * (3 * size - 3 * border - b1.x.y - b2.x.y - b3.x.y);
}

class TrackStore {
  tracks = [];
  max = 50;
  step = 1;
  _shift = 0;
  push(v) {
    if (this._shift++ % this.step !== 0) return;
    this.tracks.push([v.x, v.y]);
    if (this.tracks.length > this.max) {
      this.tracks.shift();
    }
  }
  
  draw(color = "white") {
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(this.tracks[0][0], this.tracks[0][1]);
    for (let i = 1; i < this.tracks.length; i++) {
      ctx.lineTo(this.tracks[i][0], this.tracks[i][1]);
    }
    ctx.stroke();
    ctx.closePath();
    ctx.globalAlpha = 1;
  }
}

const b1Track = new TrackStore();
const b2Track = new TrackStore();
const b3Track = new TrackStore();
const mTrack = new TrackStore();

function render() {
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, size, size);
  requestAnimationFrame(render);
  drawBorder();
  const diff = 0.05;
  b1.tick(diff);
  b2.tick(diff);
  b3.tick(diff);
  b1Track.push(b1.x);
  b2Track.push(b2.x);
  b3Track.push(b3.x);
  mTrack.push(b2.x.add(b3.x).times(0.5));
  b1Track.draw(b1.color);
  b2Track.draw(b2.color);
  b3Track.draw(b3.color);
  mTrack.draw("#d0d0d0");
  handleMeet(b1, b2, f1);
  handleMeet(b1, b3, f2);
  specialHandle();
  b1.draw();
  b2.draw();
  b3.draw();
}

render();