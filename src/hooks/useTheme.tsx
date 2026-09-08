import { useSyncExternalStore } from "react";
import { saveAndApplyTheme, subscribeThemeChange, getStoredTheme, type Theme } from "@/utils/theme";

/**
 * 컴포넌트별 로컬 state가 아니라 공유 store(subscribeThemeChange)를 구독한다.
 * 그래야 어느 한 곳(예: Header의 토글 버튼)에서 테마를 바꿔도 Sidebar/AppMobileChrome
 * 등 다른 useTheme() 인스턴스의 로고·아이콘이 같은 틱에 함께 갱신된다.
 */
export const useTheme = () => {
  const theme = useSyncExternalStore(
    subscribeThemeChange,
    getStoredTheme,
    () => "dark" as Theme
  );

  const toggleTheme = () => {
    const newTheme: Theme = theme === "light" ? "dark" : "light";
    saveAndApplyTheme(newTheme);
  };

  return { theme, toggleTheme };
};
