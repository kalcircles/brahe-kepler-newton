class HintEngine {
  constructor() {
    this.state = new Map(); 
    // stores progress per problemId
  }

  initProblem(problemId, totalHints) {
    if (!this.state.has(problemId)) {
      this.state.set(problemId, {
        index: 0,
        total: totalHints
      });
    }
  }

  showNextHint(problemId, hintElements) {
    const state = this.state.get(problemId);
    if (!state) return;

    if (state.index < state.total) {
      hintElements[state.index].style.display = "block";
      state.index++;
    }
  }

  showAll(problemId, hintElements) {
    hintElements.forEach(h => h.style.display = "block");
    const state = this.state.get(problemId);
    if (state) state.index = state.total;
  }

  reset(problemId, hintElements) {
    hintElements.forEach(h => h.style.display = "none");
    this.state.set(problemId, {
      index: 0,
      total: hintElements.length
    });
  }
}

// global instance
const hintEngine = new HintEngine();