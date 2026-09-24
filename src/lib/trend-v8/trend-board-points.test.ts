import {
  calculateTrendBoardPoint,
  signalOpenCount,
  signalPoint,
  trendBaseScore,
  type TrendBoardStreamPointInput,
} from './trend-board-points';

const view = (
  shortTrend: TrendBoardStreamPointInput['shortTrend'],
  longTrend: TrendBoardStreamPointInput['longTrend'],
  signal: TrendBoardStreamPointInput['signal'] = 'none'
): TrendBoardStreamPointInput => ({ shortTrend, longTrend, signal });

describe('trend board scoring', () => {
  it('scores 4 per open cycle, so a Beat signal on the same 1m bar adds 4', () => {
    // Beat는 Pulse와 같은 1분봉이라 barinterval로는 구분되지 않는다. 1분봉에서
    // 사이클이 하나 더 열리면 그만큼만 더해지면 된다.
    expect(signalPoint(1, 0)).toBe(4);
    expect(signalPoint(2, 0)).toBe(8);
    expect(signalOpenCount(2, 0)).toBe(2);
  });

  it('keeps the existing both-intervals bonus', () => {
    // 1분봉 1개 + 10분봉 1개 = 4 + 4 + 6, 예전 동작 그대로.
    expect(signalPoint(1, 1)).toBe(14);
    // Beat가 더해져도 보너스는 한 번만 붙는다.
    expect(signalPoint(2, 1)).toBe(18);
  });

  it('gives nothing when nothing is open, and ignores negatives', () => {
    expect(signalPoint(0, 0)).toBe(0);
    expect(signalOpenCount(0, 0)).toBe(0);
    expect(signalPoint(-1, 0)).toBe(0);
  });

  it('matches the trend point from the reference sheet', () => {
    // pulse -/up = 3, wave down/up = 6 → 9 (시트의 12는 beat 3점을 포함한 값)
    expect(trendBaseScore('none', 'up')).toBe(3);
    expect(trendBaseScore('down', 'up')).toBe(6);
  });

  it('falls back to signal presence when cycle counts are not supplied', () => {
    const withCounts = calculateTrendBoardPoint({
      pulse: view('none', 'up', 'long'),
      wave: view('down', 'up'),
      pulseOpenCycles: 1,
      waveOpenCycles: 0,
    });
    const withoutCounts = calculateTrendBoardPoint({
      pulse: view('none', 'up', 'long'),
      wave: view('down', 'up'),
    });
    expect(withCounts).toBe(withoutCounts);
  });

  it('adds exactly 4 to the total when a second 1m cycle opens', () => {
    const base = { pulse: view('none', 'up', 'long'), wave: view('down', 'up') };
    const one = calculateTrendBoardPoint({ ...base, pulseOpenCycles: 1, waveOpenCycles: 0 });
    const two = calculateTrendBoardPoint({ ...base, pulseOpenCycles: 2, waveOpenCycles: 0 });
    expect(two - one).toBe(4);
  });
});
