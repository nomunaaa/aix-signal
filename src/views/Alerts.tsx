'use client';

import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useBilingualText } from "@/hooks/useBilingualText";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Settings } from "lucide-react";
import { QuickStartWizard } from "@/components/alerts/QuickStartWizard";
import { Summary48h } from "@/components/alerts/Summary48h";
import { DNDPriorityPanel } from "@/components/alerts/DNDPriorityPanel";
import { BrowserPushPanel } from "@/components/alerts/BrowserPushPanel";
import { GlossaryChips } from "@/components/alerts/GlossaryChips";
import { HistoryFilters } from "@/components/alerts/HistoryFilters";
import { HistoryTable } from "@/components/alerts/HistoryTable";
import { AlertsFAQ } from "@/components/alerts/AlertsFAQ";
import { HeroSection } from "@/components/alerts/HeroSection";
import { getAllowedSymbols } from "@/config/symbols";
import { PUBLIC_BROWSING } from "@/config/access";
import {
  AlertSettings, 
  Summary48h as Summary48hType, 
  HistoryCycle, 
  HistoryFilters as HistoryFiltersType 
} from "@/types/alerts";

const IN_APP_CHANNELS: AlertSettings['channels'] = ['앱 내 알림(기본)'];

const Alerts = () => {
  const { user, subscription } = useAuth();
  const { toast } = useToast();
  const { locale, tr } = useBilingualText();
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [settings, setSettings] = useState<AlertSettings | null>(null);
  const [summary, setSummary] = useState<Summary48hType>({
    alc_exit: 0,
    open: 0,
    close: 0,
    as_of: new Date().toISOString(),
  });
  const [historyCycles, setHistoryCycles] = useState<HistoryCycle[]>([]);
  const [filters, setFilters] = useState<HistoryFiltersType>({
    symbols: [],
    range: '3m',
    side: 'BOTH',
    action: ['ENTRY', 'EXIT'],
  });
  const allowedSymbols = useMemo(
    () => getAllowedSymbols(subscription.plan),
    [subscription.plan]
  );
  const allowedSymbolSet = useMemo(
    () => new Set(allowedSymbols),
    [allowedSymbols]
  );
  const hasSymbolAccess = allowedSymbols.length > 0;

  // Load user settings
  useEffect(() => {
    if (!user) return;

    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('user_alert_settings')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          const favorites = Array.isArray(data.favorites)
            ? data.favorites.filter((symbol) => allowedSymbolSet.has(symbol))
            : [];

          setSettings({
            preset: (data.preset || 'Balanced') as AlertSettings['preset'],
            channels: IN_APP_CHANNELS,
            favorites,
            dnd: {
              enabled: !!data.dnd_start,
              start: data.dnd_start || '23:00',
              end: data.dnd_end || '07:00',
              timezone: data.timezone || 'Asia/Seoul',
              exceptions: (Array.isArray(data.dnd_exceptions) ? data.dnd_exceptions : ['ALC_EXIT']) as AlertSettings['dnd']['exceptions'],
            },
            channelPriority: IN_APP_CHANNELS,
          });
          setShowWizard(false);
        } else {
          // No settings found, show wizard
          setShowWizard(true);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        toast({
          title: tr("설정 로드 실패", "Could not load settings"),
          description: tr("알림 설정을 불러오는 중 오류가 발생했습니다.", "An error occurred while loading alert settings."),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [allowedSymbolSet, user, toast, tr]);

  // Load 48h summary
  useEffect(() => {
    if (!user || !settings) return;

    const loadSummary = async () => {
      try {
        if (!hasSymbolAccess) {
          setSummary({
            alc_exit: 0,
            open: 0,
            close: 0,
            as_of: new Date().toISOString(),
          });
          return;
        }

        const now = new Date();
        const past48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

        const { data, error } = await supabase
          .from('alerts_history')
          .select('action')
          .eq('user_id', user.id)
          .in('symbol', allowedSymbols)
          .gte('ts', past48h.toISOString());

        if (error) throw error;

        const alc_exit = data?.filter(d => d.action === 'ALC_EXIT').length || 0;
        const open = data?.filter(d => d.action === 'ENTRY').length || 0;
        const close = data?.filter(d => d.action === 'EXIT').length || 0;

        setSummary({
          alc_exit,
          open,
          close,
          as_of: now.toISOString(),
        });
      } catch (error) {
        console.error('Error loading summary:', error);
      }
    };

    loadSummary();
  }, [allowedSymbols, hasSymbolAccess, user, settings]);

  // Load history cycles
  useEffect(() => {
    if (!user) return;

    const loadHistory = async () => {
      try {
        if (!hasSymbolAccess) {
          setHistoryCycles([]);
          return;
        }

        let query = supabase
          .from('alerts_history')
          .select('*')
          .eq('user_id', user.id)
          .order('ts', { ascending: false });

        // Apply filters
        const filterSymbols = filters.symbols.filter((symbol) => allowedSymbolSet.has(symbol));
        query = query.in('symbol', filterSymbols.length > 0 ? filterSymbols : allowedSymbols);

        if (filters.side !== 'BOTH') {
          query = query.eq('side', filters.side);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Group by cycle_id
        const cyclesMap = new Map<string, HistoryCycle>();
        
        data?.forEach(record => {
          const cycleId = record.cycle_id || record.id;
          
          if (!cyclesMap.has(cycleId)) {
            cyclesMap.set(cycleId, {} as HistoryCycle);
          }
          
           
          const cycle = cyclesMap.get(cycleId)!;
          
          if (record.action === 'ENTRY') {
            cycle.entry = {
              ts: record.ts,
              symbol: record.symbol,
              side: record.side as 'LONG' | 'SHORT',
              price: record.price,
              type: 'ENTRY',
            };
          } else if (record.action === 'EXIT') {
            cycle.exit = {
              ts: record.ts,
              symbol: record.symbol,
              side: record.side as 'LONG' | 'SHORT',
              price: record.price,
              type: 'EXIT',
            };
          } else if (record.action === 'PNL_PROFIT' || record.action === 'PNL_LOSS') {
            cycle.pnl = {
              kind: record.action as 'PNL_PROFIT' | 'PNL_LOSS',
              abs: record.amount || 0,
              pct: record.pnl_pct || 0,
              ts: record.ts,
            };
          }
        });

        const cycles = Array.from(cyclesMap.values()).filter(c => c.entry);
        setHistoryCycles(cycles);
      } catch (error) {
        console.error('Error loading history:', error);
      }
    };

    loadHistory();
  }, [allowedSymbolSet, allowedSymbols, filters, hasSymbolAccess, user]);

  // Realtime subscription for new alerts
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('alerts-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts_history',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Reload summary and history when new alert arrives
          window.location.reload();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleWizardComplete = async (wizardSettings: {
    preset: AlertSettings['preset'];
    channels: AlertSettings['channels'];
    favorites: string[];
  }) => {
    if (!user) {
      toast({
        title: tr('로그인 필요', 'Login required'),
        description: tr('설정을 저장하려면 로그인이 필요합니다.', 'Please log in to save settings.'),
        variant: 'destructive',
      });
      return;
    }

    try {
      const favorites = wizardSettings.favorites.filter((symbol) => allowedSymbolSet.has(symbol));

      const settingsData = {
        user_id: user.id,
        preset: wizardSettings.preset,
        channels: wizardSettings.channels,
        favorites,
        symbols: favorites,
        scope: 'favorites',
        enabled: hasSymbolAccess,
        signal_alerts: hasSymbolAccess,
        dnd_enabled: true,
        dnd_start: '23:00',
        dnd_end: '07:00',
        timezone: 'Asia/Seoul',
        dnd_exceptions: ['ALC_EXIT'],
        channel_priority: IN_APP_CHANNELS,
      };

      const { data: existingSettings, error: findError } = await supabase
        .from('user_alert_settings')
        .select('id')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (findError) throw findError;

      const { error } = existingSettings
        ? await supabase
            .from('user_alert_settings')
            .update(settingsData)
            .eq('user_id', user.id)
        : await supabase
            .from('user_alert_settings')
            .insert(settingsData);

      if (error) throw error;

      const { data: savedData, error: reloadError } = await supabase
        .from('user_alert_settings')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (!reloadError && savedData) {
        const savedFavorites = Array.isArray(savedData.favorites)
          ? savedData.favorites.filter((symbol) => allowedSymbolSet.has(symbol))
          : [];

        setSettings({
          preset: (savedData.preset || 'Balanced') as AlertSettings['preset'],
          channels: IN_APP_CHANNELS,
          favorites: savedFavorites,
          dnd: {
            enabled: !!savedData.dnd_start,
            start: savedData.dnd_start || '23:00',
            end: savedData.dnd_end || '07:00',
            timezone: savedData.timezone || 'Asia/Seoul',
            exceptions: (Array.isArray(savedData.dnd_exceptions) ? savedData.dnd_exceptions : ['ALC_EXIT']) as AlertSettings['dnd']['exceptions'],
          },
          channelPriority: IN_APP_CHANNELS,
        });
      }

      setShowWizard(false);

      toast({
        title: tr("설정 저장 완료", "Settings saved"),
        description: tr("알림 설정이 성공적으로 저장되었습니다.", "Alert settings were saved successfully."),
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: tr("설정 저장 실패", "Could not save settings"),
        description: tr("알림 설정 저장 중 오류가 발생했습니다.", "An error occurred while saving alert settings."),
        variant: "destructive",
      });
    }
  };

  const handleDNDChange = async (start: string, end: string) => {
    if (!user || !settings) return;

    try {
      const { error } = await supabase
        .from('user_alert_settings')
        .update({
          dnd_enabled: true,
          dnd_start: start,
          dnd_end: end,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setSettings({
        ...settings,
        dnd: {
          ...settings.dnd,
          start,
          end,
        },
      });

      toast({
        title: tr("DND 설정 업데이트", "DND settings updated"),
        description: tr("방해금지 시간이 업데이트되었습니다.", "Quiet hours have been updated."),
      });
    } catch (error) {
      console.error('Error updating DND:', error);
      toast({
        title: tr("업데이트 실패", "Update failed"),
        description: tr("DND 설정 업데이트 중 오류가 발생했습니다.", "An error occurred while updating DND settings."),
        variant: "destructive",
      });
    }
  };

  const handleExportCSV = () => {
    const csv = [
      [tr('구분', 'Type'), tr('날짜', 'Date'), tr('종목', 'Symbol'), tr('방향', 'Side'), tr('가격', 'Price'), 'PnL'],
      ...historyCycles.flatMap(cycle => {
        const rows = [];
        if (cycle.entry) {
          rows.push([
            'ENTRY',
            new Date(cycle.entry.ts).toLocaleDateString(locale),
            cycle.entry.symbol,
            cycle.entry.side,
            cycle.entry.price,
            '',
          ]);
        }
        if (cycle.pnl) {
          rows.push([
            'PNL',
            new Date(cycle.pnl.ts).toLocaleDateString(locale),
            '',
            '',
            '',
            `${cycle.pnl.abs} (${(cycle.pnl.pct * 100).toFixed(2)}%)`,
          ]);
        }
        if (cycle.exit) {
          rows.push([
            'EXIT',
            new Date(cycle.exit.ts).toLocaleDateString(locale),
            cycle.exit.symbol,
            cycle.exit.side,
            cycle.exit.price,
            '',
          ]);
        }
        return rows;
      }),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alerts_history_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 공개 열람이 켜져 있으면 잠금 화면 대신 페이지를 그대로 보여준다.
  // 저장 등 실제 동작에는 아래 handler들의 로그인 확인이 그대로 남아 있다.
  if (!user && !PUBLIC_BROWSING) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 px-4 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted">
          <span className="text-2xl">🔒</span>
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">{tr('로그인이 필요합니다', 'Login required')}</h2>
          <p className="text-sm text-muted-foreground max-w-xs">{tr('이 페이지를 이용하려면 먼저 로그인해 주세요.', 'Please log in before using this page.')}</p>
        </div>
        <Button onClick={() => window.location.href = '/auth'}>{tr('로그인하기', 'Log in')}</Button>
      </div>
    );
  }

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">{tr('로딩 중...', 'Loading...')}</p>
        </div>
    );
  }

  return (
      <div className="space-y-8">
        <HeroSection
          statusChips={[
            tr('알림 ON', 'Alerts ON'),
            tr(`즐겨찾기 ${settings?.favorites.length || 0}`, `${settings?.favorites.length || 0} favorites`),
            tr('최근 48h · 종목별 20회', 'Last 48h · 20 per symbol'),
          ]}
        />

        {showWizard ? (
          <QuickStartWizard
            onComplete={handleWizardComplete}
            allowedSymbols={allowedSymbols}
            initialSettings={settings || undefined}
          />
        ) : settings ? (
          <>
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setShowWizard(true)}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                {tr('알림 설정 변경', 'Change alert settings')}
              </Button>
            </div>

            <Summary48h
              summary={summary}
              favorites={settings.favorites}
              spark={{
                BTCUSDT: [-0.4, 0.2, 0.6, -0.1, 0.3],
                ETHUSDT: [0.1, 0.2, -0.2, 0.4, 0.5],
                SOLUSDT: [-0.3, -0.1, 0.0, 0.2, 0.1],
              }}
            />

            <DNDPriorityPanel
              dndStart={settings.dnd.start}
              dndEnd={settings.dnd.end}
              onDNDChange={handleDNDChange}
              channelPriority={settings.channelPriority}
            />

            <BrowserPushPanel />

            <GlossaryChips />

            <HistoryFilters
              filters={filters}
              onFiltersChange={setFilters}
              onExportCSV={handleExportCSV}
            />

            <HistoryTable cycles={historyCycles} />

            <AlertsFAQ />

            {/* 이미 구독 중인 사용자에게는 체크아웃 유도 CTA를 보여주지 않는다 */}
            {/* {!subscription.subscribed && (
              <div className="text-center py-12 space-y-4">
                <p className="text-lg text-muted-foreground">
                  기록은 말보다 정확합니다. 스냅샷으로 검증하세요.
                </p>
                <div className="flex justify-center gap-4">
                  <BetaPurchaseGate href="/checkout">
                    <Button size="lg">무료로 시작</Button>
                  </BetaPurchaseGate>
                  <Button size="lg" variant="outline">
                    스냅샷 보기
                  </Button>
                </div>
              </div>
            )} */}
          </>
        ) : null}
      </div>
  );
};

export default Alerts;
