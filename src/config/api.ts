/**
 * API Configuration
 * Centralized public market-data URLs and endpoints.
 */

export const BINANCE_API = {
  REST_SPOT: process.env.NEXT_PUBLIC_BINANCE_API_URL || 'https://api.binance.com/api/v3',
  REST_FUTURES: process.env.NEXT_PUBLIC_BINANCE_FUTURES_API_URL || 'https://fapi.binance.com/fapi/v1',
  WS_STREAM: process.env.NEXT_PUBLIC_BINANCE_WS_URL || 'wss://stream.binance.com:9443/ws',
  WS_DATA_STREAM: process.env.NEXT_PUBLIC_BINANCE_DATA_STREAM_URL || 'wss://data-stream.binance.vision/ws',
  WS_FUTURES: process.env.NEXT_PUBLIC_BINANCE_FUTURES_WS_URL || 'wss://fstream.binance.com',
  WS_FUTURES_STREAM: process.env.NEXT_PUBLIC_BINANCE_FUTURES_STREAM_URL || 'wss://fstream.binance.com/stream',
} as const;

export const getBinanceWsUrl = (
  symbol: string,
  stream: 'kline_1m' | 'kline_5m' | 'kline_10m' = 'kline_1m'
) => {
  return `${BINANCE_API.WS_DATA_STREAM}/${symbol.toLowerCase()}@${stream}`;
};

export const getBinanceRestUrl = (
  endpoint: string,
  type: 'spot' | 'futures' = 'futures'
) => {
  const baseUrl = type === 'spot' ? BINANCE_API.REST_SPOT : BINANCE_API.REST_FUTURES;
  return `${baseUrl}${endpoint}`;
};
