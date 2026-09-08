/**
 * 모의매매 도움말 — 고정 원금·비중·레버리지·손익 계산식 설명 (접기/펼치기).
 */
import { ChevronDown, CircleHelp } from 'lucide-react';

export function MockTradeHelp() {
  return (
    <details className="group overflow-hidden rounded-xl border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3.5 py-3 text-[13px] font-bold text-foreground [&::-webkit-details-marker]:hidden">
        <CircleHelp className="h-[15px] w-[15px] text-muted-foreground" aria-hidden />
        모의매매 도움말
        <ChevronDown
          className="ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>

      <div className="border-t border-border px-3.5 pb-3.5">
        <p className="my-3 text-xs leading-relaxed text-foreground">
          원금은 항상 <b className="font-bold">$100,000로 고정</b>됩니다. 손실이 나도, 수익이 나도 다음
          진입 기준 원금은 그대로 10만불입니다. (복리로 불어나거나 줄지 않음)
        </p>

        <ul className="mb-3 flex list-none flex-col gap-2.5">
          {[
            { t: '진입 비중(%)', d: '원금 중 이번 포지션에 넣을 비율 · 증거금 = 원금 × 비중%' },
            { t: '레버리지(배수)', d: '몇 배로 진입할지 · 명목 규모 = 증거금 × 레버리지' },
            { t: '수익금', d: '명목 규모 × 가격변동률 (롱/숏 방향 반영)' },
            { t: '수익률(ROE)', d: '가격변동률 × 레버리지' },
          ].map((row) => (
            <li key={row.t} className="relative pl-3 text-xs leading-snug text-foreground">
              <span className="absolute left-0 top-[7px] h-[5px] w-[5px] rounded-full bg-border" />
              <b className="font-bold">{row.t}</b>
              <br />
              <span className="text-[11.5px] text-muted-foreground">{row.d}</span>
            </li>
          ))}
        </ul>

        <div className="mb-2.5 rounded-lg bg-muted/40 px-3 py-2.5 text-[11.5px] leading-relaxed text-muted-foreground">
          예) 비중 20% · 3x → 증거금 <b className="text-foreground">$20,000</b>, 명목{' '}
          <b className="text-foreground">$60,000</b>
          <br />
          가격 +2% 시 →{' '}
          <span className="font-bold text-[hsl(var(--pnl-up))]">+$1,200 (ROE +6%)</span>
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          항상 같은 원금 기준이라 시그널의 실제 성과를 공정하게 비교할 수 있습니다.
        </p>
      </div>
    </details>
  );
}
