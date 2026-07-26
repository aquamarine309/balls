export const GlobalRNG = {
  initialSeed: Math.floor(Date.now() * Math.random()) + 1,
  seed: 0,
  
  xorShift32(state) {
    /* eslint-disable no-param-reassign */
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    /* eslint-enable no-param-reassign */
    return state;
  },
  
  random() {
    if (this.seed === 0) {
      this.seed = this.initialSeed;
    }
    const state = this.xorShift32(this.seed);
    this.seed = state;
    return state / Math.pow(2, 32) + 0.5;
  }
}