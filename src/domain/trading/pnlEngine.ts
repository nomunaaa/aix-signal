/**
 * PnL Engine 모듈
 * 손익 계산 및 ROE 복원
 */

export interface FeeConfig {
  makerFee: number; // 메이커 수수료 (기본: 0.02%)
  takerFee: number; // 테이커 수수료 (기본: 0.04%)
  useTaker: boolean; // 테이커 수수료 사용 여부 (기본: true)
}

export const DEFAULT_FEE_CONFIG: FeeConfig = {
  makerFee: 0.0002, // 0.02%
  takerFee: 0.0004, // 0.04%
  useTaker: true,
};

/**
 * Binance ROE를 Gross ROE로 복원
 * 
 * Binance ROE는 수수료가 차감된 순수익률입니다.
 * 이를 원래 가격 변동률(Gross ROE)로 복원합니다.
 * 
 * Formula:
 * - Entry Fee = useTaker ? takerFee : makerFee
 * - Exit Fee = useTaker ? takerFee : makerFee
 * - Total Fee = (entryFee + exitFee) * leverage
 * - Gross ROE = (binanceRoe + totalFee) / leverage
 * 
 * @param binanceRoe Binance에서 제공하는 ROE (수수료 차감 후)
 * @param leverage 레버리지
 * @param feeConfig 수수료 설정
 * @returns Gross ROE (순수 가격 변동률)
 */
export function restoreGrossRoe(
  binanceRoe: number,
  leverage: number,
  feeConfig: FeeConfig = DEFAULT_FEE_CONFIG
): number {
  const fee = feeConfig.useTaker ? feeConfig.takerFee : feeConfig.makerFee;
  const totalFeeRate = (fee + fee) * leverage; // 진입 + 청산
  
  // Gross ROE 복원
  const grossRoe = (binanceRoe + totalFeeRate) / leverage;
  
  return grossRoe;
}

/**
 * PnL 계산 (실제 손익금)
 * 
 * @param binanceRoe Binance ROE
 * @param positionSize 포지션 크기 (달러)
 * @param leverage 레버리지
 * @param feeConfig 수수료 설정
 * @returns 손익금 (달러)
 */
export function calculatePnl(
  binanceRoe: number,
  positionSize: number,
  leverage: number,
  feeConfig: FeeConfig = DEFAULT_FEE_CONFIG
): number {
  // Gross ROE 복원
  const grossRoe = restoreGrossRoe(binanceRoe, leverage, feeConfig);
  
  // 실제 투입 자본 (레버리지 적용 전)
  const actualCapital = positionSize / leverage;
  
  // PnL = 투입 자본 × Gross ROE
  const pnl = actualCapital * grossRoe;
  
  return pnl;
}

/**
 * 진입가와 청산가로부터 ROE 계산
 * 
 * @param entryPrice 진입가
 * @param exitPrice 청산가
 * @param side LONG | SHORT
 * @param leverage 레버리지
 * @param feeConfig 수수료 설정
 * @returns ROE (%)
 */
export function calculateRoeFromPrices(
  entryPrice: number,
  exitPrice: number,
  side: 'LONG' | 'SHORT',
  leverage: number = 1,
  feeConfig: FeeConfig = DEFAULT_FEE_CONFIG
): number {
  // Gross ROE 계산
  let grossRoe: number;
  
  if (side === 'LONG') {
    grossRoe = (exitPrice - entryPrice) / entryPrice;
  } else {
    grossRoe = (entryPrice - exitPrice) / entryPrice;
  }
  
  // 레버리지 적용
  const leveragedRoe = grossRoe * leverage;
  
  // 수수료 차감
  const fee = feeConfig.useTaker ? feeConfig.takerFee : feeConfig.makerFee;
  const totalFeeRate = (fee + fee) * leverage;
  const netRoe = leveragedRoe - totalFeeRate;
  
  return netRoe;
}

/**
 * PnL 상세 분석 (Breakdown)
 * 
 * @param entryPrice 진입가
 * @param exitPrice 청산가 (또는 현재가)
 * @param side LONG | SHORT
 * @param positionSize 포지션 크기
 * @param leverage 레버리지
 * @param feeConfig 수수료 설정
 * @returns PnL 상세 정보
 */
export interface PnlBreakdown {
  grossRoe: number; // 순수 가격 변동률 (%)
  leverage: number;
  leveragedRoe: number; // 레버리지 적용 ROE (%)
  totalFees: number; // 총 수수료 (%)
  netRoe: number; // 최종 ROE (%)
  pnlAmount: number; // 실제 손익금 ($)
  positionSize: number;
  actualCapital: number; // 실제 투입 자본
}

export function calculatePnlBreakdown(
  entryPrice: number,
  exitPrice: number,
  side: 'LONG' | 'SHORT',
  positionSize: number,
  leverage: number,
  feeConfig: FeeConfig = DEFAULT_FEE_CONFIG
): PnlBreakdown {
  // Gross ROE
  const grossRoe = side === 'LONG'
    ? (exitPrice - entryPrice) / entryPrice
    : (entryPrice - exitPrice) / entryPrice;
  
  // 레버리지 적용
  const leveragedRoe = grossRoe * leverage;
  
  // 수수료
  const fee = feeConfig.useTaker ? feeConfig.takerFee : feeConfig.makerFee;
  const totalFees = (fee + fee) * leverage;
  
  // 최종 ROE
  const netRoe = leveragedRoe - totalFees;
  
  // 실제 투입 자본
  const actualCapital = positionSize / leverage;
  
  // 손익금
  const pnlAmount = actualCapital * netRoe;
  
  return {
    grossRoe: grossRoe * 100, // %
    leverage,
    leveragedRoe: leveragedRoe * 100, // %
    totalFees: totalFees * 100, // %
    netRoe: netRoe * 100, // %
    pnlAmount,
    positionSize,
    actualCapital,
  };
}

/**
 * 미실현 손익 계산 (현재가 기준)
 * 
 * 포지션이 아직 청산되지 않은 상태에서 현재 가격으로 손익을 계산합니다.
 * 
 * @param entryPrice 진입가
 * @param currentPrice 현재가
 * @param side LONG | SHORT
 * @param capital 투입 자본 (레버리지 적용 전)
 * @param leverage 레버리지
 * @param feeConfig 수수료 설정 (진입 수수료만 차감)
 * @returns 미실현 손익 정보
 */
export interface UnrealizedPnl {
  currentPrice: number;
  priceChange: number; // 가격 변동 ($)
  priceChangePercent: number; // 가격 변동률 (%)
  unrealizedRoe: number; // 미실현 ROE (%)
  unrealizedPnl: number; // 미실현 손익금 ($)
  entryFee: number; // 진입 수수료 ($)
  estimatedExitFee: number; // 예상 청산 수수료 ($)
}

export function calculateUnrealizedPnl(
  entryPrice: number,
  currentPrice: number,
  side: 'LONG' | 'SHORT',
  capital: number,
  leverage: number,
  feeConfig: FeeConfig = DEFAULT_FEE_CONFIG
): UnrealizedPnl {
  // 가격 변동
  const priceChange = side === 'LONG' 
    ? currentPrice - entryPrice 
    : entryPrice - currentPrice;
  const priceChangePercent = (priceChange / entryPrice) * 100;
  
  // Gross ROE
  const grossRoe = priceChange / entryPrice;
  
  // 레버리지 적용
  const leveragedRoe = grossRoe * leverage;
  
  // 수수료 (진입만 이미 발생, 청산은 예상)
  const fee = feeConfig.useTaker ? feeConfig.takerFee : feeConfig.makerFee;
  const entryFeeRate = fee * leverage;
  
  // 미실현 ROE (진입 수수료만 차감)
  const unrealizedRoe = (leveragedRoe - entryFeeRate) * 100; // %
  
  // 미실현 손익금
  const unrealizedPnl = capital * (unrealizedRoe / 100);
  
  // 포지션 크기
  const positionSize = capital * leverage;
  
  // 수수료 금액
  const entryFee = positionSize * fee;
  const estimatedExitFee = positionSize * fee;
  
  return {
    currentPrice,
    priceChange,
    priceChangePercent,
    unrealizedRoe,
    unrealizedPnl,
    entryFee,
    estimatedExitFee,
  };
}

/**
 * 간단한 손익 계산 (가장 자주 사용)
 * 
 * @param entryPrice 진입가
 * @param currentOrExitPrice 현재가 또는 청산가
 * @param side LONG | SHORT
 * @param capital 투입 자본
 * @param leverage 레버리지 (기본: 1x)
 * @returns { pnl: 손익금, roe: 손익률(%) }
 */
export function calculateSimplePnl(
  entryPrice: number,
  currentOrExitPrice: number,
  side: 'LONG' | 'SHORT',
  capital: number,
  leverage: number = 1
): { pnl: number; roe: number } {
  const breakdown = calculatePnlBreakdown(
    entryPrice,
    currentOrExitPrice,
    side,
    capital * leverage, // positionSize
    leverage
  );
  
  return {
    pnl: breakdown.pnlAmount,
    roe: breakdown.netRoe,
  };
}

