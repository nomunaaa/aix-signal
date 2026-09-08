/**
 * 즐겨찾기 종목을 목록 맨 위로 올리는 공용 정렬 — 종목 선택 드롭다운들이
 * 모두 같은 순서를 쓰도록 한 곳에 둔다.
 *
 * Array.prototype.sort는 stable하므로 비교 함수가 0을 반환하면 원래 순서가
 * 유지된다 — 즉 즐겨찾기 그룹과 비즐겨찾기 그룹 각각의 내부 순서는 그대로다.
 */
export function sortFavoritesFirst(
  symbols: readonly string[],
  favorites: ReadonlySet<string>
): string[] {
  return [...symbols].sort((a, b) => {
    const aFavorite = favorites.has(a) ? 0 : 1;
    const bFavorite = favorites.has(b) ? 0 : 1;
    return aFavorite - bFavorite;
  });
}
