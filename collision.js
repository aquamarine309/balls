import { Ball } from "./balls/ball.js";

export function handleAllCollisions() {
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