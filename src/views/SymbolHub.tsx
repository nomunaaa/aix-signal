'use client';

/**
 * /signals/:symbol — 종목 상세 (REB-212)
 * UI 조합은 `SymbolDetailPage` — 본 파일은 라우트 전용 얇은 래퍼(CLAUDE.md PART 22).
 */
import { useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useNavigate } from '@/lib/navigation-compat';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getAllowedSymbols } from '@/config/symbols';
import { SymbolDetailPage } from '@/components/symbol-detail/SymbolDetailPage';
import { normalizeSymbolParam } from '@/lib/symbol-detail/normalize-symbol';

export default function SymbolHub() {
  const params = useParams();
  const navigate = useNavigate();
  const { subscription, isLoading } = useAuth();
  const rawParam = params?.symbol;
  const raw = Array.isArray(rawParam) ? rawParam[0] : rawParam;
  const symbol = typeof raw === 'string' ? normalizeSymbolParam(raw) : null;
  const allowedSymbols = useMemo(
    () => getAllowedSymbols(subscription.plan),
    [subscription.plan],
  );

  useEffect(() => {
    if (raw !== undefined && !symbol) {
      navigate('/signals', { replace: true });
    }
  }, [raw, symbol, navigate]);

  if (!symbol) {
    return null;
  }

  if (isLoading) {
    return null;
  }

  if (!allowedSymbols.includes(symbol)) {
    return (
      <div className="container mx-auto flex min-h-[420px] flex-col items-center justify-center px-4 text-center">
        <p className="text-sm font-semibold text-foreground">Upgrade required</p>
        <p className="mt-2 max-w-sm text-xs text-muted-foreground">
          Your current plan does not include this symbol. Choose Pro to view symbol details.
        </p>
        <Button className="mt-4" onClick={() => navigate('/pricing')}>
          View plans
        </Button>
      </div>
    );
  }

  return <SymbolDetailPage symbol={symbol} />;
}
