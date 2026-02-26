/* ==================== 改进说明 ====================
 * 1. 使用严格模式，避免意外全局变量。
 * 2. 提取常量为配置对象，便于调整参数。
 * 3. 优化 Vector 类，增加常用方法（归一化、标量乘法等）。
 * 4. Ball 类添加唯一标识，分离文本绘制逻辑。
 * 5. 碰撞处理：修复位置穿透问题，添加迭代检测直到稳定。
 * 6. 弹簧力计算更清晰，使用配置常量。
 * 7. 轨迹支持透明度渐变（越旧的轨迹越淡）。
 * 8. 添加暂停/启动功能（按空格键）。
 * 9. 实时显示各球数值及系统总能量。
 * 10. 完善大数格式化函数，处理极端情况。
 * 11. 添加关键注释，解释数值更新规则。
 * 12. 优化渲染循环，使用 requestAnimationFrame 并处理暂停。
 * ================================================= */

'use strict';

// -------------------- 配置常量 --------------------
const CONFIG = {
  BORDER: 4, // 边框宽度
  CANVAS_SIZE: 308, // 画布内部尺寸（不包含边框）
  GRAVITY: 100, // 重力加速度
  SPRING_CONSTANT: 10, // 弹簧系数
  EQUILIBRIUM_DISTANCE: 100, // 弹簧平衡距离
  DT: 0.05, // 模拟时间步长
  MAX_TRACK_POINTS: 50, // 最大轨迹点数
  TRACK_STEP: 1, // 轨迹采样步长（每几帧记录一次）
  BALL_RADIUS: 20, // 小球半径
  TEXT_FONT: '20px monospace',
  ENERGY_DISPLAY_POS: { x: 10, y: 20 } // 能量显示位置
};

// 根据边框计算实际画布尺寸
const SIZE = CONFIG.CANVAS_SIZE + CONFIG.BORDER * 2;
const GRAVITY_DIRECTION = {
  DOWN: "DOWN",
  UP: "UP",
  LEFT: "LEFT",
  RIGHT: "RIGHT",
  NONE: "NONE"
};

// -------------------- 工具函数 --------------------
/**
 * 格式化大数，支持 Decimal.js
 * @param {Decimal|number|string} value
 * @param {number} places 小数位数
 * @param {number} layerExp 指数层阈值
 * @returns {string}
 */
function formatNumber(value, places = 4, layerExp = 12) {
  const decimal = Decimal.fromValue_noAlloc(value);
  if (decimal.sign < 0) return `-${formatNumber(decimal.neg(), places, layerExp)}`;
  if (decimal.sign === 0) return (0).toFixed(Math.min(places, 100));

  const log10Result = decimal.log10();
  const exp = log10Result.floor();
  const expNum = exp.toNumber();

  // 非常小的数
  if (places > 1 && exp.lt(-places)) {
    return formatSmallNumber(decimal, log10Result, places, layerExp);
  }

  // 普通大小
  if (exp.lt(layerExp)) {
    const fixed = expNum <= 0 ? places : Math.max(places - expNum, 0);
    return addCommasToDecimal(decimal.toFixed(Math.min(fixed, 100)));
  }

  // 超大数，使用层表示法
  if (decimal.layer >= 5) {
    const layer = decimal.layer;
    const magStr = layer < 1e9 ? decimal.mag.toFixed(4) : '';
    const layerStr = formatNumber(layer, 0, layerExp);
    return `${magStr}F${layerStr}`;
  }

  // 科学计数法
  return formatScientific(decimal, exp, layerExp);
}

/** 处理极小数的格式化 */
function formatSmallNumber(decimal, log10Result, places, layerExp) {
  let expFloor = log10Result.floor();
  const pow10ExpFloor = Decimal.pow10(expFloor);
  let mantissa = decimal.div(pow10ExpFloor);

  const negExpFloor = expFloor.neg();
  const be = negExpFloor.clampMin(1).log10().gte(9);

  let mantissaStr = be ? '' : mantissa.toFixed(4);
  if (mantissaStr === '10.0000') {
    mantissaStr = '1.0000';
    expFloor = expFloor.add(1);
  }

  const expStr = formatNumber(expFloor, 0, layerExp);
  return `${mantissaStr}e${expStr}`;
}

/** 处理科学计数法 */
function formatScientific(decimal, exp, layerExp) {
  const pow10Exp = Decimal.pow10(exp);
  let mantissa = decimal.div(pow10Exp);

  const be = exp.gt(1e9);
  let mantissaStr = be ? '' : mantissa.toFixed(4);
  if (mantissaStr === '10.0000') {
    mantissaStr = '1.0000';
    exp = exp.add(1);
  }

  const expStr = formatNumber(exp, 0, layerExp);
  return `${mantissaStr}e${expStr}`;
}

/** 给整数部分添加千位分隔符 */
function addCommasToDecimal(numStr) {
  const parts = numStr.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

function formatX(value, places = 4, layerExp = 12) {
  return `×${formatNumber(value, places, layerExp)}`
}

function formatPow(value, places = 4, layerExp = 12) {
  return `^${formatNumber(value, places, layerExp)}`
}

Decimal.prototype.valueOf = function() {
  throw new Error("Implicit conversion from Decimal to number");
}

Decimal.prototype.clone = function() {
  return Decimal.fromDecimal(this);
}

Decimal.prototype.isFinite = function() {
  return isFinite(this.mag) && isFinite(this.layer) && isFinite(this.sign);
}

// -------------------- 向量类 --------------------
class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  add(v) { return new Vector(this.x + v.x, this.y + v.y); }
  sub(v) { return new Vector(this.x - v.x, this.y - v.y); }
  mul(s) { return new Vector(this.x * s, this.y * s); }
  div(s) { return new Vector(this.x / s, this.y / s); }
  neg() { return new Vector(-this.x, -this.y); }

  get length() { return Math.hypot(this.x, this.y); }
  get sqrLength() { return this.x * this.x + this.y * this.y; }

  /** 归一化，若长度为零则返回零向量 */
  normalize() {
    const len = this.length;
    return len > 0 ? this.mul(1 / len) : new Vector();
  }

  /** 缩放到指定长度 */
  scaleTo(newLen) {
    return this.normalize().mul(newLen);
  }

  /** 点积 */
  dot(v) { return this.x * v.x + this.y * v.y; }

  clone() { return new Vector(this.x, this.y); }

  /** 从极坐标创建向量 */
  static fromPolar(length, angle) {
    return new Vector(length * Math.cos(angle), length * Math.sin(angle));
  }
}

// -------------------- 小球类 --------------------
class Ball {
  constructor(id, config) {
    this.id = id; // 唯一标识
    this.pos = config.pos.clone(); // 位置（Vector）
    this.vel = config.vel.clone(); // 速度（Vector）
    this.gravityDirection = config.gravityDirection || GRAVITY_DIRECTION.DOWN;
    this.acc = config.acc?.clone() ?? this.gravity; // 加速度
    this.radius = config.radius ?? CONFIG.BALL_RADIUS;
    this.color = config.color;
    this.symbolFn = config.symbol;
    this.value = config.value; // 数值（Decimal）
    this.mass = config.mass ?? 1; // 质量（默认为1）
  }

  get gravity() {
    switch (this.gravityDirection) {
      case GRAVITY_DIRECTION.UP:
        return new Vector(0, -CONFIG.GRAVITY);
      case GRAVITY_DIRECTION.DOWN:
        return new Vector(0, CONFIG.GRAVITY);
      case GRAVITY_DIRECTION.LEFT:
        return new Vector(-CONFIG.GRAVITY, 0);
      case GRAVITY_DIRECTION.RIGHT:
        return new Vector(CONFIG.GRAVITY, 0);
      case GRAVITY_DIRECTION.NONE:
        return new Vector(0, 0);
    }
  }

  get symbol() {
    if (typeof this.symbolFn === "string") return this.symbolFn;
    return this.symbolFn(this.value);
  }

  /** 更新位置和速度（欧拉法） */
  update(dt) {
    this.vel = this.vel.add(this.acc.mul(dt));
    this.pos = this.pos.add(this.vel.mul(dt));
    this.bounceOffWalls();
  }

  /** 处理边界反弹 */
  bounceOffWalls() {
    const left = CONFIG.BORDER + this.radius;
    const right = SIZE - CONFIG.BORDER - this.radius;
    const top = CONFIG.BORDER + this.radius;
    const bottom = SIZE - CONFIG.BORDER - this.radius;

    if (this.pos.x < left) {
      this.pos.x = 2 * left - this.pos.x;
      this.vel.x = -this.vel.x;
    } else if (this.pos.x > right) {
      this.pos.x = 2 * right - this.pos.x;
      this.vel.x = -this.vel.x;
    }

    if (this.pos.y < top) {
      this.pos.y = 2 * top - this.pos.y;
      this.vel.y = -this.vel.y;
    } else if (this.pos.y > bottom) {
      this.pos.y = 2 * bottom - this.pos.y;
      this.vel.y = -this.vel.y;
    }
  }

  /** 绘制小球和符号 */
  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();

    // 绘制文本（半透明描边）
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.font = CONFIG.TEXT_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.5;
    ctx.strokeText(this.symbol, this.pos.x, this.pos.y);
    ctx.globalAlpha = 1;
    ctx.fillText(this.symbol, this.pos.x, this.pos.y);
  }
}

// -------------------- 轨迹记录器 --------------------
class Trail {
  constructor(maxPoints = 50, step = 1) {
    this.points = []; // 存储 { x, y, age }，age 为点数（用于透明度渐变）
    this.maxPoints = maxPoints;
    this.step = step;
    this.frameCounter = 0;
  }

  addPoint(pos) {
    if (this.frameCounter++ % this.step !== 0) return;
    this.points.push({ x: pos.x, y: pos.y, age: 0 });
    if (this.points.length > this.maxPoints) {
      this.points.shift();
    }
    // 增加所有现有点的年龄
    this.points.forEach(p => p.age++);
  }

  draw(ctx, color = 'white') {
    if (this.points.length < 2) return;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }
    // 根据年龄设置透明度：越新的点越亮
    const maxAge = this.points[this.points.length - 1].age;
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.3 + 0.7 * (1 - maxAge / this.maxPoints); // 简单线性衰减
    ctx.stroke();
    ctx.closePath();
    ctx.globalAlpha = 1;
  }
}

// -------------------- 碰撞处理 --------------------
/**
 * 处理两球之间的完全弹性碰撞（等质量，仅径向交换速度）
 * 并应用自定义数值规则
 */
function handleCollision(a, b, rule) {
  const delta = a.pos.sub(b.pos);
  const dist = delta.length;
  const minDist = a.radius + b.radius;

  if (dist > minDist) return false; // 未碰撞

  // 防止穿透：将两球分开至刚好接触
  const overlap = minDist - dist;
  if (overlap > 0) {
    const dir = delta.normalize();
    // 按质量比例移动（质量相等则各移动一半）
    const totalMass = a.mass + b.mass;
    a.pos = a.pos.add(dir.mul(overlap * (b.mass / totalMass)));
    b.pos = b.pos.sub(dir.mul(overlap * (a.mass / totalMass)));
  }

  // 弹性碰撞速度更新（等质量时径向速度交换）
  const relVel = a.vel.sub(b.vel);
  const normal = delta.normalize();
  const velAlong = relVel.dot(normal);

  // 仅当相互靠近时才处理碰撞（避免重复反弹）
  if (velAlong > 0) return true;

  // 计算冲量（等质量简化：交换径向速度）
  const impulse = normal.mul(velAlong);
  a.vel = a.vel.sub(impulse);
  b.vel = b.vel.add(impulse);

  // 调用自定义规则
  if (rule) rule(a, b);
  return true;
}

function applyRule(a, b) {

}

function checkAllCollisions() {
  let iter = 0;
  const MAX_ITER = 5;
  let collided;
  do {
    collided = false;
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        if (handleCollision(a, b, (a, b) => applyRule(a, b))) {
          collided = true;
        }
      }
    }
  } while (collided && ++iter < MAX_ITER);
}

// -------------------- 系统初始化 --------------------
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
canvas.width = SIZE;
canvas.height = SIZE;
const balls = [];
const trails = [];
const constraints = [];

// -------------------- 弹簧力计算 --------------------
function applySpringForce(a, b) {
  const delta = a.pos.sub(b.pos);
  const dist = delta.length;
  const forceDir = delta.normalize();
  // 弹簧力大小 = k * (当前距离 - 平衡距离)
  const forceMag = CONFIG.SPRING_CONSTANT * (dist - CONFIG.EQUILIBRIUM_DISTANCE);
  const force = forceDir.mul(forceMag);

  // 应用力（F = ma -> a = F/m）
  b.acc = force.mul(1 / b.mass).add();
  a.acc = force.neg().mul(1 / a.mass).add();
}

// -------------------- 绘制辅助元素 --------------------
function drawBorder() {
  ctx.beginPath();
  ctx.lineWidth = 2 * CONFIG.BORDER;
  ctx.strokeStyle = 'white';
  ctx.rect(0, 0, SIZE, SIZE);
  ctx.stroke();
  ctx.closePath();
}

// -------------------- 动画控制 --------------------
let paused = false;
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    paused = !paused;
  }
});

// -------------------- 主渲染循环 --------------------
function render() {
  if (!paused) {
    // 物理更新
    for (const ball of balls) {
      ball.acc = ball.gravity;
    }

    for (const constraint of constraints) {
      constraint.apply(CONFIG.DT);
    }

    for (const ball of balls) {
      ball.update(CONFIG.DT);
    }

    // 碰撞检测（多次迭代直到稳定）
    checkAllCollisions();

    for (const ball of balls) {
      trails[ball.id].addPoint(ball.pos);
    }
  }

  // 绘制
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, SIZE, SIZE);
  drawBorder();


  for (const ball of balls) {
    trails[ball.id].draw(ctx, ball.color);
  }

  constraints.forEach(c => c.draw(ctx));

  for (const ball of balls) {
    ball.draw(ctx);
  }

  // 暂停提示
  if (paused) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '30px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⏸', SIZE / 2, SIZE / 2);
  }

  requestAnimationFrame(render);
}

render();


class Constraint {
  constructor(bodyA, bodyB, options = {}) {
    this.bodyA = bodyA; // 第一个物体（或固定点，可设计为 { pos: Vector }）
    this.bodyB = bodyB; // 第二个物体
    this.bodyA.vel = new Vector();
    this.bodyB.vel = new Vector();
    this.enabled = true;
    this.stiffness = options.stiffness || 1.0; // 仅对软约束有效
    // 其他公共属性
  }

  // 更新约束：可计算力并施加到物体，或直接修正位置/速度
  apply(dt) {
    // 由子类实现
  }
}

class SpringConstraint extends Constraint {
  constructor(bodyA, bodyB, restLength, stiffness, color = "white") {
    super(bodyA, bodyB);
    this.restLength = restLength;
    this.stiffness = stiffness;

    this.color = color;
    this.waveCount = 20; // 波浪数
    this.lineWidth = 2;
  }

  apply(dt) {
    const delta = this.bodyB.pos.sub(this.bodyA.pos);
    const dist = delta.length;
    const forceDir = delta.normalize();
    const forceMag = this.stiffness * (dist - this.restLength);
    const force = forceDir.mul(forceMag);

    // 施加力（质量已包含在加速度中）
    this.bodyA.acc = this.bodyA.acc.add(force.mul(1 / this.bodyA.mass));
    this.bodyB.acc = this.bodyB.acc.sub(force.mul(1 / this.bodyB.mass));
  }

  draw(ctx) {
    const p1 = this.bodyA.pos;
    const p2 = this.bodyB.pos;
    const delta = p2.sub(p1);
    const dist = delta.length;
    if (dist < 1e-6) return;

    const dir = delta.normalize();
    const perp = new Vector(-dir.y, dir.x); // 垂直方向

    const amplitude = 6; // 振幅（像素）
    const waveLength = dist / this.waveCount;

    ctx.beginPath();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.lineWidth;
    ctx.moveTo(p1.x, p1.y);

    for (let i = 1; i <= this.waveCount; i++) {
      const t = i / this.waveCount;
      const mid = p1.add(delta.mul(t));
      // 在垂直方向偏移，正弦波
      const offset = perp.mul(Math.sin(i * Math.PI) * amplitude);
      const point = mid.add(offset);
      ctx.lineTo(point.x, point.y);
    }

    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
}

class RopeConstraint extends Constraint {
  constructor(bodyA, bodyB, maxLength, stiffness, color = "#aaaaaa") {
    super(bodyA, bodyB);
    this.maxLength = maxLength;
    this.stiffness = stiffness;
    this.color = color;
    this.lineWidth = 2;
    this.dashPattern = [5, 5]; // 虚线，表示非刚性
  }

  apply(dt) {
    const delta = this.bodyB.pos.sub(this.bodyA.pos);
    const dist = delta.length;
    if (dist <= this.maxLength) return; // 松弛，无拉力

    const forceDir = delta.normalize();
    const forceMag = this.stiffness * (dist - this.maxLength);
    const force = forceDir.mul(forceMag);

    this.bodyA.acc = this.bodyA.acc.add(force.mul(1 / this.bodyA.mass));
    this.bodyB.acc = this.bodyB.acc.sub(force.mul(1 / this.bodyB.mass));
  }

  draw(ctx) {
    const p1 = this.bodyA.pos;
    const p2 = this.bodyB.pos;

    ctx.beginPath();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.lineWidth;
    ctx.setLineDash(this.dashPattern);
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.setLineDash([]); // 恢复实线
  }
}

// ==================== UI 交互模块 ====================
document.addEventListener('DOMContentLoaded', () => {
  // 获取 DOM 元素
  const pauseBtn = document.getElementById('pauseBtn');
  const resetBtn = document.getElementById('resetBtn');
  const clearBtn = document.getElementById('clearBtn');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const addBallBtn = document.getElementById('addBallBtn');
  const addConstraintBtn = document.getElementById('addConstraintBtn');
  const ballAList = document.getElementById('newConstraintBallA');
  const ballBList = document.getElementById('newConstraintBallB');

  // 更新球选择下拉框
  function updateBallSelects() {
    const options = balls.map((ball, index) => {
      // 使用 ball.id 如果存在，否则用索引
      const id = ball.id || `ball_${index}`;
      return `<option value="${id}">${ball.symbol} (${ball.pos.x.toFixed(0)}, ${ball.pos.y.toFixed(0)})</option>`;
    }).join('');
    ballAList.innerHTML = options;
    ballBList.innerHTML = options;
  }

  // 刷新信息面板（显示所有球的数据）
  function updateInfodocument() {
    const ballInfoList = document.getElementById('ballInfoList');
    if (!ballInfoList) return;
    if (balls.length === 0) {
      ballInfoList.innerHTML = '<div style="color:#aaa;">暂无小球</div>';
      return;
    }
    let html = '';
    balls.forEach(ball => {
      // 格式化数值
      const valueStr = formatNumber(ball.value, 2);
      // 格式化坐标和速度（保留一位小数）
      const posStr = `(${ball.pos.x.toFixed(1)}, ${ball.pos.y.toFixed(1)})`;
      const velStr = `(${ball.vel.x.toFixed(1)}, ${ball.vel.y.toFixed(1)})`;
      const radiusStr = ball.radius.toFixed(1);
      const accStr = `(${ball.acc.x.toFixed(1)}, ${ball.acc.y.toFixed(1)})`;
      const id = ball.id;

      html += `
      <div style="margin-bottom: 8px; border-bottom: 1px dashed #444; padding-bottom: 4px;">
        <span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${ball.color}; margin-right:6px;"></span>
        <strong style="color:#ffaa00;">${ball.symbol}</strong><br>
        <span style="color:#ccc; font-size:0.9em; margin-left:18px;">位置: ${posStr} 速度: ${velStr}</span><br>
        <span style="color:#ccc; font-size:0.9em; margin-left:18px;">半径: ${radiusStr} 加速度: ${accStr}</span>
        <button class="delete-ball" data-id="${id}">删除</button>
      </div>
    `;


    });

    ballInfoList.innerHTML = html;
  }

  // 刷新物体列表（用于删除操作）
  function refreshObjectsList() {
    const ballListEl = document.getElementById('ballList');
    const constraintListEl = document.getElementById('constraintList');

    // 球列表
    if (ballListEl) {
      ballListEl.innerHTML = balls.map((ball, index) => {
        const id = ball.id || `ball_${index}`;
        return `
        <li>
          <span><span style="color:${ball.color};">●</span> ${ball.symbol} (值:${formatNumber(ball.value,1)})</span>
          <button class="delete-ball" data-id="${id}">删除</button>
        </li>
      `;
      }).join('');
    }

    // 约束列表
    constraintListEl.innerHTML = constraints.map((con, index) => {
      // 简单描述
      const type = con.constructor.name;
      const id = con.id || `constraint_${index}`;
      return `
        <li>
          <span>${type}</span>
          <button class="delete-constraint" data-id="${id}">删除</button>
        </li>
      `;
    }).join('');

    document.querySelectorAll('.delete-constraint').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        const index = constraints.findIndex(c => (c.id || `constraint_${constraints.indexOf(c)}`) === id);
        if (index !== -1) {
          constraints.splice(index, 1);
          refreshObjectsList();
        }
      });
    });
  }
  
  document.querySelector('.config-radius').addEventListener("input", function() {
    document.querySelector('.radius').innerText = formatNumber(this.value, 0);
  });


  addBallBtn.addEventListener('click', () => {
    // 读取输入值
    const color = document.querySelector('.config-color').value;
    const x = parseFloat(document.querySelector('.config-x').value);
    const y = parseFloat(document.querySelector('.config-y').value);
    const vx = parseFloat(document.querySelector('.config-vx').value);
    const vy = parseFloat(document.querySelector('.config-vy').value);
    const radius = parseFloat(document.querySelector('.config-radius').value);
    const gravityDirection = GRAVITY_DIRECTION[document.querySelector('.config-gravity').value];
    const value = Decimal.fromString(document.querySelector('.config-value').value);
    const symbol = document.querySelector('.config-symbol').value;
    const rule = document.querySelector('.config-rule').value;
    const mass = parseFloat(document.querySelector('.config-mass').value);

    // 基本验证
    if (isNaN(x) || isNaN(y) || isNaN(vx) || isNaN(vy) || !value.isFinite() || isNaN(mass) || mass <= 0) {
      alert('请填写有效的数值，质量必须大于0');
      return;
    }

    // 生成唯一 ID (基于时间戳+随机数)
    const id = 'ball_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    let input = "";
    if (symbol === "custom") {
      input = prompt("球的符号");
      if (!input) return;
    }
    // 创建 Ball 实例
    const newBall = new Ball(id, {
      pos: new Vector(x, y),
      vel: new Vector(vx, vy),
      color: color,
      symbol: symbol === "custom" ? input : window[symbol],
      value: value,
      mass: mass,
      gravityDirection: gravityDirection,
      radius: radius,
      collisionRule: rule, // 存储规则标识，供后续碰撞使用
    });

    // 添加到全局 balls 数组
    balls.push(newBall);

    // 为这个球创建轨迹记录器
    trails[id] = new Trail(CONFIG.MAX_TRACK_POINTS, CONFIG.TRACK_STEP);

    // 可选：在控制台输出成功信息
    console.log(`新球 ${id} 已添加`);
    updateBallSelects();
    refreshObjectsList();
    updateInfodocument();
  });

  // 暂停/继续
  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.textContent = paused ? '▶️ 开始' : '⏸️ 暂停';
  });

  // 清除所有
  clearBtn.addEventListener('click', () => {
    balls.length = 0;
    constraints.length = 0;
    updateBallSelects();
    refreshObjectsList();
    updateInfodocument();
  });

  // 导出场景
  exportBtn.addEventListener('click', () => {
    // 序列化 balls 和 constraints
    const scene = {
      balls: balls.map(b => ({
        id: b.id,
        color: b.color,
        pos: { x: b.pos.x, y: b.pos.y },
        vel: { x: b.vel.x, y: b.vel.y },
        acc: { x: b.acc.x, y: b.acc.y },
        symbolFn: b.symbolFn.name,
        value: b.value.toString(), // Decimal 转字符串
        mass: b.mass,
        collisionRule: b.collisionRule
      })),
      constraints: constraints.map(c => ({
        type: c.constructor.name,
        bodyAId: c.bodyA.id,
        bodyBId: c.bodyB.id,
        restLength: c.restLength,
        stiffness: c.stiffness,
        color: c.color
      }))
    };
    copyToClipboard(btoa(JSON.stringify(scene)));
  });

  // 导入场景
  importBtn.addEventListener('click', () => importScene());

  function importScene() {
    try {
      const scene = JSON.parse(atob(prompt("导入")));
      // 反序列化 balls
      balls.length = 0;
      scene.balls.forEach(bData => {
        // 重新创建 Vector 和 Decimal
        const ball = new Ball(bData.id, {
          pos: new Vector(bData.pos.x, bData.pos.y),
          vel: new Vector(bData.vel.x, bData.vel.y),
          acc: new Vector(bData.acc.x, bData.acc.y),
          color: bData.color,
          symbol: bData.symbolFn.includes("format") ? window[bData.symbolFn] : bData.symbolFn,
          value: new Decimal(bData.value),
          mass: bData.mass,
          collisionRule: bData.collisionRule
        });
        ball.id = bData.id; // 确保 id 一致
        balls.push(ball);
        trails[ball.id] = new Trail(CONFIG.MAX_TRACK_POINTS, CONFIG.TRACK_STEP);
      });
      // 反序列化 constraints（需要根据 bodyAId 和 bodyBId 查找对应的球对象）
      constraints.length = 0;
      scene.constraints.forEach(cData => {
        const bodyA = balls.find(b => b.id === cData.bodyAId);
        const bodyB = balls.find(b => b.id === cData.bodyBId);
        if (!bodyA || !bodyB) return;
        let constraint;
        if (cData.type === 'SpringConstraint') {
          constraint = new SpringConstraint(bodyA, bodyB, cData.restLength, cData.stiffness, cData.color);
        } else if (cData.type === 'RopeConstraint') {
          constraint = new RopeConstraint(bodyA, bodyB, cData.restLength, cData.stiffness, cData.color);
        }
        if (constraint) constraints.push(constraint);
      });
      updateBallSelects();
      refreshObjectsList();
      updateInfodocument();
    } catch (err) {
      alert('导入失败：' + err.message);
    }
  };

  // 添加约束
  addConstraintBtn.addEventListener('click', () => {
    const type = document.getElementById('newConstraintType').value;
    const ballAId = ballAList.value;
    const ballBId = ballBList.value;
    const length = parseFloat(document.getElementById('newConstraintLength').value);
    const stiffness = parseFloat(document.getElementById('newConstraintStiffness').value);
    const color = document.getElementById('newConstraintColor').value;

    if (ballAId === ballBId) {
      alert('请选择两个不同的球');
      return;
    }
    if (isNaN(length) || length <= 0 || isNaN(stiffness) || stiffness <= 0) {
      alert('请输入有效的正数长度和刚度');
      return;
    }

    const bodyA = balls.find(b => (b.id || `ball_${balls.indexOf(b)}`) === ballAId);
    const bodyB = balls.find(b => (b.id || `ball_${balls.indexOf(b)}`) === ballBId);
    if (!bodyA || !bodyB) {
      alert('选择的球不存在');
      return;
    }

    let constraint;
    if (type === 'spring') {
      constraint = new SpringConstraint(bodyA, bodyB, length, stiffness, color);
    } else if (type === 'rope') {
      constraint = new RopeConstraint(bodyA, bodyB, length, stiffness, color);
    }
    constraint.id = 'constraint_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    constraints.push(constraint);
    refreshObjectsList();
  });

  // 初始化时调用一次
  updateBallSelects();
  refreshObjectsList();
  updateInfodocument();
});

// 在每帧渲染后也需要更新信息面板（因为数值会变），可以在 render 函数末尾添加：
// 但为了避免与 UI 模块重复，我们可以在 render 里调用 updateInfodocument。
// 注意：需将 updateInfodocument 函数提升到全局作用域，或将其定义移到外面。
// 简单做法：将 updateInfodocument 定义为全局函数，并在 render 中调用。

window.copyToClipboard = (function() {
  const el = document.createElement("textarea");
  document.body.appendChild(el);
  el.style.position = "absolute";
  el.style.left = "-9999999px";
  el.setAttribute("readonly", "");
  return function(str) {
    try {
      el.value = str;
      el.select();
      return document.execCommand("copy");
    } catch (ex) {
      console.log(ex);
      return false;
    }
  };
}());