'use client'

import { useState, useCallback } from 'react'
import type { SignalContext, TradeEntryFormData, TradeAction, Position, TradeEntryScenario } from '@/lib/my/types'
import { recalcTradeScenario } from '@/lib/my/calc-scenario'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SignalContextPanel } from './SignalContextPanel'
import { ScenarioPreview } from './ScenarioPreview'
import { OpenFormSection } from './variants/OpenFormSection'
import { AddFormSection } from './variants/AddFormSection'
import { PartialFormSection } from './variants/PartialFormSection'
import { CloseFormSection } from './variants/CloseFormSection'
import { buildSignalFromPosition } from '@/lib/my/buildSignalFromPosition'

const ACTION_LABELS: Record<TradeAction, string> = {
  open: '따라가기',
  add: '추가진입',
  partial: '분할청산',
  close: '청산',
}

interface TradeEntryModalProps {
  isOpen: boolean
  onClose: () => void
  /** Provided for open action */
  signal?: SignalContext
  action: TradeAction
  /** Required for add/partial/close actions */
  existingPosition?: Position
  onSubmit: (payload: SubmitPayload) => void
}

export interface SubmitPayload {
  action: TradeAction
  signal: SignalContext
  formData: TradeEntryFormData | AddPayload | PartialPayload | ClosePayload
}

interface AddPayload { addPrice: number; addQuantityPct: number }
interface PartialPayload { exitPrice: number; exitQuantityPct: number }
interface ClosePayload { closePrice: number }

const QUICK_CHIPS = [100, 500, 1000, 5000]

export function TradeEntryModal({
  isOpen,
  onClose,
  signal,
  action,
  existingPosition,
  onSubmit,
}: TradeEntryModalProps) {
  const resolvedSignal = signal ?? (existingPosition ? buildSignalFromPosition(existingPosition) : null)

  const [openForm, setOpenForm] = useState<TradeEntryFormData>({
    entryPrice: resolvedSignal?.signalPrice ?? 0,
    investmentUsd: 500,
    leverage: 3,
    strategy: 'basic',
  })
  const [addForm, setAddForm] = useState({ addPrice: resolvedSignal?.currentPrice ?? 0, addQuantityPct: 50 })
  const [partialForm, setPartialForm] = useState({ exitPrice: resolvedSignal?.currentPrice ?? 0, exitQuantityPct: 50 })
  const [closeForm, setCloseForm] = useState({ closePrice: resolvedSignal?.currentPrice ?? 0 })

  const scenario: TradeEntryScenario | null = resolvedSignal && (action === 'open' || action === 'add')
    ? recalcTradeScenario(
        action === 'open' ? openForm.entryPrice : addForm.addPrice,
        action === 'open' ? openForm.investmentUsd : 0,
        action === 'open' ? openForm.leverage : 1,
        resolvedSignal.direction,
        resolvedSignal.targetPrice,
        resolvedSignal.invalidationPrice
      )
    : null

  const handleOpenChange = useCallback((patch: Partial<TradeEntryFormData>) => {
    setOpenForm((prev) => {
      const next = { ...prev, ...patch }
      return next
    })
  }, [])

  function handleSubmit() {
    if (!resolvedSignal) return
    let formData: SubmitPayload['formData']
    if (action === 'open') formData = openForm
    else if (action === 'add') formData = addForm
    else if (action === 'partial') formData = partialForm
    else formData = closeForm

    onSubmit({ action, signal: resolvedSignal, formData })
    onClose()
  }

  if (!resolvedSignal) return null

  const existingSummary = existingPosition
    ? {
        entryPrice: existingPosition.entryPrice,
        investmentUsd: 0,
        leverage: existingPosition.leverage,
        strategy: existingPosition.strategy,
      }
    : undefined

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ACTION_LABELS[action]}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <SignalContextPanel signal={resolvedSignal} existingSummary={existingSummary} />

          {action === 'open' && (
            <OpenFormSection
              data={openForm}
              quickChips={QUICK_CHIPS}
              onChange={handleOpenChange}
            />
          )}
          {action === 'add' && (
            <AddFormSection
              data={addForm}
              onChange={(patch) => setAddForm((p) => ({ ...p, ...patch }))}
            />
          )}
          {action === 'partial' && (
            <PartialFormSection
              data={partialForm}
              onChange={(patch) => setPartialForm((p) => ({ ...p, ...patch }))}
            />
          )}
          {action === 'close' && (
            <CloseFormSection
              data={closeForm}
              remainingQty={100}
              onChange={(patch) => setCloseForm((p) => ({ ...p, ...patch }))}
            />
          )}

          <ScenarioPreview scenario={scenario} action={action} />

          <div className="space-y-2">
            <button
              type="button"
              onClick={handleSubmit}
              className="w-full rounded-md bg-[--color-accent] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {ACTION_LABELS[action]} 기록
            </button>
            <p className="text-center text-xs text-muted-foreground">
              가상 포지션으로 추적됩니다
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
