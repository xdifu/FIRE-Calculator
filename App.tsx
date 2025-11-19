
import React, { useState, useMemo, useEffect, useRef, useDeferredValue, memo } from 'react';
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

// --- UI Components (Memoized) ---

const RangeInput = memo(({
  label, value, min, max, step, onChange, unit = "", variant = "default"
}: {
  label: string; value: number; min: number; max: number; step: number; onChange: (val: number) => void; unit?: string; variant?: "default" | "indigo" | "emerald" | "rose"
}) => {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  const colors = {
    default: { text: 'text-slate-700', active: 'bg-slate-600', shadow: 'shadow-slate-500/30' },
    indigo: { text: 'text-indigo-600', active: 'bg-indigo-600', shadow: 'shadow-indigo-500/30' },
    emerald: { text: 'text-emerald-600', active: 'bg-emerald-600', shadow: 'shadow-emerald-500/30' },
    rose: { text: 'text-rose-600', active: 'bg-rose-600', shadow: 'shadow-rose-500/30' },
  };
  const theme = colors[variant];

  return (
    <div className="mb-6 group select-none" style={{ touchAction: 'none' }}>
      <div className="flex justify-between items-end mb-3">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest transition-colors group-hover:text-slate-600">{label}</label>
        <div className="flex items-baseline gap-1">
          <span className={`text-xl font-mono font-bold tracking-tight ${theme.text}`}>{value}</span>
          <span className="text-xs font-medium text-slate-400">{unit}</span>
        </div>
      </div>
      <div className="relative w-full h-6 flex items-center cursor-pointer">
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full absolute z-20 opacity-0 h-full cursor-pointer"
        />
        {/* Track Background */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden relative z-10">
          {/* Active Track */}
          <div
            className={`h-full rounded-full transition-all duration-100 ease-out ${theme.active}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {/* Thumb */}
        <div
          className={`absolute h-5 w-5 bg-white border-2 border-white ${theme.shadow} shadow-lg rounded-full pointer-events-none transition-all duration-100 ease-out flex items-center justify-center z-10`}
          style={{ left: `calc(${percentage}% - 10px)` }}
        >
          <div className={`w-2 h-2 rounded-full ${theme.active}`}></div>
        </div>
      </div>
    </div>
  );
});

const KPICard = memo(({ label, value, subvalue, icon: Icon, colorClass = "bg-white/60 backdrop-blur-md", textClass = "text-slate-800" }: any) => (
  <div className={`${colorClass} p-6 rounded-3xl shadow-sm border border-white/50 flex flex-col justify-between h-full transition-all hover:shadow-lg hover:-translate-y-1 duration-300`}>
    <div className="flex justify-between items-start mb-4">
      <span className={`text-[10px] font-bold uppercase tracking-widest ${textClass} opacity-70`}>{label}</span>
      {Icon && <Icon className={`w-5 h-5 ${textClass} opacity-50`} />}
    </div>
    <div>
      <div className={`text-3xl sm:text-4xl font-mono font-bold tracking-tighter ${textClass} mb-2`}>{value}</div>
      <div className={`text-xs font-medium ${textClass} opacity-70 leading-relaxed`}>{subvalue}</div>
    </div>
  </div>
));

// --- Control Panel (Memoized to prevent re-renders of unchanged inputs) ---
const ControlPanel = memo(({
  currentAge, setCurrentAge,
  retirementAge, setRetirementAge,
  deathAge,
  monthlyExpense, setMonthlyExpense,
  investmentReturnRate, setInvestmentReturnRate,
  inflationRate, setInflationRate
}: any) => {
  return (
    <div className="lg:col-span-3 space-y-6">
      {/* Panel 1: Identity */}
      <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-sm border border-white/50 p-6 transition-all hover:shadow-md">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-indigo-400" /> 基础设定
        </h3>
        <RangeInput label="当前年龄" value={currentAge} min={20} max={60} step={1} onChange={setCurrentAge} unit="岁" variant="indigo" />
        <RangeInput label="目标退休" value={retirementAge} min={currentAge + 1} max={65} step={1} onChange={setRetirementAge} unit="岁" variant="indigo" />
        <div className="mt-6 pt-4 border-t border-slate-100/50">
          <div className="text-xs text-slate-500 flex justify-between mb-2"><span>工作年限</span> <span className="font-mono font-bold text-slate-700">{retirementAge - currentAge} 年</span></div>
          <div className="text-xs text-slate-500 flex justify-between"><span>退休时长</span> <span className="font-mono font-bold text-slate-700">{deathAge - retirementAge} 年</span></div>
        </div>
      </div>

      {/* Panel 2: Lifestyle */}
      <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-sm border border-white/50 p-6 transition-all hover:shadow-md">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
          <Wallet className="w-3.5 h-3.5 text-rose-400" /> 消费水平
        </h3>
        <RangeInput label="月支出 (现值)" value={monthlyExpense} min={2000} max={40000} step={500} onChange={setMonthlyExpense} unit="元" variant="rose" />
        <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3 mt-2 flex gap-3 items-start">
          <Info className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-rose-700/80 leading-relaxed">
            按照成都物价输入。系统会自动计算通胀，您只需关心现在的购买力。
          </p>
        </div>
      </div>

      {/* Panel 3: Market */}
      <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-sm border border-white/50 p-6 transition-all hover:shadow-md">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5 text-emerald-400" /> 宏观假设
        </h3>
        <RangeInput label="长期年化回报" value={investmentReturnRate} min={0} max={12} step={0.5} onChange={setInvestmentReturnRate} unit="%" variant="emerald" />
        <RangeInput label="平均通胀率" value={inflationRate} min={0} max={8} step={0.5} onChange={setInflationRate} unit="%" variant="default" />
      </div>
    </div>
  );
});

// --- Dashboard Component (Memoized) ---
const Dashboard = memo(({ result, retirementAge, deathAge, setRetirementAge, formatCNY }: any) => {
  return (
    <div className="lg:col-span-9 space-y-8">
      {/* 1. KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <KPICard
            label="FIRE 目标资产 (购买力)"
            value={formatCNY(result.requiredWealthPV)}
            subvalue="这是您今天需要拥有的“购买力”总额"
            icon={Sparkles}
            colorClass="bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-xl shadow-indigo-500/20"
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
          <div className="bg-white/60 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white/50 h-full flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-emerald-400/10 rounded-full blur-3xl group-hover:bg-emerald-400/20 transition-colors"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-800/70">即刻行动</span>
                <TrendingUp className="w-4 h-4 text-emerald-600/60" />
              </div>
              <div className="text-3xl font-mono font-bold tracking-tighter text-emerald-600 mb-1">
                ¥{result.firstYearSavingsMonthly.toLocaleString()}
              </div>
              <div className="text-xs font-medium text-slate-500 leading-relaxed">
                若现在资产为0，本月需存下金额 <br />(假设薪资随经验增长)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PRIMARY VISUALIZATION */}
      <div className="bg-white/60 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 overflow-hidden transition-all hover:shadow-md">
        <div className="p-6 border-b border-slate-100/50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                <Layers className="w-4 h-4" />
              </div>
              财富积累路径
            </h2>
            <p className="text-xs text-slate-500 mt-1 ml-9">复利效应可视化：蓝色为本金投入，紫色为市场赠予的收益</p>
          </div>
          <div className="flex gap-4 text-xs bg-slate-50/50 px-3 py-1.5 rounded-full border border-slate-100">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div><span className="text-slate-600 font-medium">本金投入</span></div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]"></div><span className="text-slate-600 font-medium">复利收益</span></div>
          </div>
        </div>
        <div className="p-6">
          <AccumulationChart data={result.accumulationData} />
        </div>
      </div>

      {/* 3. SECONDARY VISUALIZATIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Trend Analysis */}
        <div className="bg-white/60 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 overflow-hidden flex flex-col transition-all hover:shadow-md">
          <div className="p-6 border-b border-slate-100/50">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
                <TrendingDown className="w-4 h-4" />
              </div>
              退休年龄敏感度
            </h2>
            <p className="text-xs text-slate-500 mt-1 ml-9">晚退几年能少存多少？(点击图表快速切换)</p>
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
        <div className="bg-white/60 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 overflow-hidden flex flex-col transition-all hover:shadow-md">
          <div className="p-6 border-b border-slate-100/50">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                <PieChart className="w-4 h-4" />
              </div>
              退休资金消耗推演
            </h2>
            <p className="text-xs text-slate-500 mt-1 ml-9">安全边界测试：能否平稳支撑至 {deathAge} 岁？</p>
          </div>
          <div className="p-6 flex-1">
            <WealthDepletionChart data={result.simulationData} retirementAge={retirementAge} />
          </div>
        </div>

      </div>
    </div>
  );
});

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

  // Persistent Workers
  const calcWorkerRef = useRef<Worker | null>(null);
  const trendWorkerRef = useRef<Worker | null>(null);
  const lastCalcJob = useRef(0);
  const lastTrendJob = useRef(0);

  // Initialize Workers Once
  useEffect(() => {
    calcWorkerRef.current = new CalcWorker();
    calcWorkerRef.current.onmessage = (e: MessageEvent<{ success: boolean; id: number; data?: CalculationResult }>) => {
      if (e.data.success && e.data.id === lastCalcJob.current && e.data.data) {
        setBaseResult(e.data.data);
      }
    };

    trendWorkerRef.current = new TrendWorker();
    trendWorkerRef.current.onmessage = (e: MessageEvent<{ success: boolean; id: number; data?: TrendPoint[] }>) => {
      if (e.data.success && e.data.id === lastTrendJob.current && e.data.data) {
        setTrendData(e.data.data);
      }
    };

    return () => {
      calcWorkerRef.current?.terminate();
      trendWorkerRef.current?.terminate();
    };
  }, []);

  // 1. Immediate State (Driven by Sliders)
  const params: FinancialParams = useMemo(() => ({
    currentAge, retirementAge, deathAge, monthlyExpense, inflationRate, investmentReturnRate,
  }), [currentAge, retirementAge, deathAge, monthlyExpense, inflationRate, investmentReturnRate]);

  // 2. Deferred State (Driven by React Concurrent Features)
  const deferredParams = useDeferredValue(params);
  const EMPTY_TREND: TrendPoint[] = useMemo(() => [], []);

  // Dispatch Jobs
  useEffect(() => {
    if (!calcWorkerRef.current || !trendWorkerRef.current) return;

    // Fast Calculation
    const calcJobId = ++lastCalcJob.current;
    calcWorkerRef.current.postMessage({ id: calcJobId, params: deferredParams });

    // Slow Calculation (Trend)
    const trendJobId = ++lastTrendJob.current;
    trendWorkerRef.current.postMessage({ id: trendJobId, params: deferredParams });

  }, [deferredParams]);

  // Merge Results
  const result = useMemo(() => ({
    ...baseResult,
    trendData: trendData.length > 0 ? trendData : EMPTY_TREND
  }), [baseResult, trendData, EMPTY_TREND]);

  // Logic Check
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
    <div className="min-h-screen font-sans text-slate-900 selection:bg-indigo-500 selection:text-white pb-20 relative overflow-x-hidden">
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>

      {/* --- Ambient Background --- */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400/20 blur-[120px] mix-blend-multiply animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-400/20 blur-[120px] mix-blend-multiply animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[40%] h-[40%] rounded-full bg-pink-400/20 blur-[120px] mix-blend-multiply animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 bg-slate-50/60 backdrop-blur-[100px]"></div>
      </div>

      {/* --- Top Navigation --- */}
      <nav className="sticky top-4 z-40 mx-4 sm:mx-6 lg:mx-8 mb-8">
        <div className="max-w-7xl mx-auto bg-white/70 backdrop-blur-xl border border-white/40 shadow-sm rounded-2xl px-4 sm:px-6 h-16 flex items-center justify-between transition-all hover:shadow-md hover:bg-white/80">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-500/20">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-none">Chengdu FIRE Lab</h1>
              <p className="text-[10px] font-medium text-slate-500 tracking-wide uppercase mt-0.5">Financial Independence Research</p>
            </div>
          </div>
          <button
            onClick={handleAiAnalysis}
            className="group flex items-center gap-2 bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 px-4 py-2 rounded-full text-xs font-bold transition-all border border-slate-200 hover:border-indigo-200 shadow-sm hover:shadow"
          >
            <Sparkles className="w-3.5 h-3.5 transition-transform group-hover:scale-110 group-hover:text-indigo-500" />
            <span>AI 顾问</span>
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* --- LEFT COLUMN: Inputs (Control Panel) --- */}
          <ControlPanel
            currentAge={currentAge} setCurrentAge={setCurrentAge}
            retirementAge={retirementAge} setRetirementAge={setRetirementAge}
            deathAge={deathAge}
            monthlyExpense={monthlyExpense} setMonthlyExpense={setMonthlyExpense}
            investmentReturnRate={investmentReturnRate} setInvestmentReturnRate={setInvestmentReturnRate}
            inflationRate={inflationRate} setInflationRate={setInflationRate}
          />

          {/* --- CENTER/RIGHT: Dashboard --- */}
          <Dashboard
            result={result}
            retirementAge={retirementAge}
            deathAge={deathAge}
            setRetirementAge={setRetirementAge}
            formatCNY={formatCNY}
          />

        </div>
      </main>

      {/* AI Modal Overlay */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm transition-all">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl shadow-indigo-500/20 overflow-hidden animate-in zoom-in-95 duration-300 border border-white/50">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                  <Sparkles className="w-4 h-4" />
                </div>
                AI 深度理财报告
              </h3>
              <button onClick={() => setShowAiModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors">✕</button>
            </div>
            <div className="p-8 overflow-y-auto flex-1 custom-scrollbar prose prose-indigo prose-sm max-w-none">
              {isAiLoading ? (
                <div className="flex flex-col items-center justify-center h-64 space-y-6">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                    </div>
                  </div>
                  <p className="text-slate-500 text-sm font-medium animate-pulse">正在构建专属金融模型...</p>
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
