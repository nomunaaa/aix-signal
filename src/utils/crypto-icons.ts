import { useState, useEffect } from 'react';

// Fallback CDN for cryptocurrency icons
const CDN_BASE = 'https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/';
const FALLBACK_CDN = 'https://cryptologos.cc/logos/'; // 백업 CDN

const ICON_MAP: Record<string, string> = {
  'BTCUSDT': 'btc.svg',
  'ETHUSDT': 'eth.svg',
  'SOLUSDT': 'sol.svg',
  'BNBUSDT': 'bnb.svg',
  'XRPUSDT': 'xrp.svg',
  'ADAUSDT': 'ada.svg',
  'DOGEUSDT': 'doge.svg',
  'DOTUSDT': 'dot.svg',
  'MATICUSDT': 'matic.svg',
  'LTCUSDT': 'ltc.svg',
  'AVAXUSDT': 'avax.svg',
  'LINKUSDT': 'link.svg',
  'ATOMUSDT': 'atom.svg',
  'UNIUSDT': 'uni.svg',
  'XLMUSDT': 'xlm.svg',
  'TRXUSDT': 'trx.svg',
  'ETCUSDT': 'etc.svg',
  'NEARUSDT': 'near.svg',
  'AAVEUSDT': 'aave.svg',
  'ALGOUSDT': 'algo.svg',
  'FILUSDT': 'fil.svg',
  'VETUSDT': 'vet.svg',
  'ICPUSDT': 'icp.svg',
  'APTUSDT': 'apt.svg',
  'LDOUSDT': 'ldo.svg',
  'ARBUSDT': 'arb.svg',
  'OPUSDT': 'op.svg',
  'INJUSDT': 'inj.svg',
  'STXUSDT': 'stx.svg',
  'SUIUSDT': 'sui.svg',
};

// 개선된 아이콘 URL 생성 함수
export const getCryptoIconUrl = (symbol: string): string => {
  const icon = ICON_MAP[symbol];
  return icon ? `${CDN_BASE}${icon}` : '';
};

// 아이콘 로딩 실패 시 폴백 URL 생성
export const getCryptoIconFallback = (symbol: string): string => {
  const baseSymbol = symbol.replace('USDT', '').toLowerCase();
  return `${FALLBACK_CDN}${baseSymbol}-${baseSymbol}-logo.svg`;
};

// 아이콘 로딩 상태를 관리하는 훅
export const useCryptoIcon = (symbol: string) => {
  const [iconUrl, setIconUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const loadIcon = async () => {
      setIsLoading(true);
      setHasError(false);
      
      const primaryUrl = getCryptoIconUrl(symbol);
      if (!primaryUrl) {
        setHasError(true);
        setIsLoading(false);
        return;
      }

      try {
        // 이미지 로딩 테스트
        const img = new Image();
        img.onload = () => {
          setIconUrl(primaryUrl);
          setIsLoading(false);
        };
        img.onerror = () => {
          // 기본 CDN 실패 시 폴백 CDN 시도
          const fallbackUrl = getCryptoIconFallback(symbol);
          const fallbackImg = new Image();
          fallbackImg.onload = () => {
            setIconUrl(fallbackUrl);
            setIsLoading(false);
          };
          fallbackImg.onerror = () => {
            setHasError(true);
            setIsLoading(false);
          };
          fallbackImg.src = fallbackUrl;
        };
        img.src = primaryUrl;
      } catch {
        setHasError(true);
        setIsLoading(false);
      }
    };

    loadIcon();
  }, [symbol]);

  return { iconUrl, isLoading, hasError };
};

export const getCryptoInitials = (symbol: string): string => {
  return symbol.replace('USDT', '').slice(0, 3);
};
