import { memo } from 'react';
import { useNavigate } from "@/lib/navigation-compat";
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FAIcon } from '@/components/icons/FAIcon';
import { formatDistanceToNow } from 'date-fns';
import { enUS, ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useBilingualText } from '@/hooks/useBilingualText';
import { HistoryTableProps } from '@/types/alerts';

export const HistoryTable = memo(function HistoryTable({ cycles }: HistoryTableProps) {
  const navigate = useNavigate();
  const { isKo, locale, tr } = useBilingualText();
  const dateFnsLocale = isKo ? ko : enUS;

  // Board 원칙: 모든 항목은 클릭 가능해야 함 → Card(상세)로 연결
  const handleRowClick = (symbol: string, timestamp: string | number) => {
    navigate(`/xchart?symbol=${symbol}&ts=${timestamp}`);
  };
  if (cycles.length === 0) {
    return (
      <Card className="glass p-12 text-center">
        <p className="text-muted-foreground">{tr('최근 기록이 없습니다.', 'No recent history.')}</p>
      </Card>
    );
  }

  return (
    <Card className="glass overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{tr('구분', 'Type')}</TableHead>
            <TableHead>{tr('날짜', 'Date')}</TableHead>
            <TableHead>{tr('종목', 'Symbol')}</TableHead>
            <TableHead>{tr('방향', 'Side')}</TableHead>
            <TableHead className="text-right">{tr('가격/금액', 'Price/Amount')}</TableHead>
            <TableHead className="text-right">{tr('시간(상대)', 'Time (relative)')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cycles.map((cycle, idx) => (
            <>
              {/* Entry Row - 클릭하여 차트로 이동 */}
              <TableRow
                key={`${idx}-entry`}
                className="border-b-0 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleRowClick(cycle.entry.symbol, cycle.entry.ts)}
              >
                <TableCell>
                  <Badge variant="default" className="gap-1">
                    <FAIcon icon="arrow-trend-up" className="h-3 w-3" />
                    ENTRY
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(cycle.entry.ts).toLocaleDateString(locale)}
                </TableCell>
                <TableCell className="font-mono font-semibold">
                  {cycle.entry.symbol}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={cycle.entry.side === 'LONG' ? 'secondary' : 'destructive'}
                    className="text-xs"
                  >
                    {cycle.entry.side}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">
                  ${cycle.entry.price.toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(cycle.entry.ts), { 
                    addSuffix: true, 
                    locale: dateFnsLocale
                  })}
                </TableCell>
              </TableRow>

              {/* PnL Row - 클릭하여 차트로 이동 */}
              {cycle.pnl && (
                <TableRow
                  key={`${idx}-pnl`}
                  className="border-b-0 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
                   
                  onClick={() => handleRowClick(cycle.entry.symbol, cycle.pnl!.ts)}
                >
                  <TableCell>
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        'gap-1',
                        cycle.pnl.kind === 'PNL_PROFIT' ? 'bg-semantic-bull/10 text-semantic-bull' : 'bg-semantic-bear/10 text-semantic-bear'
                      )}
                    >
                      <FAIcon icon="dollar-sign" className="h-3 w-3" />
                      PnL
                    </Badge>
                  </TableCell>
                  <TableCell colSpan={3} className="text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{tr('수익/손실', 'Profit/Loss')}</span>
                      <Badge variant="secondary" className="text-xs">
                        {tr('수수료 제외', 'Fees excluded')}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className={cn(
                      'font-mono font-semibold',
                      cycle.pnl.kind === 'PNL_PROFIT' ? 'text-semantic-bull' : 'text-semantic-bear'
                    )}>
                      {cycle.pnl.abs > 0 ? '+' : ''}${cycle.pnl.abs.toFixed(2)}
                      <span className="text-sm ml-2">
                        ({(cycle.pnl.pct * 100).toFixed(2)}%)
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(cycle.pnl.ts), { 
                      addSuffix: true, 
                      locale: dateFnsLocale
                    })}
                  </TableCell>
                </TableRow>
              )}

              {/* Exit Row - 클릭하여 차트로 이동 */}
              {cycle.exit && (
                <TableRow
                  key={`${idx}-exit`}
                  className="border-b-2 border-border cursor-pointer hover:bg-muted/50 transition-colors"
                   
                  onClick={() => handleRowClick(cycle.exit!.symbol, cycle.exit!.ts)}
                >
                <TableCell>
                  <Badge variant="secondary" className="gap-1">
                    <FAIcon icon="arrow-trend-down" className="h-3 w-3" />
                    EXIT
                  </Badge>
                </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(cycle.exit.ts).toLocaleDateString(locale)}
                  </TableCell>
                  <TableCell className="font-mono font-semibold">
                    {cycle.exit.symbol}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={cycle.exit.side === 'LONG' ? 'secondary' : 'destructive'}
                      className="text-xs"
                    >
                      {cycle.exit.side}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    ${cycle.exit.price.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(cycle.exit.ts), { 
                      addSuffix: true, 
                      locale: dateFnsLocale
                    })}
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
});
