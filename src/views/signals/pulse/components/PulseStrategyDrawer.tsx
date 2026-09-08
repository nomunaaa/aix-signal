/**
 * 전략·스트림 변경 Sheet — 게이트와 동일 카드·KPI 테이블 레이아웃
 */

import { useRef, useEffect } from 'react';
import { useSearchParams } from "@/lib/navigation-compat";
import { Crosshair, Shield, ArrowDownToLine, Layers } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { STRATEGY_CONFIGS, type StrategyId, type SignalStreamId } from '../types/pulse.types';
import { STREAM_GATE_META } from '../config/signalGateCopy';
import { usePulseStore } from '../stores/pulseStore';
import { useStrategyCalc } from '../hooks/useStrategyCalc';
import { GATE_FONT } from './GateKpiTable';
import { GateSelectCard } from './GateSelectCard';
import {
  pulseStrategyDescription,
  pulseStrategyName,
  pulseStrategyTagline,
  usePulseCopy,
} from '../utils/pulseTranslations';

const STRATEGY_ICONS = {
  oneshot: Crosshair,
  safe: Shield,
  deep: ArrowDownToLine,
  full: Layers,
} as const;

interface PulseStrategyDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'gate' | 'change';
}

function mergeParams(
  prev: URLSearchParams,
  strategyId: StrategyId,
  stream: SignalStreamId,
): URLSearchParams {
  const params = new URLSearchParams(prev);
  if (strategyId !== 'oneshot') params.set('strategy', strategyId);
  else params.delete('strategy');
  if (stream !== 'pulse') params.set('stream', stream);
  else params.delete('stream');
  return params;
}

export function PulseStrategyDrawer({ open, onOpenChange, mode }: PulseStrategyDrawerProps) {
  const { language, copy } = usePulseCopy();
  const [, setSearchParams] = useSearchParams();
  const completeGate = usePulseStore((s) => s.completeGate);
  const setStrategy = usePulseStore((s) => s.setStrategy);
  const setStream = usePulseStore((s) => s.setStream);
  const selectedStrategy = usePulseStore((s) => s.selectedStrategy);
  const selectedStream = usePulseStore((s) => s.selectedStream);
  const { recommended, stats30dByStrategy, stats30dByStream } = useStrategyCalc();
  const strategyListRef = useRef<HTMLDivElement>(null);
  const prevStreamRef = useRef<SignalStreamId>(selectedStream);

  const maxStreamWin = Math.max(stats30dByStream.pulse.winRate, stats30dByStream.wave.winRate);
  const streamWinBest = (sid: SignalStreamId) => stats30dByStream[sid].winRate >= maxStreamWin;

  const maxStrategyWin = Math.max(
    ...STRATEGY_CONFIGS.map((c) => stats30dByStrategy[selectedStream][c.id].winRate),
  );
  const strategyWinBest = (cfgId: StrategyId) =>
    stats30dByStrategy[selectedStream][cfgId].winRate >= maxStrategyWin;

  useEffect(() => {
    if (prevStreamRef.current === selectedStream) return;
    prevStreamRef.current = selectedStream;
    requestAnimationFrame(() => {
      strategyListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [selectedStream]);

  const handleSelectStream = (streamId: SignalStreamId) => {
    setStream(streamId);
    setSearchParams((prev) => mergeParams(prev, selectedStrategy, streamId));
  };

  const handleSelectStrategy = (strategyId: StrategyId) => {
    if (mode === 'gate') {
      completeGate(strategyId, true, selectedStream);
    } else {
      setStrategy(strategyId);
    }
    setSearchParams((prev) => mergeParams(prev, strategyId, selectedStream));
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={cn('w-full overflow-y-auto sm:max-w-sm', GATE_FONT)}>
        <SheetHeader>
          <SheetTitle className="text-body font-semibold text-foreground">
            {mode === 'gate' ? copy.gate.selectTitle : copy.gate.changeTitle}
          </SheetTitle>
          <SheetDescription className="text-caption text-muted-foreground">
            {copy.gate.description}
          </SheetDescription>
        </SheetHeader>

        <div className="pt-4">
          <p className="mb-1.5 text-caption font-medium text-muted-foreground">{copy.gate.stream}</p>
          <div className="mb-4 grid grid-cols-1 gap-2">
            {(['pulse', 'wave'] as const).map((sid) => {
              const metaBase = STREAM_GATE_META[sid];
              const meta = copy.gate.streams[sid];
              const Icon = metaBase.Icon;
              const k = stats30dByStream[sid];
              const active = selectedStream === sid;
              return (
                <GateSelectCard
                  key={sid}
                  selected={active}
                  onSelect={() => handleSelectStream(sid)}
                  popoverSide="left"
                  highlightWinRate={streamWinBest(sid)}
                  icon={
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${metaBase.accent}22` }}
                    >
                      <Icon className="h-6 w-6" style={{ color: metaBase.accent }} />
                    </div>
                  }
                  title={meta.title}
                  textBadges={meta.badges}
                  detailTitle={meta.title}
                  detailBody={`${meta.tagline}\n\n${meta.detail}`}
                  metrics={k}
                />
              );
            })}
          </div>
        </div>

        <div ref={strategyListRef} className="scroll-mt-4 flex flex-col gap-2">
          <p className="mb-0.5 text-caption font-medium text-muted-foreground">{copy.gate.strategy}</p>
          {STRATEGY_CONFIGS.map((cfg) => {
            const Icon = STRATEGY_ICONS[cfg.id];
            const k = stats30dByStrategy[selectedStream][cfg.id];
            const isRecommended = cfg.id === recommended;
            const isSelected = cfg.id === selectedStrategy;

            return (
              <GateSelectCard
                key={cfg.id}
                selected={isSelected}
                onSelect={() => handleSelectStrategy(cfg.id)}
                popoverSide="left"
                highlightWinRate={strategyWinBest(cfg.id)}
                icon={
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${cfg.color}18` }}
                  >
                    <Icon className="h-6 w-6" style={{ color: cfg.color }} />
                  </div>
                }
                title={pulseStrategyName(cfg, language)}
                titleSuffix={language === 'ko' ? <span className="text-caption text-muted-foreground">{cfg.nameEn}</span> : undefined}
                strategyFeatures={{
                  discount: cfg.features.discount,
                  locked: cfg.features.locked,
                }}
                detailTitle={pulseStrategyName(cfg, language)}
                detailBody={`${pulseStrategyTagline(cfg, language)}\n\n${pulseStrategyDescription(cfg, language)}`}
                metrics={k}
                showRecommended={isRecommended && !isSelected}
              />
            );
          })}
        </div>

        <div className="pb-6 pt-4 text-center">
          <p className="text-caption text-muted-foreground">{copy.gate.changeAnytime}</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
