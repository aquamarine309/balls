export class Timer {
  constructor(time, duration) {
    this.time = time;
    this.duration = duration;
  }

  isActive(time) {
    return time - this.time <= this.duration;
  }
}