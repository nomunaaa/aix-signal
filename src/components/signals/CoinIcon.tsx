import { useState, useEffect } from "react";
import { getCryptoInitials } from "@/utils/crypto-icons";
import { getPublicSymbolIconCandidates, getSymbolIconBaseId } from "@/utils/symbolPublicIcon";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useCryptoIcons } from "@/contexts/CryptoIconContext";

interface CoinIconProps {
  symbol: string;
  size?: number;
  className?: string;
  iconUrl?: string; // Allow passing iconUrl directly for optimization
}

// Global cache: persistent across all components
const iconCache = new Map<string, string>();

// Promise cache: prevent duplicate requests
const fetchPromises = new Map<string, Promise<string | null>>();

export function CoinIcon({ symbol, size = 32, className = "", iconUrl: providedIconUrl }: CoinIconProps) {
  const { getIcon } = useCryptoIcons();
  const [error, setError] = useState(false);
  
  // Priority: provided iconUrl > context cache > memory cache
  const contextIcon = getIcon(symbol);
  const initialIcon = providedIconUrl || contextIcon || iconCache.get(symbol) || null;
  
  const [iconUrl, setIconUrl] = useState<string | null>(initialIcon);
  const [isLoading, setIsLoading] = useState(!initialIcon);

  useEffect(() => {
    // If we already have an icon from any source, use it
    if (providedIconUrl || contextIcon) {
      setIconUrl(providedIconUrl || contextIcon);
      setIsLoading(false);
      const iconToCache = providedIconUrl || contextIcon;
      if (iconToCache) {
        iconCache.set(symbol, iconToCache);
      }
      return;
    }

    // Already in memory cache
    if (iconCache.has(symbol)) {
      setIconUrl(iconCache.get(symbol) ?? null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const getCDNUrl = (sym: string) => {
      let base = getSymbolIconBaseId(sym).toLowerCase();
      if (base.startsWith('1000000')) base = base.slice(7);
      else if (base.startsWith('1000')) base = base.slice(4);
      return `https://assets.coincap.io/assets/icons/${base}@2x.png`;
    };

    const tryPublicThenCdn = () => {
      const candidates = [...getPublicSymbolIconCandidates(getSymbolIconBaseId(symbol))];
      const tryIdx = (idx: number) => {
        if (!isMounted) return;
        if (idx >= candidates.length) {
          const cdnUrl = getCDNUrl(symbol);
          const testImg = new Image();
          testImg.onload = () => {
            if (isMounted) {
              setIconUrl(cdnUrl);
              iconCache.set(symbol, cdnUrl);
              setIsLoading(false);
            }
          };
          testImg.onerror = () => void tryCdnFallback();
          testImg.src = cdnUrl;
          return;
        }
        const img = new Image();
        img.onload = () => {
          if (isMounted) {
            const url = candidates[idx];
            setIconUrl(url);
            iconCache.set(symbol, url);
            setIsLoading(false);
          }
        };
        img.onerror = () => tryIdx(idx + 1);
        img.src = candidates[idx];
      };
      tryIdx(0);
    };

    const tryCdnFallback = async () => {
      // CDN 실패 시 Supabase 캐시 조회
      try {
        if (fetchPromises.has(symbol)) {
          const url = await fetchPromises.get(symbol);
          if (isMounted && url) {
            setIconUrl(url);
            setIsLoading(false);
          }
          return;
        }

        const promise = (async () => {
          const { data: cached } = await supabase
            .from('crypto_icons')
            .select('icon_url')
            .eq('symbol', symbol)
            .single();

          if (cached?.icon_url) {
            iconCache.set(symbol, cached.icon_url);
            return cached.icon_url;
          }

          const { data: syncResult } = await supabase.functions.invoke('sync-crypto-icons', {
            body: { symbols: [symbol] }
          });

          const url = syncResult?.icons?.[0]?.icon_url || null;
          if (url) {
            iconCache.set(symbol, url);
          }
          return url;
        })();

        fetchPromises.set(symbol, promise);
        const url = await promise;
        fetchPromises.delete(symbol);

        if (isMounted && url) {
          setIconUrl(url);
        }
      } catch (err) {
        console.error(`Error loading icon for ${symbol}:`, err);
        fetchPromises.delete(symbol);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    tryPublicThenCdn();

    return () => {
      isMounted = false;
    };
  }, [symbol, providedIconUrl, contextIcon]);

  if (isLoading && !iconUrl) {
    return (
      <Skeleton 
        className="rounded-full flex-shrink-0" 
        style={{ width: size, height: size }}
      />
    );
  }

  if (error || !iconUrl) {
    return (
      <div 
        className={`rounded-full bg-muted flex items-center justify-center flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
        aria-label={`${symbol} 아이콘`}
      >
        <span className="text-xs font-bold text-foreground">
          {getCryptoInitials(symbol)}
        </span>
      </div>
    );
  }

  return (
    <div 
      className={`rounded-full overflow-hidden flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={iconUrl}
        alt={symbol}
        width={size}
        height={size}
        onError={() => setError(true)}
        className="w-full h-full object-cover"
        loading="lazy"
        aria-hidden="true"
      />
    </div>
  );
}
