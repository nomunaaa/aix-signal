import { FAIcon } from '@/components/icons/FAIcon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HistoryFiltersProps, HistoryFilters as HistoryFiltersType } from '@/types/alerts';
import { useBilingualText } from '@/hooks/useBilingualText';
import { memo } from 'react';

export const HistoryFilters = memo(function HistoryFilters({
  filters,
  onFiltersChange,
  onExportCSV,
}: HistoryFiltersProps) {
  const { tr } = useBilingualText();

  return (
    <Card className="glass p-6">
      <div className="grid md:grid-cols-4 gap-4 mb-4">
        <div className="space-y-2">
          <Label>{tr('기간', 'Period')}</Label>
          <Select
            value={filters.range}
            onValueChange={(value) => onFiltersChange({ ...filters, range: value as HistoryFiltersType['range'] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">{tr('24시간', '24 hours')}</SelectItem>
              <SelectItem value="7d">{tr('7일', '7 days')}</SelectItem>
              <SelectItem value="1m">{tr('1개월', '1 month')}</SelectItem>
              <SelectItem value="3m">{tr('3개월', '3 months')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{tr('방향', 'Side')}</Label>
          <Select
            value={filters.side}
            onValueChange={(value) => onFiltersChange({ ...filters, side: value as HistoryFiltersType['side'] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BOTH">{tr('전체', 'All')}</SelectItem>
              <SelectItem value="LONG">{tr('롱', 'Long')}</SelectItem>
              <SelectItem value="SHORT">{tr('숏', 'Short')}</SelectItem>
            </SelectContent>
          </Select>
        </div>



        <div className="flex items-end">
          <Button onClick={onExportCSV} variant="outline" className="w-full gap-2">
            <FAIcon icon="download" className="h-4 w-4" />
            {tr('CSV 내보내기', 'Export CSV')}
          </Button>
        </div>
      </div>
    </Card>
  );
});
