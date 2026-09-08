/** Board / signal strategy — controls which sections & action types apply */
export type StrategyType = 'basic' | 'dca' | 'partial_exit' | 'dca_partial';

export type SignalActionType = 'additional_entry' | 'partial_exit';

export type SignalActionStatus = 'pending' | 'triggered' | 'expired';

export interface SignalAction {
  action_type: SignalActionType;
  price: number;
  status: SignalActionStatus;
  triggered_at: string | null;
}
