/**
 * Simulation Profile 모듈
 * 시뮬레이션 프로필 관리 (Zustand + localStorage)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_SIMULATION_CONSTANTS, FEE_CONSTANTS } from './constants';

export interface SimulationProfile {
  baseCapital: number; // 기본 자본 (기본: $10,000)
  entryFraction: number; // 진입 비율 (기본: 0.04 = 4%)
  defaultLeverage: number; // 기본 레버리지 (기본: 10)
  maxLeverage: number; // 최대 레버리지 (기본: 125)
  minLeverage: number; // 최소 레버리지 (기본: 1)
  stopLossPercent: number; // 손절 퍼센트 (기본: 2%)
  takeProfitPercent: number; // 목표 수익률 (기본: 5%)
  useTakerFee: boolean; // 테이커 수수료 사용 (기본: true)
}

export const DEFAULT_SIMULATION_PROFILE: SimulationProfile = {
  baseCapital: DEFAULT_SIMULATION_CONSTANTS.BASE_CAPITAL,
  entryFraction: DEFAULT_SIMULATION_CONSTANTS.ENTRY_FRACTION,
  defaultLeverage: DEFAULT_SIMULATION_CONSTANTS.DEFAULT_LEVERAGE,
  maxLeverage: DEFAULT_SIMULATION_CONSTANTS.MAX_LEVERAGE,
  minLeverage: DEFAULT_SIMULATION_CONSTANTS.MIN_LEVERAGE,
  stopLossPercent: DEFAULT_SIMULATION_CONSTANTS.STOP_LOSS_PERCENT,
  takeProfitPercent: DEFAULT_SIMULATION_CONSTANTS.TAKE_PROFIT_PERCENT,
  useTakerFee: FEE_CONSTANTS.DEFAULT_USE_TAKER,
};

interface SimulationProfileStore {
  profile: SimulationProfile;
  updateProfile: (updates: Partial<SimulationProfile>) => void;
  resetProfile: () => void;
}

/**
 * Simulation Profile Zustand Store
 * localStorage에 자동 저장
 */
export const useSimulationProfile = create<SimulationProfileStore>()(
  persist(
    (set) => ({
      profile: DEFAULT_SIMULATION_PROFILE,
      
      updateProfile: (updates) =>
        set((state) => ({
          profile: { ...state.profile, ...updates },
        })),
      
      resetProfile: () =>
        set({ profile: DEFAULT_SIMULATION_PROFILE }),
    }),
    {
      name: 'simulation-profile', // localStorage 키
    }
  )
);

/**
 * 포지션 크기 계산 (프로필 기반)
 */
export function getPositionSize(profile: SimulationProfile): number {
  return profile.baseCapital * profile.entryFraction * profile.defaultLeverage;
}

/**
 * 프로필 검증
 */
export function validateProfile(profile: Partial<SimulationProfile>): string[] {
  const errors: string[] = [];
  
  if (profile.baseCapital !== undefined && profile.baseCapital <= 0) {
    errors.push('자본은 0보다 커야 합니다');
  }
  
  if (profile.entryFraction !== undefined && (profile.entryFraction <= 0 || profile.entryFraction > 1)) {
    errors.push('진입 비율은 0-100% 사이여야 합니다');
  }
  
  if (profile.defaultLeverage !== undefined && profile.minLeverage !== undefined && profile.maxLeverage !== undefined) {
    if (profile.defaultLeverage < profile.minLeverage || profile.defaultLeverage > profile.maxLeverage) {
      errors.push('기본 레버리지는 최소~최대 범위 내여야 합니다');
    }
  }
  
  return errors;
}

