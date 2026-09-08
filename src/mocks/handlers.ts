import { signalHandlers } from './handlers/signals';
import { strategyHandlers } from './handlers/strategies';

export const handlers = [...signalHandlers, ...strategyHandlers];
