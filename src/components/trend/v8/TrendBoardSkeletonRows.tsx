const SKELETON_ROW_COUNT = 8;
const CELL_COUNT = 11;

/** Trend Board 로딩 중 표시되는 스켈레톤 — 실제 11컬럼 테이블 레이아웃과 맞춘다. */
export function TrendBoardSkeletonRows() {
  return (
    <>
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, rowIndex) => (
        <tr key={rowIndex} className="animate-pulse">
          {Array.from({ length: CELL_COUNT }, (_, cellIndex) => (
            <td key={cellIndex}>
              <div className="h-4 w-full rounded bg-muted" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
