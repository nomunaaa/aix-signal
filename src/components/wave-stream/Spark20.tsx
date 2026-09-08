/**
 * Spark20 - ECharts 20px Sparkline Component
 * Performance: lightweight, responsive
 * Migrated from AMCharts to ECharts
 */

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { SparkDataPoint } from './types';
import { quietMotionTokens } from '@/theme/quiet-motion';

interface Spark20Props {
  data: SparkDataPoint[];
  height?: number;
  color?: string;
  markerColor?: {
    entry?: string;
    exit?: string;
    switch?: string;
  };
  className?: string;
}

export function Spark20({
  data,
  height = 20,
  color = quietMotionTokens.color.state.flow,
  markerColor = {
    entry: quietMotionTokens.color.state.flow,
    exit: '#EF4444',
    switch: quietMotionTokens.color.state.caution,
  },
  className,
}: Spark20Props) {
  const chartOptions: echarts.EChartsOption = useMemo(() => {
    // Process data for line series
    const lineData = data.map((point) => [
      new Date(point.t).getTime(),
      point.v,
    ]);

    // Process markers
    const markers = data
      .filter((point) => point.marker)
      .map((point) => ({
        coord: [new Date(point.t).getTime(), point.v],
        symbol: 'circle',
        symbolSize: 4,
        itemStyle: {
          color: markerColor[point.marker as keyof typeof markerColor] || color,
        },
      }));

    return {
      grid: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      },
      xAxis: {
        type: 'time',
        show: false,
      },
      yAxis: {
        type: 'value',
        show: false,
        scale: true,
      },
      series: [
        {
          type: 'line',
          data: lineData,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: color,
            width: 1.5,
          },
          markPoint: markers.length > 0 ? {
             
            data: markers as any,
            animation: false,
          } : undefined,
        },
      ],
      animation: false,
    };
  }, [data, color, markerColor]);

  if (!data || data.length < 2) {
    return (
      <div
        className={className}
        style={{
          width: '100%',
          height: `${height}px`,
          minHeight: `${height}px`,
        }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        width: '100%',
        height: `${height}px`,
        minHeight: `${height}px`,
      }}
      aria-hidden="true"
    >
      <ReactECharts
        option={chartOptions}
        style={{ height: '100%', width: '100%' }}
        opts={{ renderer: 'canvas' }}
        notMerge={true}
      />
    </div>
  );
}
