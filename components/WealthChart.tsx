import React, { memo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  LineChart, Line, Legend, ComposedChart, Bar
} from 'recharts';
import { SimulationYear, TrendPoint, AccumulationPoint } from '../types';

const formatCurrencyShort = (value: number) => `${(value / 10000).toFixed(0)}w`;

// --- Shared Glass Tooltip ---
const GlassTooltip = ({ active, payload, label, title, items }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-panel !p-4 !rounded-2xl !border-white/50 min-w-[180px] z-50 animate-in fade-in zoom-in-95 duration-200">
        <p className="font-heading font-bold text-slate-800 mb-3 border-b border-slate-200/50 pb-2 flex justify-between">
          <span>{title ? title(label) : `${label} 岁`}</span>
        </p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: entry.color, color: entry.color }} />
                <span className="text-slate-500 text-xs font-medium">{entry.name}</span>
              </div>
              <span className="font-mono font-bold text-slate-800">
                {entry.value > 10000
                  ? `¥${(entry.value / 10000).toFixed(1)}w`
                  : `¥${entry.value?.toLocaleString()}`}
              </span>
            </div>
          ))}
          {items && items(payload[0].payload)}
        </div>
      </div>
    );
  }
  return null;
};

// --- 1. Retirement Phase: Depletion Chart ---
const WealthDepletionChartComponent: React.FC<{ data: SimulationYear[]; retirementAge: number }> = ({ data, retirementAge }) => {
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
            tickFormatter={formatCurrencyShort}
            tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 500, fontFamily: 'JetBrains Mono' }}
            tickLine={false} axisLine={false}
          />
          <Tooltip content={<GlassTooltip />} cursor={{ stroke: '#14B8A6', strokeWidth: 1.5, strokeDasharray: '4 4', strokeOpacity: 0.5 }} />

          <ReferenceLine x={retirementAge} stroke="#F59E0B" strokeDasharray="3 3" label={{ value: '退休点', fill: '#F59E0B', fontSize: 10, position: 'insideTopRight', fontWeight: 'bold', fontFamily: 'Outfit' }} />

          <Area
            type="monotone"
            dataKey="portfolioStart"
            stroke="#14B8A6"
            strokeWidth={3}
            fill="url(#gradPortfolio)"
            name="资产余额"
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
            label={{ value: '退休年龄', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#CBD5E1' }}
          />
          <YAxis
            yAxisId="left"
            stroke="#94A3B8"
            tickFormatter={formatCurrencyShort}
            tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 500, fontFamily: 'JetBrains Mono' }}
            tickLine={false} axisLine={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#94A3B8"
            tickFormatter={(v) => `¥${v / 1000}k`}
            tick={{ fontSize: 10, fill: '#8B5CF6', fontWeight: 500, fontFamily: 'JetBrains Mono' }}
            tickLine={false} axisLine={false}
            hide={false}
          />
          <Tooltip
            content={
              <GlassTooltip
                title={(val: number) => `${val}岁退休`}
                items={(item: TrendPoint) => (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <p className="text-[10px] text-wisdom-400 mb-1 font-bold uppercase tracking-wider font-heading">每月需储蓄压力:</p>
                    <p className="text-lg font-mono text-wisdom-600 font-bold">¥{item.savingsPressure?.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400 mt-2 italic">点击图表切换方案</p>
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
            name="目标资产(购买力)"
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
            name="每月存钱压力 (右轴)"
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
            tickFormatter={formatCurrencyShort}
            tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 500, fontFamily: 'JetBrains Mono' }}
            tickLine={false} axisLine={false}
          />
          <Tooltip
            content={
              <GlassTooltip
                items={(item: AccumulationPoint) => (
                  item.salaryGrowthRate > 0 ?
                    <div className="text-[10px] text-growth-600 font-medium mt-1 bg-growth-50 px-2 py-1 rounded-lg inline-block">
                      当前阶段薪资实际增长: +{item.salaryGrowthRate.toFixed(1)}% /年
                    </div> : null
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
            name="本金投入"
            animationDuration={1000}
          />
          <Area
            type="monotone"
            dataKey="totalInterest"
            stackId="1"
            stroke="#8B5CF6"
            strokeWidth={2}
            fill="url(#gradInterest)"
            name="复利收益"
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const AccumulationChart = memo(AccumulationChartComponent);
