/**
 * Binance Futures Ticker WebSocket-аар real-time үнэ авах
 */

export interface BinanceTickerEvent {
  e: string;  // Event type: "24hrTicker"
  E: number;  // Event time (milliseconds, server time)
  s: string;  // Symbol (ж: BTCUSDT)
  c: string;  // Last price (хамгийн сүүлийн арилжааны үнэ)
  o: string;  // Open price (24 цагийн өмнөх нээлтийн үнэ, UTC биш rolling 24h)
  h: string;  // High price (сүүлийн 24 цагийн хамгийн өндөр үнэ)
  l: string;  // Low price (сүүлийн 24 цагийн хамгийн бага үнэ)
  v: string;  // Base asset volume (ж: BTC хэмжээ)
  q: string;  // Quote asset volume (ж: USDT дүн)
  p: string;  // Price change (c - o)
  P: string;  // Price change percent ((c - o) / o * 100)
  w: string;  // Weighted average price (VWAP, 24h)
  x: string;  // Previous close price (өмнөх 24h window-ийн close)  
  b: string;  // Best bid price (хамгийн өндөр bid үнэ)
  B: string;  // Best bid quantity (bid талын хэмжээ)
  a: string;  // Best ask price (хамгийн бага ask үнэ)
  A: string;  // Best ask quantity (ask талын хэмжээ)
}

export interface TickerPriceData {
  symbol: string;       // Симбол
  price: number;        // Одоогийн үнэ (last price)
  dailyChange: number;  // 24 цагийн үнийн % өөрчлөлт (rolling)
  highest24h: number;   // Сүүлийн 24 цагийн max
  lowest24h: number;    // Сүүлийн 24 цагийн min
  timestamp: number;    // Үнэ шинэчлэгдсэн цаг
}

type TickerCallback = (data: TickerPriceData) => void;

/**
 * Binance Futures Ticker Streams -д зориулсан WebSocket Manager
 * Бүх симболд нэг websocket connection ашиглана - Singleton pattern
 */
class BinanceTickerWebSocketManager {
  private static instance: BinanceTickerWebSocketManager;
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, Set<TickerCallback>> = new Map();
  private reconnectAttempts = 0;
  private reconnectDelay = 3000;
  private readonly MAX_RECONNECT_DELAY_MS = 30_000;
  private isConnecting = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly BATCH_RECONNECT_DELAY = 200;

  private constructor() {
    // 노트북 슬립, 와이파이 전환 등으로 소켓이 끊겼을 때 브라우저 탭이 다시 활성화되거나
    // 네트워크가 복구되는 즉시 연결 상태를 확인해 재연결한다 — 이전에는 재연결 시도
    // 횟수(10회)를 소진하면 영구히 포기해, 그 탭만 가격이 멈춘 채 남는 문제가 있었다
    // (같은 계정으로 두 브라우저를 열었을 때 손익 수치가 서로 달라지는 원인).
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.ensureConnected());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') this.ensureConnected();
      });
    }
  }

  private ensureConnected() {
    if (this.subscriptions.size === 0) return;
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }
    this.reconnectAttempts = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.connect();
  }

  static getInstance(): BinanceTickerWebSocketManager {
    if (!BinanceTickerWebSocketManager.instance) {
      BinanceTickerWebSocketManager.instance = new BinanceTickerWebSocketManager();
    }
    return BinanceTickerWebSocketManager.instance;
  }

  /**
   * Симболд нэг websocket connection ашиглана - Singleton pattern
   * Batch subscribe логик: Олон symbol subscribe хийхэд нэг удаа reconnect хийх
   */
  subscribe(symbol: string, callback: TickerCallback): () => void {
    const symbolLower = symbol.toLowerCase();
    const wasNewSymbol = !this.subscriptions.has(symbolLower);
    
    if (!this.subscriptions.has(symbolLower)) {
      this.subscriptions.set(symbolLower, new Set());
    }
    
    this.subscriptions.get(symbolLower)!.add(callback);
    
    // Хэрэв шинэ symbol subscribe хийж байгаа бөгөөд connection аль хэдийн нээгдсэн бол batch reconnect логик ашиглах
    if (wasNewSymbol) {
      if ((this.ws?.readyState as number) === WebSocket.OPEN) {
        this.scheduleBatchReconnect();
      } else if (!this.ws || (this.ws.readyState !== WebSocket.OPEN && !this.isConnecting)) {
        this.connect();
      } 
    } else if (!this.ws || (this.ws.readyState !== WebSocket.OPEN && !this.isConnecting)) {
      this.connect();
    }
    
    // Цэвэрлэх функц
    return () => {
      const callbacks = this.subscriptions.get(symbolLower);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscriptions.delete(symbolLower);
        }
      }
      
      // Subscription-уудын тоо 0 буюу subscription байхгүй бол socket-ийг цэвэрлэх
      if (this.subscriptions.size === 0) {
        this.disconnect();
      }
    };
  }

  /**
   * Binance Futures WebSocket-ийг холбох
   */
  private connect() {    
    if (this.isConnecting) {
      // CONNECTING төлөвт байвал хүлээх
      return;
    }
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      // OPEN төлөвт байвал хүлээх
      return;
    }
    
    // CONNECTING төлөвт байвал хүлээх
    if (this.ws?.readyState === WebSocket.CONNECTING) {      
      return;
    }

    const symbolsArray = Array.from(this.subscriptions.keys());
    if (symbolsArray.length === 0) {
      return;
    }

    this.isConnecting = true;

    const streams = symbolsArray.map(s => `${s}@ticker`).join('/');
    const binanceWsBase = process.env.NEXT_PUBLIC_BINANCE_FUTURES_WS_URL || 'wss://fstream.binance.com';
    const wsUrl = `${binanceWsBase}/stream?streams=${streams}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {        
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        
        // Хэрэв connection нээгдсэний дараа бүх symbol-ууд subscribe хийгдээгүй бол connection-ийг дахин нээх (бүх symbol-уудыг багтаах)
        const allSubscribedSymbols = Array.from(this.subscriptions.keys());
        if (allSubscribedSymbols.length > symbolsArray.length) {
          setTimeout(() => {
            this.disconnect();
            setTimeout(() => {
              if (this.subscriptions.size > 0) {
                this.connect();
              }
            }, 50);
          }, 100);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Binance-ийн бүрэн stream format: { stream: "btcusdt@ticker", data: {...} }
          if (data.stream && data.data) {
            const streamName = data.stream;
            const symbol = streamName.split('@')[0].toUpperCase();
            const tickerData = data.data as BinanceTickerEvent;

            if (tickerData.e === '24hrTicker' && tickerData.s) {
              this.processTickerData(symbol, tickerData);
            }
          }
        } catch (error) {
          console.error('[TickerWS] Error parsing message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[TickerWS] WebSocket error:', error);
        this.isConnecting = false;
        this.handleReconnect();
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        if (this.subscriptions.size > 0) {
          this.handleReconnect();
        }
      };
    } catch (error) {
      console.error('[TickerWS] Failed to create WebSocket:', error);
      this.isConnecting = false;
      this.handleReconnect();
    }
  }

  /**
   * Үнэний өөрчлөлтээр callback-уудыг дуудах
   */
  private processTickerData(symbol: string, ticker: BinanceTickerEvent) {
    const symbolLower = symbol.toLowerCase();
    const callbacks = this.subscriptions.get(symbolLower);

    if (!callbacks || callbacks.size === 0) {
      return;
    }

    const price = parseFloat(ticker.c); // Хамгийн сүүлийн үнэ
    const highest24h = parseFloat(ticker.h); // Сүүлийн 24 цагийн хамгийн өндөр үнэ
    const lowest24h = parseFloat(ticker.l); // Сүүлийн 24 цагийн хамгийн бага үнэ
    const dailyChange = parseFloat(ticker.P); // 24 цагийн үнийн % өөрчлөлт

    if (isNaN(price) || isNaN(highest24h) || isNaN(lowest24h) || isNaN(dailyChange)) {
      console.warn(`[TickerWS] Invalid data for ${symbol}:`, ticker);
      return;
    }

    const priceData: TickerPriceData = {
      symbol: symbol.toUpperCase(),
      price, // Хамгийн сүүлийн үнэ
      dailyChange, // 24 цагийн үнийн % өөрчлөлт
      highest24h, // Сүүлийн 24 цагийн хамгийн өндөр үнэ
      lowest24h, // Сүүлийн 24 цагийн хамгийн бага үнэ
      timestamp: ticker.E, // Үнэний шинэчлэгдсэн цаг
    };

    // Callback-уудыг дуудах
    callbacks.forEach((callback) => {
      try {
        callback(priceData);
      } catch (error) {
        console.error(`[TickerWS] Error in callback for ${symbol}:`, error);
      }
    });
  }

  /**
   * Batch reconnect логик: Олон symbol subscribe хийхэд нэг удаа reconnect хийх
   * Debounce ашиглаж, олон symbol subscribe хийхэд нэг удаа disconnect/connect хийх
   */
  private scheduleBatchReconnect() {
    // Хэрэв аль хэдийн pending reconnect байвал түүнийг цуцлах
    if (this.pendingReconnectTimer) {
      clearTimeout(this.pendingReconnectTimer);
    }

    // Reconnect attempts-ийг reset хийх (шинэ connection нээх тул)
    this.reconnectAttempts = 0;
    
    // Debounce: BATCH_RECONNECT_DELAY хүртэл хүлээгээд reconnect хийх
    this.pendingReconnectTimer = setTimeout(() => {
      this.pendingReconnectTimer = null;
      const symbolsToReconnect = Array.from(this.subscriptions.keys());
      
      if (symbolsToReconnect.length > 0) {
        // Connection-ийг дахин нээх (бүх symbol-уудыг багтаах)
        // Connection аль хэдийн нээгдсэн эсэхийг шалгах шаардлагагүй - дахин нээх хэрэгтэй
        this.disconnect();
        setTimeout(() => {
          if (this.subscriptions.size > 0) {
            this.connect();
          }
        }, 50);
      }
    }, this.BATCH_RECONNECT_DELAY);
  }

  /**
   * Exponential backoff-ийг ашиглан reconnection-ийг удирдах.
   * 시도 횟수에 상한을 두지 않는다 — 예전에는 10회 실패하면 영구히 포기해서 그
   * 탭의 가격이 그대로 멈춰버렸다. 지연 시간만 상한(30초)을 두고 구독이 남아 있는
   * 한 계속 재시도한다.
   */
  private handleReconnect() {
    if (this.subscriptions.size === 0) return;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.min(this.reconnectAttempts, 5),
      this.MAX_RECONNECT_DELAY_MS
    );

    this.reconnectTimer = setTimeout(() => {
      this.ws = null;
      this.connect();
    }, delay);
  }

  /**
   * WebSocket-ийг цэвэрлэх
   */
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.pendingReconnectTimer) {
      clearTimeout(this.pendingReconnectTimer);
      this.pendingReconnectTimer = null;
    }

    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }

    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }

  /**
   * WebSocket-ийг холбогдсон эсэхийг шалгах
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Subscription-уудын тоог авах
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }
}

/**
 * Public API: Симболд нэг websocket connection ашиглана - Singleton pattern
 */
export function subscribeTickerPrice(
  symbol: string,
  callback: TickerCallback
): () => void {
  const manager = BinanceTickerWebSocketManager.getInstance();
  return manager.subscribe(symbol, callback);
}

/**
 * Public API: WebSocket-ийг холбогдсон эсэхийг шалгах
 */
export function isTickerWsConnected(): boolean {
  const manager = BinanceTickerWebSocketManager.getInstance();
  return manager.isConnected();
}
