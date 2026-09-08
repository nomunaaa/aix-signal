'use client';

import { useCallback, useMemo, useState } from 'react';
import { PositionCard } from '@/components/my/positions/PositionCard';
import { TradeEntryModal, type SubmitPayload } from '@/components/my/modal/TradeEntryModal';
import { toast } from '@/hooks/use-toast';
import { closeMyPosition } from '@/lib/my/close-position';
import { useMyStore } from '@/lib/my/store';
import type { Position, TradeAction } from '@/lib/my/types';
import { usePositionsPolling } from '@/lib/my/usePositionsPolling';

type ModalState = {
  isOpen: boolean;
  action: TradeAction;
  position: Position | undefined;
};

const MODAL_CLOSED: ModalState = { isOpen: false, action: 'close', position: undefined };

export function MyPositionsPanel() {
  usePositionsPolling();

  const positions = useMyStore((s) => s.activePositions);
  const closePositionOptimistic = useMyStore((s) => s.closePositionOptimistic);
  const restorePositionOptimistic = useMyStore((s) => s.restorePositionOptimistic);

  const [modal, setModal] = useState<ModalState>(MODAL_CLOSED);

  const visiblePositions = useMemo(
    () => positions.filter((p) => p.state !== 'closed'),
    [positions]
  );

  const handleClosePosition = useCallback(
    async (position: Position, exitPriceOverride?: number) => {
      const exitPrice = exitPriceOverride ?? position.currentPrice ?? position.entryPrice;

      closePositionOptimistic(position.id, exitPrice);
      const result = await closeMyPosition(position.id, exitPrice);

      if (!result.ok) {
        console.error('[my positions] close position failed', result.error);
        restorePositionOptimistic(position);
        toast({
          title: '포지션 청산 실패',
          description: '잠시 후 다시 시도해주세요.',
          variant: 'destructive',
        });
      }
    },
    [closePositionOptimistic, restorePositionOptimistic]
  );

  const handleAction = useCallback(
    (positionId: string, action: TradeAction) => {
      const position = positions.find((p) => p.id === positionId);
      if (!position) return;
      if (action === 'close') {
        // 확인 팝업 없이 즉시 시장가로 청산한다.
        void handleClosePosition(position);
        return;
      }
      setModal({ isOpen: true, action, position });
    },
    [positions, handleClosePosition]
  );

  const handleCloseAll = useCallback(() => {
    for (const position of visiblePositions) {
      void handleClosePosition(position);
    }
  }, [visiblePositions, handleClosePosition]);

  const handleSubmit = useCallback(
    (payload: SubmitPayload) => {
      if (payload.action === 'close' && modal.position) {
        const closeData = payload.formData as { closePrice: number };
        void handleClosePosition(modal.position, closeData.closePrice);
      }
    },
    [modal.position, handleClosePosition]
  );

  const handleModalClose = useCallback(() => setModal(MODAL_CLOSED), []);

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">활성 포지션</h1>
        <div className="flex items-center gap-2">
          {visiblePositions.length > 0 && (
            <button
              type="button"
              onClick={handleCloseAll}
              className="rounded border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/80"
            >
              전체종목청산
            </button>
          )}
        </div>
      </div>

      {visiblePositions.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          아직 따라간 시그널이 없습니다
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {visiblePositions.map((position) => (
            <PositionCard key={position.id} position={position} onAction={handleAction} />
          ))}
        </div>
      )}

      <TradeEntryModal
        isOpen={modal.isOpen}
        onClose={handleModalClose}
        action={modal.action}
        existingPosition={modal.position}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
