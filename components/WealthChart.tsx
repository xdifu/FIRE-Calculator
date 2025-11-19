import React, { memo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  LineChart, Line, Legend, ComposedChart, Bar
} from 'recharts';
import { SimulationYear, TrendPoint, AccumulationPoint } from '../types';
import { useLocale } from '../contexts/LocaleContext';
import { formatCurrencyCompact, formatCurrencyLong } from '../utils/format';

const formatTemplate = (template: string, params: Record<string, string | number>) => {
  return Object.entries(params).reduce((acc, [key, val]) => {
    const regex = new RegExp(`{{\s*${key}\s*}}`, 'g');
    return acc.replace(regex, String(val));
  }, template);
};

interface GlassTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string | number;
  labelFormatter?: (label?: string | number) => string;
  extraContent?: (data: any) => React.ReactNode;
}

// --- Shared Glass Tooltip ---
const GlassTooltip: React.FC<GlassTooltipProps> = ({ active, payload, label, labelFormatter, extraContent }) => {
  const { t, locale, region } = useLocale();
  if (!active || !payload || payload.length === 0) return null;

  const resolvedLabel = labelFormatter
    ? labelFormatter(label)
    : formatTemplate(t.charts.tooltipAge, { age: label ?? '--' });
  const currencySymbol = t.units.currencySymbol;

  return (
    <div className="glass-panel !p-4 !rounded-2xl !border-white/50 min-w-[180px] z-50 animate-in fade-in zoom-in-95 duration-200">
      <p className="font-heading font-bold text-slate-800 mb-3 border-b border-slate-200/50 pb-2 flex justify-between">
        <span>{resolvedLabel}</span>
      </p>
      <div className="space-y-2">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: entry.color, color: entry.color }} />
              <span className="text-slate-500 text-xs font-medium">{entry.name}</span>
            </div>
            <span className="font-mono font-bold text-slate-800">
              {formatCurrencyLong(entry.value ?? 0, locale, region, currencySymbol)}
            </span>
          </div>
        ))}
        {extraContent && extraContent(payload[0]?.payload)}
      </div>
    </div>
  );
};

// --- 1. Retirement Phase: Depletion Chart ---
const WealthDepletionChartComponent: React.FC<{ data: SimulationYear[]; retirementAge: number }> = ({ data, retirementAge }) => {
  const { t, locale, region } = useLocale();
  const currencySymbol = t.units.currencySymbol;
  const axisFormatter = (value: number) => formatCurrencyCompact(value, locale, region, currencySymbol);

  return (
    <div className="h-[320px] w-full select-none">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 0, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="gradPortfolio" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#14B8A6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" strokeOpacity={0.4} />
          <XAxis
            dataKey="age"
            stroke="#94A3B8"
            tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 500, fontFamily: 'JetBrains Mono' }}
            tickLine={false} axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="#94A3B8"
            tickFormatter={axisFormatter}
            tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 500, fontFamily: 'JetBrains Mono' }}
            tickLine={false} axisLine={false}
          />
          <Tooltip content={<GlassTooltip />} cursor={{ stroke: '#14B8A6', strokeWidth: 1.5, strokeDasharray: '4 4', strokeOpacity: 0.5 }} />

          <ReferenceLine x={retirementAge} stroke="#F59E0B" strokeDasharray="3 3" label={{ value: t.charts.retirementMarker, fill: '#F59E0B', fontSize: 10, position: 'insideTopRight', fontWeight: 'bold', fontFamily: 'Outfit' }} />

          <Area
            type="monotone"
            dataKey="portfolioStart"
            stroke="#14B8A6"
            strokeWidth={3}
            fill="url(#gradPortfolio)"
            name={t.charts.assetBalance}
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const WealthDepletionChart = memo(WealthDepletionChartComponent);

// --- 2. Sensitivity: Trend Chart ---
const RetirementTrendChartComponent: React.FC<{ data: TrendPoint[]; currentRetirementAge: number; onSelect: (val: number) => void }> = ({ data, currentRetirementAge, onSelect }) => {
  const { t, locale, region } = useLocale();
  const currencySymbol = t.units.currencySymbol;
  const axisFormatter = (value: number) => formatCurrencyCompact(value, locale, region, currencySymbol);
  const punctuation = locale === 'zh' ? '：' : ':';

  return (
    <div className="h-[320px] w-full select-none cursor-crosshair">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 10, left: -10, bottom: 20 }}
          onClick={(e) => e?.activeLabel && onSelect(Number(e.activeLabel))}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" strokeOpacity={0.4} />
          <XAxis
            dataKey="retirementAge"
            stroke="#94A3B8"
            tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 500, fontFamily: 'JetBrains Mono' }}
            tickLine={false} axisLine={false}
            label={{ value: t.charts.retirementAgeAxis, position: 'insideBottom', offset: -5, fontSize: 10, fill: '#CBD5E1' }}
          />
          <YAxis
            yAxisId="left"
            stroke="#94A3B8"
            tickFormatter={axisFormatter}
            tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 500, fontFamily: 'JetBrains Mono' }}
            tickLine={false} axisLine={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#94A3B8"
            tickFormatter={axisFormatter}
            tick={{ fontSize: 10, fill: '#8B5CF6', fontWeight: 500, fontFamily: 'JetBrains Mono' }}
            tickLine={false} axisLine={false}
            hide={false}
          />
          <Tooltip
            content={
              <GlassTooltip
                labelFormatter={(val?: number | string) => formatTemplate(t.charts.retireAt, { age: val ?? '--' })}
                extraContent={(item: TrendPoint) => (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <p className="text-[10px] text-wisdom-400 mb-1 font-bold uppercase tracking-wider font-heading">{`${t.charts.savingsPressureTitle}${punctuation}`}</p>
                    <p className="text-lg font-mono text-wisdom-600 font-bold">{formatCurrencyLong(item.savingsPressure, locale, region, currencySymbol)}</p>
                    <p className="text-[10px] text-slate-400 mt-2 italic">{t.charts.clickToSwitch}</p>
                  </div>
                )}
              />
            }
            cursor={{ stroke: '#8B5CF6', strokeWidth: 1, strokeOpacity: 0.2 }}
          />
          <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', fontWeight: 500, color: '#64748B', fontFamily: 'Outfit' }} />

          <ReferenceLine x={currentRetirementAge} stroke="#F59E0B" strokeWidth={2} strokeDasharray="3 3" />

          <Line
            yAxisId="left"
            type="monotone"
            dataKey="requiredWealthPV"
            stroke="#64748B"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, fill: '#64748B', stroke: '#fff', strokeWidth: 2 }}
            name={t.dashboard.targetWealth}
            animationDuration={800}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="savingsPressure"
            stroke="#8B5CF6"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            name={t.charts.savingsPressureLegend}
            animationDuration={800}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export const RetirementTrendChart = memo(RetirementTrendChartComponent);

// --- 3. Accumulation: Stacked Growth Chart ---
const AccumulationChartComponent: React.FC<{ data: AccumulationPoint[] }> = ({ data }) => {
  const { t, locale, region } = useLocale();
  const currencySymbol = t.units.currencySymbol;
  const axisFormatter = (value: number) => formatCurrencyCompact(value, locale, region, currencySymbol);

  return (
    <div className="h-[320px] w-full select-none">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 0, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="gradInterest" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="gradPrincipal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2DD4BF" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#2DD4BF" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" strokeOpacity={0.4} />
          <XAxis
            dataKey="age"
            stroke="#94A3B8"
            tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 500, fontFamily: 'JetBrains Mono' }}
            tickLine={false} axisLine={false}
          />
          <YAxis
            stroke="#94A3B8"
            tickFormatter={axisFormatter}
            tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 500, fontFamily: 'JetBrains Mono' }}
            tickLine={false} axisLine={false}
          />
          <Tooltip
            content={
              <GlassTooltip
                extraContent={(item: AccumulationPoint) => (
                  item.salaryGrowthRate > 0 ? (
                    <div className="text-[10px] text-growth-600 font-medium mt-1 bg-growth-50 px-2 py-1 rounded-lg inline-block">
                      {formatTemplate(t.charts.salaryGrowthNote, { rate: item.salaryGrowthRate.toFixed(1) })}
                    </div>
                  ) : null
                )}
              />
            }
            cursor={{ stroke: '#8B5CF6', strokeWidth: 1, strokeOpacity: 0.2 }}
          />
          <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', fontWeight: 500, color: '#64748B', fontFamily: 'Outfit' }} />

          <Area
            type="monotone"
            dataKey="totalPrincipal"
            stackId="1"
            stroke="#2DD4BF"
            strokeWidth={2}
            fill="url(#gradPrincipal)"
            name={t.dashboard.principal}
            animationDuration={1000}
          />
          <Area
            type="monotone"
            dataKey="totalInterest"
            stackId="1"
            stroke="#8B5CF6"
            strokeWidth={2}
            fill="url(#gradInterest)"
            name={t.dashboard.interest}
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const AccumulationChart = memo(AccumulationChartComponent);
