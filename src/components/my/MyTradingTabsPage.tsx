'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { MyHistoryPanel } from '@/components/my/MyHistoryPanel';
import { MyPositionsPanel } from '@/components/my/MyPositionsPanel';
import { MyProfitsPanel } from '@/components/my/MyProfitsPanel';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBilingualText } from '@/hooks/useBilingualText';
import { fetchPositions } from '@/lib/my/fetch-positions';

type MyTab = 'profits' | 'positions' | 'history';

const TAB_VALUES = new Set<MyTab>(['profits', 'positions', 'history']);

function parseTab(value: string | null, fallback: MyTab): MyTab {
  return value && TAB_VALUES.has(value as MyTab) ? (value as MyTab) : fallback;
}

export function MyTradingTabsPage() {
  const { tr } = useBilingualText();
  const pathname = usePathname() || '/my';
  const searchParams = useSearchParams();
  const rawTabParam = searchParams.get('tab');
  const hasExplicitTab = rawTabParam !== null && TAB_VALUES.has(rawTabParam as MyTab);
  const urlTab = parseTab(rawTabParam, 'history');
  const [activeTab, setActiveTab] = useState<MyTab>(urlTab);
  // URL에 ?tab= 이 없을 때만 열린 포지션 유무로 기본 탭을 정한다 — 있으면 활성 포지션, 없으면 매매 기록.
  const [resolvingDefaultTab, setResolvingDefaultTab] = useState(!hasExplicitTab);

  useEffect(() => {
    setActiveTab(urlTab);
  }, [urlTab]);

  useEffect(() => {
    if (hasExplicitTab) return;
    let cancelled = false;
    fetchPositions()
      .then((data) => {
        if (!cancelled && data.positions.some((p) => p.state !== 'closed')) {
          setActiveTab('positions');
        }
      })
      .catch(() => {
        // 실패 시 기본값(매매 기록)을 유지한다.
      })
      .finally(() => {
        if (!cancelled) setResolvingDefaultTab(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleTabChange = (value: string) => {
    const tab = parseTab(value, 'history');
    const next = new URLSearchParams(searchParams.toString());
    next.set('tab', tab);
    setActiveTab(tab);

    if (typeof window !== 'undefined') {
      window.history.replaceState(window.history.state, '', `${pathname}?${next.toString()}`);
    }
  };

  if (resolvingDefaultTab) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-var(--header-height)+1px)] w-full max-w-6xl items-center justify-center px-4 py-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-var(--header-height)+1px)] w-full max-w-6xl flex-col px-4 py-6">
      <div className="w-full min-w-0 space-y-4">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full min-w-0">
          <TabsList className="grid h-auto min-h-11 w-full min-w-0 grid-cols-3 rounded-lg bg-muted/70 p-1">
            <TabsTrigger value="positions" className="h-auto min-h-9 w-full min-w-0 whitespace-normal px-1 text-[11px] leading-tight sm:px-3 sm:text-sm">
              {tr('활성 포지션', 'Open Positions')}
            </TabsTrigger>
            <TabsTrigger value="profits" className="h-auto min-h-9 w-full min-w-0 whitespace-normal px-1 text-[11px] leading-tight sm:px-3 sm:text-sm">
              {tr('모의수익통계', 'Demo Profit Statistics')}
            </TabsTrigger>
            <TabsTrigger value="history" className="h-auto min-h-9 w-full min-w-0 whitespace-normal px-1 text-[11px] leading-tight sm:px-3 sm:text-sm">
              {tr('매매 기록', 'History')}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="min-h-[420px] w-full min-w-0 overflow-hidden pt-2">
          {activeTab === 'positions' ? <MyPositionsPanel /> : null}
          {activeTab === 'profits' ? <MyProfitsPanel /> : null}
          {activeTab === 'history' ? <MyHistoryPanel /> : null}
        </div>
      </div>
    </div>
  );
}
