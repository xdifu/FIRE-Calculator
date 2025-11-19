
import React, { useState, useMemo, useEffect, useRef, useDeferredValue } from 'react';
import {
  Calculator, Sparkles, MapPin, AlertCircle, TrendingDown,
  TrendingUp, Wallet, Info, ArrowRight, BarChart3, PieChart, Layers
} from 'lucide-react';
import { FinancialParams, TrendPoint, CalculationResult } from './types';
import { calculateFIRE } from './utils/finance';
import { WealthDepletionChart, RetirementTrendChart, AccumulationChart } from './components/WealthChart';
import { getFinancialAdvice } from './services/geminiService';
import ReactMarkdown from 'react-markdown';
import TrendWorker from './workers/trend.worker?worker';
import CalcWorker from './workers/calc.worker?worker';

// --- UI Components ---

const RangeInput = ({
  label, value, min, max, step, onChange, unit = "", variant = "default"
}: {
  label: string; value: number; min: number; max: number; step: number; onChange: (val: number) => void; unit?: string; variant?: "default" | "indigo" | "emerald" | "rose"
}) => {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  const colors = {
    default: { text: 'text-slate-700', active: '#64748b' },
    indigo: { text: 'text-indigo-600', active: '#4f46e5' },
    emerald: { text: 'text-emerald-600', active: '#10b981' },
    rose: { text: 'text-rose-600', active: '#e11d48' },
  };
  const theme = colors[variant];

  return (
    <div className="mb-5 group select-none">
      <div className="flex justify-between items-center mb-2">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
        <div className="flex items-baseline gap-0.5">
          <span className={`text-lg font-mono font-bold ${theme.text}`}>{value}</span>
          <span className="text-xs font-medium text-slate-400">{unit}</span>
        </div>
      </div>
      <div className="relative w-full h-4 flex items-center cursor-pointer">
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full absolute z-20 opacity-0 h-full cursor-pointer"
        />
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden relative z-10">
          <div
            className="h-full rounded-full transition-all duration-100 ease-out"
            style={{ width: `${percentage}%`, background: theme.active }}
          />
        </div>
        <div
          className="absolute h-4 w-4 bg-white border border-slate-200 shadow-md rounded-full pointer-events-none transition-all duration-100 ease-out flex items-center justify-center z-10"
          style={{ left: `calc(${percentage}% - 8px)` }}
        >
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: theme.active }}></div>
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ label, value, subvalue, icon: Icon, colorClass = "bg-white", textClass = "text-slate-800" }: any) => (
  <div className={`${colorClass} p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-full transition-all hover:shadow-md`}>
    <div className="flex justify-between items-start mb-2">
      <span className={`text-[10px] font-bold uppercase tracking-widest ${textClass} opacity-60`}>{label}</span>
      {Icon && <Icon className={`w-4 h-4 ${textClass} opacity-40`} />}
    </div>
    <div>
      <div className={`text-2xl sm:text-3xl font-mono font-bold tracking-tighter ${textClass} mb-1`}>{value}</div>
      <div className={`text-xs font-medium ${textClass} opacity-60 leading-tight`}>{subvalue}</div>
    </div>
  </div>
);

// --- Main Application ---

const App: React.FC = () => {
  const [currentAge, setCurrentAge] = useState<number>(30);
  const [retirementAge, setRetirementAge] = useState<number>(45);
  const [deathAge] = useState<number>(90);
  const [monthlyExpense, setMonthlyExpense] = useState<number>(5000);
  const [inflationRate, setInflationRate] = useState<number>(3.0);
  const [investmentReturnRate, setInvestmentReturnRate] = useState<number>(5.0);

  // AI Modal
  const [aiAdvice, setAiAdvice] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [showAiModal, setShowAiModal] = useState<boolean>(false);

  // Worker State
  const [baseResult, setBaseResult] = useState<CalculationResult>(() => calculateFIRE({
    currentAge, retirementAge, deathAge, monthlyExpense, inflationRate, investmentReturnRate
  }, { includeTrend: false }));
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const workerRef = useRef<Worker | null>(null);
  const calcWorkerRef = useRef<Worker | null>(null);
  const lastTrendJob = useRef(0);
  const lastCalcJob = useRef(0);

  // Initialize Worker
  useEffect(() => {
    workerRef.current = new TrendWorker();
    calcWorkerRef.current = new CalcWorker();

    workerRef.current.onmessage = (e: MessageEvent<{ success: boolean; id: number; data?: TrendPoint[] }>) => {
      if (e.data.success && e.data.id === lastTrendJob.current && e.data.data) {
        setTrendData(e.data.data);
      }
    };

    calcWorkerRef.current.onmessage = (e: MessageEvent<{ success: boolean; id: number; data?: CalculationResult }>) => {
      if (e.data.success && e.data.id === lastCalcJob.current && e.data.data) {
        setBaseResult(e.data.data);
      }
    };

    return () => {
      workerRef.current?.terminate();
      calcWorkerRef.current?.terminate();
    };
  }, []);

  // 1. Immediate State (Driven by Sliders)
  const params: FinancialParams = useMemo(() => ({
    currentAge, retirementAge, deathAge, monthlyExpense, inflationRate, investmentReturnRate,
  }), [currentAge, retirementAge, deathAge, monthlyExpense, inflationRate, investmentReturnRate]);

  // 2. Deferred State (Driven by React Concurrent Features)
  // This allows the UI (sliders) to update instantly, while the heavy calculation/rendering
  // lags slightly behind in a non-blocking way.
  const deferredParams = useDeferredValue(params);
  const EMPTY_TREND: TrendPoint[] = useMemo(() => [], []); // Stable ref to avoid rerenders when trend not ready

  // Fast Calculation moved to worker (uses DEFERRED params for coalescing rapid moves)
  useEffect(() => {
    if (!calcWorkerRef.current) return;
    const jobId = ++lastCalcJob.current;
    calcWorkerRef.current.postMessage({ id: jobId, params: deferredParams });
  }, [deferredParams]);

  // Slow Calculation (Trend) - Worker Thread with job id guarding
  useEffect(() => {
    if (!workerRef.current) return;
    const jobId = ++lastTrendJob.current;
    workerRef.current.postMessage({ id: jobId, params: deferredParams });
  }, [deferredParams]);

  // Merge Results
  const result = useMemo(() => ({
    ...baseResult,
    trendData: trendData.length > 0 ? trendData : EMPTY_TREND
  }), [baseResult, trendData, EMPTY_TREND]);

  // Logic Check - Uses DEFERRED params to avoid jitter
  useEffect(() => {
    if (deferredParams.retirementAge <= deferredParams.currentAge) {
      setRetirementAge(deferredParams.currentAge + 1);
    }
  }, [deferredParams.currentAge, deferredParams.retirementAge]);

  const handleAiAnalysis = async () => {
    setIsAiLoading(true);
    setShowAiModal(true);
    try {
      const advice = await getFinancialAdvice(params, result.requiredWealthPV);
      setAiAdvice(advice);
    } catch (error) {
      setAiAdvice("无法获取 AI 建议。请确保已配置 API Key，并检查网络连接。");
      console.error(error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const formatCNY = (val: number) => {
    if (val > 100000000) return `${(val / 100000000).toFixed(2)}亿`;
    return `${(val / 10000).toFixed(0)}万`;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-500 selection:text-white pb-20">

      {/* --- Top Navigation / Branding --- */}
      <nav className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md bg-white/80">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-lg shadow-indigo-200">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-none">Chengdu FIRE Lab</h1>
            <p className="text-[10px] font-medium text-slate-400 tracking-wide uppercase">Financial Independence Research</p>
          </div>
        </div>
        <button
          onClick={handleAiAnalysis}
          className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full text-xs font-bold transition-colors border border-indigo-100"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI 顾问</span>
        </button>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* --- LEFT COLUMN: Inputs (The "Control Panel") --- */}
          <div className="lg:col-span-3 space-y-6">

            {/* Panel 1: Identity */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <MapPin className="w-3 h-3" /> 基础设定
              </h3>
              <RangeInput label="当前年龄" value={currentAge} min={20} max={60} step={1} onChange={setCurrentAge} unit="岁" variant="indigo" />
              <RangeInput label="目标退休" value={retirementAge} min={currentAge + 1} max={65} step={1} onChange={setRetirementAge} unit="岁" variant="indigo" />
              <div className="mt-6 pt-4 border-t border-slate-50">
                <div className="text-xs text-slate-500 flex justify-between mb-1"><span>工作年限</span> <span className="font-mono font-bold">{retirementAge - currentAge} 年</span></div>
                <div className="text-xs text-slate-500 flex justify-between"><span>退休时长</span> <span className="font-mono font-bold">{deathAge - retirementAge} 年</span></div>
              </div>
            </div>

            {/* Panel 2: Lifestyle */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Wallet className="w-3 h-3" /> 消费水平
              </h3>
              <RangeInput label="月支出 (现值)" value={monthlyExpense} min={2000} max={40000} step={500} onChange={setMonthlyExpense} unit="元" variant="rose" />
              <div className="bg-rose-50 rounded-lg p-3 mt-2 flex gap-2 items-start">
                <Info className="w-3.5 h-3.5 text-rose-500 mt-0.5 flex-shrink-0" />
                <p className="text-[10px] text-rose-700 leading-relaxed">
                  按照成都物价输入。系统会自动计算通胀，您只需关心现在的购买力。
                </p>
              </div>
            </div>

            {/* Panel 3: Market */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <BarChart3 className="w-3 h-3" /> 宏观假设
              </h3>
              <RangeInput label="长期年化回报" value={investmentReturnRate} min={0} max={12} step={0.5} onChange={setInvestmentReturnRate} unit="%" variant="emerald" />
              <RangeInput label="平均通胀率" value={inflationRate} min={0} max={8} step={0.5} onChange={setInflationRate} unit="%" variant="default" />
            </div>

          </div>

          {/* --- CENTER/RIGHT: Dashboard --- */}
          <div className="lg:col-span-9 space-y-6">

            {/* 1. KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <KPICard
                  label="FIRE 目标资产 (购买力)"
                  value={formatCNY(result.requiredWealthPV)}
                  subvalue="这是您今天需要拥有的“购买力”总额"
                  icon={Sparkles}
                  colorClass="bg-indigo-600"
                  textClass="text-white"
                />
              </div>
              <div className="md:col-span-1">
                <KPICard
                  label="名义目标 (账户余额)"
                  value={formatCNY(result.requiredWealth)}
                  subvalue={`${retirementAge}岁时，银行卡里显示的数字`}
                  icon={ArrowRight}
                />
              </div>
              <div className="md:col-span-1">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-100 h-full flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full blur-2xl"></div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 opacity-60">即刻行动</span>
                      <TrendingUp className="w-4 h-4 text-emerald-600 opacity-40" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tighter text-emerald-600 mb-1">
                      ¥{result.firstYearSavingsMonthly.toLocaleString()}
                    </div>
                    <div className="text-xs font-medium text-slate-500 opacity-80 leading-tight">
                      若现在资产为0，本月需存下金额 (假设薪资随经验增长)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. PRIMARY VISUALIZATION: The Accumulation Journey */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-500" />
                    财富积累路径
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">复利效应可视化：蓝色为本金投入，紫色为市场赠予的收益</p>
                </div>
                <div className="flex gap-4 text-xs">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"></div><span className="text-slate-600">本金投入</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-violet-500"></div><span className="text-slate-600">复利收益</span></div>
                </div>
              </div>
              <div className="p-6 bg-gradient-to-b from-white to-slate-50/50">
                <AccumulationChart data={result.accumulationData} />
              </div>
            </div>

            {/* 3. SECONDARY VISUALIZATIONS: Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Trend Analysis */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-50">
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-slate-500" />
                    退休年龄敏感度
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">晚退几年能少存多少？(点击图表快速切换)</p>
                </div>
                <div className="p-6 flex-1 relative">
                  <RetirementTrendChart
                    data={result.trendData}
                    currentRetirementAge={retirementAge}
                    onSelect={setRetirementAge}
                  />
                </div>
              </div>

              {/* Depletion Analysis */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-50">
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-emerald-500" />
                    退休资金消耗推演
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">安全边界测试：能否平稳支撑至 {deathAge} 岁？</p>
                </div>
                <div className="p-6 flex-1">
                  <WealthDepletionChart data={result.simulationData} retirementAge={retirementAge} />
                </div>
              </div>

            </div>

          </div>
        </div>
      </main>

      {/* AI Modal Overlay */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                AI 深度理财报告
              </h3>
              <button onClick={() => setShowAiModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 transition-colors">✕</button>
            </div>
            <div className="p-8 overflow-y-auto flex-1 custom-scrollbar prose prose-indigo prose-sm max-w-none">
              {isAiLoading ? (
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                  <div className="w-8 h-8 border-2 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                  <p className="text-slate-400 text-xs animate-pulse">正在构建金融模型...</p>
                </div>
              ) : (
                <ReactMarkdown>{aiAdvice}</ReactMarkdown>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
