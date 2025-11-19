
import React from 'react';
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
      <div className="bg-slate-900/90 backdrop-blur-md p-4 border border-slate-700/50 shadow-2xl rounded-xl text-sm text-slate-50 min-w-[180px] z-50">
        <p className="font-bold text-slate-300 mb-3 border-b border-slate-700/50 pb-2 flex justify-between">
          <span>{title ? title(label) : `${label} 岁`}</span>
        </p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-slate-400 text-xs">{entry.name}</span>
              </div>
              <span className="font-mono font-medium text-white">
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
export const WealthDepletionChart: React.FC<{ data: SimulationYear[]; retirementAge: number }> = ({ data, retirementAge }) => {
  return (
    <div className="h-[320px] w-full select-none">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 0, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="gradPortfolio" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="age" 
            stroke="#94a3b8" 
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false} axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis 
            stroke="#94a3b8" 
            tickFormatter={formatCurrencyShort}
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false} axisLine={false}
          />
          <Tooltip content={<GlassTooltip />} cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '4 4' }} />
          
          <ReferenceLine x={retirementAge} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: '退休点', fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }} />
          
          <Area
            type="monotone"
            dataKey="portfolioStart"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#gradPortfolio)"
            name="资产余额"
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// --- 2. Sensitivity: Trend Chart ---
export const RetirementTrendChart: React.FC<{ data: TrendPoint[]; currentRetirementAge: number; onSelect: (val: number) => void }> = ({ data, currentRetirementAge, onSelect }) => {
  return (
    <div className="h-[320px] w-full select-none cursor-crosshair">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 10, left: -10, bottom: 0 }}
          onClick={(e) => e?.activeLabel && onSelect(Number(e.activeLabel))}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="retirementAge" 
            stroke="#94a3b8" 
            tick={{ fontSize: 10 }} 
            tickLine={false} axisLine={false}
            label={{ value: '退休年龄', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#94a3b8' }}
          />
          <YAxis 
            yAxisId="left"
            stroke="#94a3b8" 
            tickFormatter={formatCurrencyShort}
            tick={{ fontSize: 10 }} 
            tickLine={false} axisLine={false}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            stroke="#94a3b8" 
            tickFormatter={(v) => `¥${v/1000}k`}
            tick={{ fontSize: 10, fill: '#818cf8' }} 
            tickLine={false} axisLine={false}
            hide={false}
          />
          <Tooltip 
            content={
              <GlassTooltip 
                title={(val: number) => `${val}岁退休`} 
                items={(item: TrendPoint) => (
                  <div className="mt-2 pt-2 border-t border-slate-700/50">
                    <p className="text-[10px] text-indigo-300 mb-1">每月需储蓄压力:</p>
                    <p className="text-lg font-mono text-indigo-400 font-bold">¥{item.savingsPressure?.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-500 mt-2 italic">点击图表切换方案</p>
                  </div>
                )}
              />
            } 
          />
          <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }}/>
          
          <ReferenceLine x={currentRetirementAge} stroke="#f59e0b" strokeWidth={2} strokeDasharray="3 3" />

          <Line
            yAxisId="left"
            type="monotone"
            dataKey="requiredWealthPV"
            stroke="#334155"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, fill: '#334155' }}
            name="目标资产(购买力)"
            animationDuration={800}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="savingsPressure"
            stroke="#818cf8"
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

// --- 3. Accumulation: Stacked Growth Chart ---
export const AccumulationChart: React.FC<{ data: AccumulationPoint[] }> = ({ data }) => {
  return (
    <div className="h-[320px] w-full select-none">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 0, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="gradInterest" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.2} />
            </linearGradient>
            <linearGradient id="gradPrincipal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="age" 
            stroke="#94a3b8" 
            tick={{ fontSize: 10 }} 
            tickLine={false} axisLine={false}
          />
          <YAxis 
            stroke="#94a3b8" 
            tickFormatter={formatCurrencyShort}
            tick={{ fontSize: 10 }} 
            tickLine={false} axisLine={false}
          />
          <Tooltip 
            content={
              <GlassTooltip 
                items={(item: AccumulationPoint) => (
                   item.salaryGrowthRate > 0 ? 
                   <div className="text-[10px] text-emerald-400 mt-1">
                     当前阶段薪资实际增长: +{item.salaryGrowthRate.toFixed(1)}% /年
                   </div> : null
                )}
              />
            } 
          />
          <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }}/>
          
          <Area
            type="monotone"
            dataKey="totalPrincipal"
            stackId="1"
            stroke="#3b82f6"
            fill="url(#gradPrincipal)"
            name="本金投入"
            animationDuration={1000}
          />
          <Area
            type="monotone"
            dataKey="totalInterest"
            stackId="1"
            stroke="#8b5cf6"
            fill="url(#gradInterest)"
            name="复利收益"
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
