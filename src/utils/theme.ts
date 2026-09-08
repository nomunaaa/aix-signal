/**
 * 테마 초기화 유틸리티
 * FOUC(Flash of Unstyled Content) 방지 및 테마 상태 동기화
 */

export type Theme = "light" | "dark";

type ThemeListener = () => void;

/**
 * useTheme() 인스턴스가 여러 컴포넌트(Header/Sidebar/AppMobileChrome 등)에
 * 흩어져 있어도 하나의 토글로 전부 동기화되도록 하는 공유 구독 목록.
 * 이게 없으면 버튼을 누른 컴포넌트만 리렌더되고, 다른 곳의 로고/아이콘은
 * DOM class는 바뀌었는데 자기 state는 그대로라 테마와 어긋나 보인다.
 */
const listeners = new Set<ThemeListener>();

export function subscribeThemeChange(listener: ThemeListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyThemeChange(): void {
  listeners.forEach((listener) => listener());
}

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    return (localStorage.getItem("theme") as Theme | null) || "dark";
  } catch {
    return "dark";
  }
}

/**
 * localStorage에서 테마를 가져와 DOM에 즉시 적용
 * main.tsx와 useTheme.tsx에서 공통으로 사용
 */
export function initThemeFromStorage(): Theme {
  if (typeof window === "undefined") {
    return "dark";
  }
  try {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    const initialTheme = savedTheme || "dark";

    applyThemeToDOM(initialTheme);

    return initialTheme;
  } catch {
    return "dark";
  }
}

/**
 * 테마를 DOM에 적용
 * data-theme 속성과 dark 클래스를 동기화
 * View Transitions API를 사용하여 부드러운 전환 효과 적용
 */
export function applyThemeToDOM(theme: Theme): void {
  if (typeof document === "undefined") return;

  // View Transitions API 지원 확인
  if ('startViewTransition' in document) {
    try {
      const transition = (document as Document & {
        startViewTransition?: (callback: () => void) => { finished?: Promise<unknown> };
      }).startViewTransition?.(() => {
        updateThemeDOM(theme);
      });
      transition?.finished?.catch(() => {
        /* AbortError 등 전환 취소는 무시 */
      });
      return;
    } catch {
      // AbortError 등으로 전환이 스킵돼도 테마 적용 자체는 계속한다.
    }
  } else {
    updateThemeDOM(theme);
    return;
  }

  // 폴백: View Transition 실패 시에도 DOM 테마는 동기화
  updateThemeDOM(theme);
}

/**
 * 실제 DOM 업데이트 로직
 * startViewTransition의 update callback은 비동기(큐잉된 task)로 실행되므로,
 * React 쪽 알림(notifyThemeChange)도 여기서 같이 쏴야 로고/아이콘이 실제
 * 배경색 전환과 같은 시점에 바뀐다. saveAndApplyTheme에서 미리 알리면
 * 로고가 배경보다 먼저 바뀌어버려 토글 순간 어긋나 보인다("깨져 보임").
 */
function updateThemeDOM(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);

  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }

  notifyThemeChange();
}

/**
 * 테마를 localStorage에 저장하고 DOM에 적용
 */
export function saveAndApplyTheme(theme: Theme): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("theme", theme);
  } catch {
    /* ignore */
  }
  applyThemeToDOM(theme);
}
