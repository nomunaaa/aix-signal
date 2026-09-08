import { create } from 'zustand'
import type { Position } from '@/lib/my/types'

interface MyStore {
  activePositions: Position[]
  closedPositionIds: Set<string>
  setPositions: (positions: Position[]) => void
  addPositionOptimistic: (position: Position) => void
  closePositionOptimistic: (positionId: string, exitPrice: number) => void
  restorePositionOptimistic: (position: Position) => void
}

function filterOpenPositions(positions: Position[], closedPositionIds: ReadonlySet<string>) {
  return positions.filter(
    (position) => position.state !== 'closed' && !closedPositionIds.has(position.id)
  )
}

export const useMyStore = create<MyStore>((set) => ({
  activePositions: [],
  closedPositionIds: new Set(),

  setPositions: (positions) =>
    set((state) => ({
      activePositions: filterOpenPositions(positions, state.closedPositionIds),
    })),

  addPositionOptimistic: (position) =>
    set((state) => {
      const closedPositionIds = new Set(state.closedPositionIds)
      closedPositionIds.delete(position.id)

      return {
        closedPositionIds,
        activePositions: [
          position,
          ...state.activePositions.filter((existing) => existing.id !== position.id),
        ],
      }
    }),

  closePositionOptimistic: (positionId, exitPrice) =>
    set((state) => {
      void exitPrice

      const closedPositionIds = new Set(state.closedPositionIds)
      closedPositionIds.add(positionId)

      return {
        closedPositionIds,
        activePositions: state.activePositions.filter((position) => position.id !== positionId),
      }
    }),

  restorePositionOptimistic: (position) =>
    set((state) => {
      const closedPositionIds = new Set(state.closedPositionIds)
      closedPositionIds.delete(position.id)

      return {
        closedPositionIds,
        activePositions: [
          position,
          ...state.activePositions.filter((existing) => existing.id !== position.id),
        ],
      }
    }),
}))
