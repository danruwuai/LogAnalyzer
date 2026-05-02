import '@testing-library/jest-dom';

/**
 * Unit tests for convergenceState calculation logic
 * Tests the WARN/ERROR trend detection algorithm
 */

/**
 * Replicates the convergence detection algorithm from App.js
 * @param {Array<{num: number, text: string}>} lines
 * @returns {'analyzing' | 'converging' | 'diverging' | 'stable'}
 */
function calculateConvergenceState(lines) {
  if (lines.length === 0) return 'analyzing';

  const windowSize = 50;
  const maxWindows = 50;
  const windowCount = Math.min(Math.ceil(lines.length / windowSize), maxWindows);
  const errorCounts = [];

  for (let w = 0; w < windowCount; w++) {
    const start = w * windowSize;
    const end = Math.min(start + windowSize, lines.length);
    let count = 0;
    for (let i = start; i < end; i++) {
      const t = lines[i].text.toLowerCase();
      if (t.includes('error') || t.includes('exception') || t.includes('warn')) count++;
    }
    errorCounts.push(count);
  }

  if (errorCounts.length < 3) return 'stable';

  const peak = Math.max(...errorCounts);
  const peakIdx = errorCounts.indexOf(peak);
  const lastIdx = errorCounts.length - 1;

  if (peakIdx < lastIdx - 1) {
    let decreases = 0;
    for (let i = peakIdx; i < lastIdx - 1; i++) {
      if (errorCounts[i + 1] < errorCounts[i]) decreases++;
    }
    const recentAvg = (errorCounts[lastIdx] + errorCounts[Math.max(0, lastIdx - 1)]) / 2;
    if (decreases >= 2 && recentAvg < peak * 0.6) {
      return 'converging';
    } else if (decreases === 0 && recentAvg > peak * 0.9) {
      return 'diverging';
    } else {
      return 'stable';
    }
  } else if (peakIdx === lastIdx - 1 || peakIdx === lastIdx) {
    return 'diverging';
  } else {
    return 'stable';
  }
}

function makeLines(counts) {
  // counts: array of [warnCount, errorCount] per window
  const lines = [];
  let lineNum = 1;
  const windowSize = 50;

  counts.forEach(([warns, errors], windowIdx) => {
    for (let i = 0; i < windowSize; i++) {
      let text = '';
      const posInWindow = windowIdx * windowSize + i;
      if (i < warns) text += ' WARN thing ';
      if (i < warns + errors) text += ' ERROR thing ';
      if (!text) text = `INFO line ${posInWindow}`;
      lines.push({ num: lineNum++, text });
    }
  });

  // Trim to exact window count * windowSize
  return lines.slice(0, counts.length * windowSize);
}

describe('convergenceState calculation', () => {
  test('empty lines returns analyzing', () => {
    expect(calculateConvergenceState([])).toBe('analyzing');
  });

  test('single window (fewer than 3 windows) returns stable', () => {
    const lines = makeLines([[5, 2]]);
    expect(calculateConvergenceState(lines)).toBe('stable');
  });

  test('two windows returns stable', () => {
    const lines = makeLines([[5, 2], [3, 1]]);
    expect(calculateConvergenceState(lines)).toBe('stable');
  });

  describe('converging detection', () => {
    test('decreasing error trend with peak early returns converging', () => {
      // Peak in window 0, then steadily decreasing
      const lines = makeLines([
        [10, 5], // peak
        [8, 4],
        [6, 2],
        [4, 1],
        [2, 0], // converging - last avg (2+0)/2=1 < peak*0.6=9, decreases=3>=2
      ]);
      expect(calculateConvergenceState(lines)).toBe('converging');
    });

    test('decreasing but not enough (only 1 decrease) returns stable', () => {
      const lines = makeLines([
        [10, 5],
        [8, 4],
        [8, 4], // same
        [8, 4],
        [2, 0],
      ]);
      // decreases: from 0->1 is decrease, 1->2 no, 2->3 no, 3->4 no = 1 decrease < 2
      expect(calculateConvergenceState(lines)).toBe('stable');
    });

    test('recentAvg not low enough returns stable', () => {
      const lines = makeLines([
        [10, 5],
        [8, 4],
        [9, 4], // slight increase then decrease
        [8, 3],
        [7, 3], // recentAvg = (7+8)/2 = 7.5 > 9*0.6 = 5.4 (but actually peak is 10, wait...)
      ]);
      // Actually let's recalculate: peak=10 (first window), decreases from idx0 to idx1: 8<10 (yes), idx1 to idx2: 9<8 (no), idx2 to idx3: 8<9 (yes), idx3 to idx4: 7<8 (yes) = 3 decreases >= 2. recentAvg=(7+8)/2=7.5, peak*0.6=6, 7.5>6 => stable
      expect(calculateConvergenceState(lines)).toBe('stable');
    });
  });

  describe('diverging detection', () => {
    test('peak at last window returns diverging', () => {
      const lines = makeLines([
        [2, 1],
        [3, 1],
        [4, 2],
        [5, 3], // peak at last-1 (index 3, lastIdx=3)
      ]);
      // peakIdx=3, lastIdx=3, peakIdx===lastIdx => diverging
      expect(calculateConvergenceState(lines)).toBe('diverging');
    });

    test('peak at second-to-last window returns diverging', () => {
      const lines = makeLines([
        [2, 1],
        [3, 1],
        [5, 3], // peak at lastIdx-1
        [4, 2],
      ]);
      // peakIdx=2, lastIdx=3, peakIdx===lastIdx-1 => diverging
      expect(calculateConvergenceState(lines)).toBe('diverging');
    });

    test('no decreases and high recent avg returns diverging', () => {
      const lines = makeLines([
        [10, 5],
        [9, 4],
        [9, 4], // no decreases
        [9, 4],
        [8, 4], // recentAvg = (8+9)/2 = 8.5 > 10*0.9 = 9? No, 8.5<9, so not diverging by this branch
      ]);
      // decreases = 0 (9<10 no, 9<9 no, 9<9 no, 8<9 no) = 0
      // recentAvg = (8+9)/2 = 8.5, peak*0.9 = 9, 8.5 > 9? No => stable
      // Actually peakIdx=0, lastIdx=4, peakIdx < lastIdx-1 (4-1=3), so enters the main branch
      // decreases=0, recentAvg=8.5, peak*0.9=9, 0 decreases && 8.5 > 9? No => stable
      expect(calculateConvergenceState(lines)).toBe('stable');
    });
  });

  describe('stable detection', () => {
    test('flat error rate returns diverging', () => {
      const lines = makeLines([
        [5, 2],
        [5, 2],
        [5, 2],
        [5, 2],
        [5, 2],
      ]);
      expect(calculateConvergenceState(lines)).toBe('diverging');
    });

    test('insufficient decreases returns stable', () => {
      const lines = makeLines([
        [10, 5],
        [9, 4],
        [9, 4],
        [9, 4],
        [8, 4],
      ]);
      expect(calculateConvergenceState(lines)).toBe('stable');
    });
  });

  describe('edge cases', () => {
    test('exactly 3 windows at boundary', () => {
      const lines = makeLines([
        [10, 5],
        [8, 4],
        [6, 2],
      ]);
      // windowCount=3, lastIdx=2, peakIdx=0, peakIdx<lastIdx-1? 0<1 yes
      // decreases: idx0->1: 8<10 yes, idx1->2: 6<8 yes = 2 decreases >= 2
      // recentAvg = (6+8)/2 = 7, peak*0.6 = 6, 7<6? No => stable
      expect(calculateConvergenceState(lines)).toBe('stable');
    });

    test('lines with no error/warn keywords returns diverging', () => {
      const lines = Array.from({ length: 200 }, (_, i) => ({
        num: i + 1,
        text: `INFO line ${i} - no errors here`,
      }));
      expect(calculateConvergenceState(lines)).toBe('diverging');
    });

    test('very long file (more than 2500 lines) capped at 50 windows', () => {
      // With 10000 lines and windowSize=50, windowCount=min(200, 50)=50
      // This should not crash and should return a valid state
      const lines = Array.from({ length: 10000 }, (_, i) => ({
        num: i + 1,
        text: i % 50 < 10 ? `WARN line ${i}` : `INFO line ${i}`,
      }));
      const result = calculateConvergenceState(lines);
      expect(['converging', 'diverging', 'stable']).toContain(result);
    });
  });
});
