import { supabase } from '@/integrations/supabase/client';

export interface SharedSimulationInput {
  capital: number;
  capitalRatio: number;
  leverage: number;
}

export const SIMULATION_STORAGE_KEY = 'aixsignal-simulation-input';

export const SIMULATION_LIMITS = {
  capital: { min: 1_000, max: 100_000, step: 1_000 },
  capitalRatio: { min: 1, max: 100, step: 1 },
  leverage: { min: 1, max: 50, step: 1 },
} as const;

export const DEFAULT_SHARED_SIMULATION_INPUT: SharedSimulationInput = {
  capital: 100_000,
  capitalRatio: 5,
  leverage: 5,
};

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numeric)));
}

export function normalizeSharedSimulationInput(
  value?: Partial<SharedSimulationInput> | null,
  fallback: SharedSimulationInput = DEFAULT_SHARED_SIMULATION_INPUT
): SharedSimulationInput {
  return {
    capital: clampNumber(
      value?.capital,
      SIMULATION_LIMITS.capital.min,
      SIMULATION_LIMITS.capital.max,
      fallback.capital
    ),
    capitalRatio: clampNumber(
      value?.capitalRatio,
      SIMULATION_LIMITS.capitalRatio.min,
      SIMULATION_LIMITS.capitalRatio.max,
      fallback.capitalRatio
    ),
    leverage: clampNumber(
      value?.leverage,
      SIMULATION_LIMITS.leverage.min,
      SIMULATION_LIMITS.leverage.max,
      fallback.leverage
    ),
  };
}

export function readSharedSimulationInput(
  fallback: SharedSimulationInput = DEFAULT_SHARED_SIMULATION_INPUT
): SharedSimulationInput {
  if (typeof window === 'undefined') return normalizeSharedSimulationInput(null, fallback);

  try {
    const raw = window.localStorage.getItem(SIMULATION_STORAGE_KEY);
    if (!raw) return normalizeSharedSimulationInput(null, fallback);
    return normalizeSharedSimulationInput(
      JSON.parse(raw) as Partial<SharedSimulationInput>,
      fallback
    );
  } catch {
    return normalizeSharedSimulationInput(null, fallback);
  }
}

const SIMULATION_INPUT_EVENT = 'aixsignal-simulation-input-change';

export function writeSharedSimulationInput(
  input: Partial<SharedSimulationInput>
): SharedSimulationInput {
  const normalized = normalizeSharedSimulationInput({
    ...readSharedSimulationInput(),
    ...input,
  });
  if (typeof window === 'undefined') return normalized;

  try {
    window.localStorage.setItem(SIMULATION_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    /* ignore unavailable storage */
  }

  // storage 이벤트는 다른 탭에서만 발생하므로, 같은 탭 안에서 여러 컴포넌트가
  // 동시에 이 값을 구독할 때(예: 차트 페이지의 시뮬레이터 설정 팝오버 + 모의매매 패널)도
  // 즉시 반영되도록 커스텀 이벤트를 함께 쏜다.
  window.dispatchEvent(new CustomEvent(SIMULATION_INPUT_EVENT, { detail: normalized }));

  if (currentSyncUserId) {
    schedulePushAccountSimulationSettings(currentSyncUserId, normalized);
  }

  return normalized;
}

export function subscribeSharedSimulationInput(
  listener: (input: SharedSimulationInput) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== SIMULATION_STORAGE_KEY) return;
    listener(readSharedSimulationInput());
  };
  const handleCustomEvent = (event: Event) => {
    const detail = (event as CustomEvent<SharedSimulationInput>).detail;
    listener(detail ?? readSharedSimulationInput());
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener(SIMULATION_INPUT_EVENT, handleCustomEvent);
  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(SIMULATION_INPUT_EVENT, handleCustomEvent);
  };
}

// ---- 계정 단위 동기화 ----
// 시드머니/진입비율/레버리지는 원래 브라우저별 localStorage에만 저장돼, 같은
// 계정이라도 기기(브라우저)마다 값이 달라 보였다. AuthContext가 로그인/세션
// 복원 시 setSimulationSyncUserId를 호출해 이 모듈에 현재 사용자를 알려주면,
// 이후의 모든 writeSharedSimulationInput 호출이 user_simulation_settings에도
// (디바운스로) 업서트되어 계정 전체에서 값이 동기화된다.
let currentSyncUserId: string | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
const PUSH_DEBOUNCE_MS = 600;

function schedulePushAccountSimulationSettings(userId: string, input: SharedSimulationInput): void {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void (supabase as any)
      .from('user_simulation_settings')
      .upsert(
        {
          user_id: userId,
          capital: input.capital,
          capital_ratio: input.capitalRatio,
          leverage: input.leverage,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .then(({ error }: { error: unknown }) => {
        if (error) console.warn('[simulationStorage] Failed to sync settings to account:', error);
      });
  }, PUSH_DEBOUNCE_MS);
}

/** AuthContext가 로그인/로그아웃/세션 복원 시 호출한다. */
export function setSimulationSyncUserId(userId: string | null): void {
  const wasLoggedOut = currentSyncUserId === null;
  currentSyncUserId = userId;
  if (userId && wasLoggedOut) {
    void pullAccountSimulationSettings(userId);
  }
}

async function pullAccountSimulationSettings(userId: string): Promise<void> {
  try {
    const { data, error } = await (supabase as any)
      .from('user_simulation_settings')
      .select('capital, capital_ratio, leverage')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[simulationStorage] Failed to load account settings:', error);
      return;
    }

    if (data) {
      writeSharedSimulationInput({
        capital: data.capital,
        capitalRatio: data.capital_ratio,
        leverage: data.leverage,
      });
    } else {
      // 계정에 아직 저장된 값이 없으면(첫 로그인) 현재 로컬 값을 계정의 기준값으로 올린다.
      schedulePushAccountSimulationSettings(userId, readSharedSimulationInput());
    }
  } catch (err) {
    console.warn('[simulationStorage] Failed to load account settings:', err);
  }
}
