import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CryptoIconContextType {
  icons: Record<string, string>;
  isLoading: boolean;
  preloadIcons: (symbols: string[]) => Promise<void>;
  getIcon: (symbol: string) => string | null;
}

const CryptoIconContext = createContext<CryptoIconContextType | undefined>(undefined);

// In-memory cache (persistent across components)
const globalIconCache = new Map<string, string>();
const pendingRequests = new Map<string, Promise<void>>();

export const CryptoIconProvider = ({ children }: { children: ReactNode }) => {
  const [icons, setIcons] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Initialize from global cache
  useEffect(() => {
    const initialIcons: Record<string, string> = {};
    globalIconCache.forEach((url, symbol) => {
      initialIcons[symbol] = url;
    });
    setIcons(initialIcons);
  }, []);

  const preloadIcons = async (symbols: string[]) => {
    if (symbols.length === 0) {
      console.warn('[CryptoIconContext] No symbols to preload');
      return;
    }

    console.warn('[CryptoIconContext] Preload requested for:', symbols);
    console.warn('[CryptoIconContext] Already cached:', Array.from(globalIconCache.keys()));

    // Filter out already cached symbols
    const uncachedSymbols = symbols.filter(s => !globalIconCache.has(s));
    if (uncachedSymbols.length === 0) {
      console.warn('[CryptoIconContext] All symbols already cached');
      return;
    }

    console.warn('[CryptoIconContext] Fetching uncached symbols:', uncachedSymbols);

    // Check if already loading
    const requestKey = uncachedSymbols.sort().join(',');
    if (pendingRequests.has(requestKey)) {
      await pendingRequests.get(requestKey);
      return;
    }

    setIsLoading(true);

    const loadPromise = (async () => {
      try {
        // Batch fetch from database
        const { data: cachedIcons, error } = await supabase
          .from('crypto_icons')
          .select('symbol, icon_url')
          .in('symbol', uncachedSymbols);

        if (error) throw error;

        const newIcons: Record<string, string> = {};
        const foundSymbols = new Set<string>();

        if (cachedIcons) {
          console.warn('[CryptoIconContext] Found in DB:', cachedIcons.length, 'icons');
          cachedIcons.forEach((icon) => {
            globalIconCache.set(icon.symbol, icon.icon_url);
            newIcons[icon.symbol] = icon.icon_url;
            foundSymbols.add(icon.symbol);
          });
        }

        // Find symbols not in database and sync them
        const missingSymbols = uncachedSymbols.filter(s => !foundSymbols.has(s));
        
        if (missingSymbols.length > 0) {
          console.warn('[CryptoIconContext] Syncing missing symbols:', missingSymbols);
          const { data: syncResult, error: syncError } = await supabase.functions.invoke('sync-crypto-icons', {
            body: { symbols: missingSymbols }
          });

          if (syncError) {
            console.error('[CryptoIconContext] Sync failed:', syncError);
          } else if (syncResult?.icons) {
            console.warn('[CryptoIconContext] Synced:', syncResult.icons.length, 'icons');
            syncResult.icons.forEach((icon: { symbol: string; icon_url: string }) => {
              globalIconCache.set(icon.symbol, icon.icon_url);
              newIcons[icon.symbol] = icon.icon_url;
            });
          }
        }

        // Update state
        console.warn('[CryptoIconContext] Preload complete. Total icons loaded:', Object.keys(newIcons).length);
        setIcons(prev => ({ ...prev, ...newIcons }));
      } catch (error) {
        console.error('[CryptoIconContext] Error preloading crypto icons:', error);
      } finally {
        setIsLoading(false);
        pendingRequests.delete(requestKey);
      }
    })();

    pendingRequests.set(requestKey, loadPromise);
    await loadPromise;
  };

  const getIcon = (symbol: string): string | null => {
    return globalIconCache.get(symbol) || icons[symbol] || null;
  };

  return (
    <CryptoIconContext.Provider value={{ icons, isLoading, preloadIcons, getIcon }}>
      {children}
    </CryptoIconContext.Provider>
  );
};

 
export const useCryptoIcons = () => {
  const context = useContext(CryptoIconContext);
  if (!context) {
    throw new Error('useCryptoIcons must be used within CryptoIconProvider');
  }
  return context;
};
