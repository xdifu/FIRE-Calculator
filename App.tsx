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
import { Slider } from './components/ui/Slider';
import { Card, KPICard } from './components/ui/Card';

// --- Control Panel (Memoized) ---
const ControlPanel = memo(({
  uiParams, updateUI, commitParams
}: {
  uiParams: FinancialParams;
  updateUI: (key: keyof FinancialParams, val: number) => void;
  commitParams: (key: keyof FinancialParams, val: number) => void;
}) => {
  return (
    <div className="lg:col-span-3 space-y-6">
      {/* Panel 1: Identity */}
      <Card variant="default" className="animate-in slide-in-from-left-4 duration-500 fill-mode-backwards delay-100">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2 font-heading">
          <MapPin className="w-3.5 h-3.5 text-wisdom-400" /> 基础设定
        </h3>
        <Slider
          label="当前年龄" value={uiParams.currentAge} min={20} max={60} step={1} unit="岁" variant="wisdom"
          onChange={(v) => updateUI('currentAge', v)}
          onCommit={(v) => commitParams('currentAge', v)}
        />
        <Slider
          label="目标退休" value={uiParams.retirementAge} min={uiParams.currentAge + 1} max={65} step={1} unit="岁" variant="wisdom"
          onChange={(v) => updateUI('retirementAge', v)}
          onCommit={(v) => commitParams('retirementAge', v)}
        />
        <div className="mt-6 pt-4 border-t border-slate-100/50">
          <div className="text-xs text-slate-500 flex justify-between mb-2"><span>工作年限</span> <span className="font-mono font-bold text-slate-700">{uiParams.retirementAge - uiParams.currentAge} 年</span></div>
          <div className="text-xs text-slate-500 flex justify-between"><span>退休时长</span> <span className="font-mono font-bold text-slate-700">{uiParams.deathAge - uiParams.retirementAge} 年</span></div>
        </div>
      </Card>

      {/* Panel 2: Lifestyle */}
      <Card variant="default" className="animate-in slide-in-from-left-4 duration-500 fill-mode-backwards delay-200">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2 font-heading">
          <Wallet className="w-3.5 h-3.5 text-life-400" /> 消费水平
        </h3>
        <Slider
          label="月支出 (现值)" value={uiParams.monthlyExpense} min={2000} max={40000} step={500} unit="元" variant="life"
          onChange={(v) => updateUI('monthlyExpense', v)}
          onCommit={(v) => commitParams('monthlyExpense', v)}
        />
        <div className="bg-life-50/50 border border-life-100 rounded-xl p-3 mt-2 flex gap-3 items-start">
          <Info className="w-4 h-4 text-life-500 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-life-600/80 leading-relaxed">
            请输入您当前的月度支出。系统会自动计算通胀，您只需关心现在的购买力。
          </p>
        </div>
      </Card>

      {/* Panel 3: Market */}
      <Card variant="default" className="animate-in slide-in-from-left-4 duration-500 fill-mode-backwards delay-300">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2 font-heading">
          <BarChart3 className="w-3.5 h-3.5 text-growth-400" /> 宏观假设
        </h3>
        <Slider
          label="长期年化回报" value={uiParams.investmentReturnRate} min={0} max={12} step={0.5} unit="%" variant="growth"
          onChange={(v) => updateUI('investmentReturnRate', v)}
          onCommit={(v) => commitParams('investmentReturnRate', v)}
        />
        <Slider
          label="平均通胀率" value={uiParams.inflationRate} min={0} max={8} step={0.5} unit="%" variant="default"
          onChange={(v) => updateUI('inflationRate', v)}
          onCommit={(v) => commitParams('inflationRate', v)}
        />
      </Card>
    </div>
  );
});

// --- Dashboard Component (Memoized) ---
const Dashboard = memo(({ result, retirementAge, deathAge, setRetirementAge, formatCNY }: any) => {
  return (
    <div className="lg:col-span-9 space-y-8">
      {/* 1. KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 animate-in zoom-in-95 duration-500 delay-100 fill-mode-backwards">
          <KPICard
            label="FIRE 目标资产 (购买力)"
            value={formatCNY(result.requiredWealthPV)}
            subvalue="这是您今天需要拥有的“购买力”总额"
            icon={Sparkles}
            variant="wisdom"
          />
        </div>
        <div className="md:col-span-1 animate-in zoom-in-95 duration-500 delay-200 fill-mode-backwards">
          <KPICard
            label="名义目标 (账户余额)"
            value={formatCNY(result.requiredWealth)}
            subvalue={`${retirementAge}岁时，银行卡里显示的数字`}
            icon={ArrowRight}
            variant="default"
          />
        </div>
        <div className="md:col-span-1 animate-in zoom-in-95 duration-500 delay-300 fill-mode-backwards">
          <div className="glass-panel p-6 rounded-3xl h-full flex flex-col justify-between relative overflow-hidden group hover:shadow-xl transition-all duration-500">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-growth-400/10 rounded-full blur-3xl group-hover:bg-growth-400/20 transition-colors"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-growth-600/70 font-heading">即刻行动</span>
                <TrendingUp className="w-4 h-4 text-growth-600/60" />
              </div>
              <div className="text-3xl font-mono font-bold tracking-tighter text-growth-600 mb-1">
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
      <Card className="animate-in fade-in-50 slide-in-from-bottom-4 duration-700 delay-300 fill-mode-backwards">
        <div className="border-b border-slate-100/50 pb-6 mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 font-heading">
              <div className="p-1.5 bg-wisdom-50 text-wisdom-600 rounded-lg">
                <Layers className="w-4 h-4" />
              </div>
              财富积累路径
            </h2>
            <p className="text-xs text-slate-500 mt-1 ml-9">复利效应可视化：蓝色为本金投入，紫色为市场赠予的收益</p>
          </div>
          <div className="flex gap-4 text-xs bg-slate-50/50 px-3 py-1.5 rounded-full border border-slate-100">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-growth-400 shadow-[0_0_8px_rgba(45,212,191,0.5)]"></div><span className="text-slate-600 font-medium">本金投入</span></div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-wisdom-400 shadow-[0_0_8px_rgba(167,139,250,0.5)]"></div><span className="text-slate-600 font-medium">复利收益</span></div>
          </div>
        </div>
        <div className="h-[320px]">
          <AccumulationChart data={result.accumulationData} />
        </div>
      </Card>

      {/* 3. SECONDARY VISUALIZATIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Trend Analysis */}
        <Card className="flex flex-col animate-in fade-in-50 slide-in-from-bottom-4 duration-700 delay-400 fill-mode-backwards">
          <div className="border-b border-slate-100/50 pb-6 mb-6">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 font-heading">
              <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
                <TrendingDown className="w-4 h-4" />
              </div>
              退休年龄敏感度
            </h2>
            <p className="text-xs text-slate-500 mt-1 ml-9">晚退几年能少存多少？(点击图表快速切换)</p>
          </div>
          <div className="flex-1 relative h-[320px]">
            <RetirementTrendChart
              data={result.trendData}
              currentRetirementAge={retirementAge}
              onSelect={setRetirementAge}
            />
          </div>
        </Card>

        {/* Depletion Analysis */}
        <Card className="flex flex-col animate-in fade-in-50 slide-in-from-bottom-4 duration-700 delay-500 fill-mode-backwards">
          <div className="border-b border-slate-100/50 pb-6 mb-6">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 font-heading">
              <div className="p-1.5 bg-growth-50 text-growth-600 rounded-lg">
                <PieChart className="w-4 h-4" />
              </div>
              退休资金消耗推演
            </h2>
            <p className="text-xs text-slate-500 mt-1 ml-9">安全边界测试：能否平稳支撑至 {deathAge} 岁？</p>
          </div>
          <div className="flex-1 h-[320px]">
            <WealthDepletionChart data={result.simulationData} retirementAge={retirementAge} />
          </div>
        </Card>

      </div>
    </div>
  );
});

// --- Main Application ---

const App: React.FC = () => {
  // 1. Split State: UI (Immediate) vs Committed (Calculation)
  const [uiParams, setUiParams] = useState<FinancialParams>({
    currentAge: 30,
    retirementAge: 45,
    deathAge: 90,
    monthlyExpense: 5000,
    inflationRate: 3.0,
    investmentReturnRate: 5.0
  });

  const [committedParams, setCommittedParams] = useState<FinancialParams>(uiParams);

  // Helpers to update state
  const updateUI = (key: keyof FinancialParams, val: number) => {
    setUiParams(prev => ({ ...prev, [key]: val }));
  };

  const commitParams = (key: keyof FinancialParams, val: number) => {
    // Update UI one last time to ensure sync (e.g. if snapped)
    setUiParams(prev => ({ ...prev, [key]: val }));
    // Commit for calculation
    React.startTransition(() => {
      setCommittedParams(prev => ({ ...prev, [key]: val }));
    });
  };

  // Special handler for Trend Chart click (which is a commit action)
  const handleTrendSelect = (age: number) => {
    updateUI('retirementAge', age);
    commitParams('retirementAge', age);
  };

  // AI Modal
  const [aiAdvice, setAiAdvice] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [showAiModal, setShowAiModal] = useState<boolean>(false);

  // Worker State
  const [baseResult, setBaseResult] = useState<CalculationResult>(() => calculateFIRE(committedParams, { includeTrend: false }));
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

  // 2. Deferred State (Driven by Committed Params)
  // We defer the committed params so that even if commit happens frequently (e.g. throttled),
  // the worker dispatch is lower priority than UI updates.
  const deferredCommittedParams = useDeferredValue(committedParams);
  const EMPTY_TREND: TrendPoint[] = useMemo(() => [], []);

  // Dispatch Jobs (Depends on Committed Params)
  useEffect(() => {
    if (!calcWorkerRef.current || !trendWorkerRef.current) return;

    // Fast Calculation
    const calcJobId = ++lastCalcJob.current;
    calcWorkerRef.current.postMessage({ id: calcJobId, params: deferredCommittedParams });

    // Slow Calculation (Trend)
    const trendJobId = ++lastTrendJob.current;
    trendWorkerRef.current.postMessage({ id: trendJobId, params: deferredCommittedParams });

  }, [deferredCommittedParams]);

  // Merge Results
  const result = useMemo(() => ({
    ...baseResult,
    trendData: trendData.length > 0 ? trendData : EMPTY_TREND
  }), [baseResult, trendData, EMPTY_TREND]);

  // Logic Check (Only on commit)
  useEffect(() => {
    if (committedParams.retirementAge <= committedParams.currentAge) {
      // If logic violation, force update both
      const newRetirementAge = committedParams.currentAge + 1;
      updateUI('retirementAge', newRetirementAge);
      // We don't call commitParams here to avoid infinite loop, just set state directly if needed
      // But actually, we should just let the next render handle it or force it now.
      // Let's just correct the UI and Committed state.
      setCommittedParams(prev => ({ ...prev, retirementAge: newRetirementAge }));
    }
  }, [committedParams.currentAge, committedParams.retirementAge]);

  const handleAiAnalysis = async () => {
    setIsAiLoading(true);
    setShowAiModal(true);
    try {
      const advice = await getFinancialAdvice(committedParams, result.requiredWealthPV);
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
    <div className="min-h-screen font-sans text-slate-900 selection:bg-wisdom-500 selection:text-white pb-20 relative overflow-x-hidden">

      {/* --- Ambient Background --- */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        {/* Mesh Gradient Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-wisdom-400/20 blur-[120px] mix-blend-multiply animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-growth-400/20 blur-[120px] mix-blend-multiply animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[50%] h-[50%] rounded-full bg-life-400/20 blur-[120px] mix-blend-multiply animate-blob animation-delay-4000"></div>

        {/* Glass Overlay for Depth */}
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[80px]"></div>
      </div>

      {/* --- Top Navigation --- */}
      <nav className="sticky top-4 z-40 mx-4 sm:mx-6 lg:mx-8 mb-8">
        <div className="max-w-7xl mx-auto glass-panel !rounded-2xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-wisdom-500 to-wisdom-700 text-white p-2 rounded-xl shadow-lg shadow-wisdom-500/20">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-none font-heading">FIRE Lab</h1>
              <p className="text-[10px] font-medium text-slate-500 tracking-wide uppercase mt-0.5">Financial Independence Research</p>
            </div>
          </div>
          <button
            onClick={handleAiAnalysis}
            className="group flex items-center gap-2 bg-white hover:bg-wisdom-50 text-slate-600 hover:text-wisdom-600 px-4 py-2 rounded-full text-xs font-bold transition-all border border-slate-200 hover:border-wisdom-200 shadow-sm hover:shadow-md"
          >
            <Sparkles className="w-3.5 h-3.5 transition-transform group-hover:scale-110 group-hover:text-wisdom-500" />
            <span>AI 顾问</span>
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* --- LEFT COLUMN: Inputs (Control Panel) --- */}
          <ControlPanel
            uiParams={uiParams}
            updateUI={updateUI}
            commitParams={commitParams}
          />

          {/* --- CENTER/RIGHT: Dashboard --- */}
          <Dashboard
            result={result}
            retirementAge={committedParams.retirementAge}
            deathAge={committedParams.deathAge}
            setRetirementAge={handleTrendSelect}
            formatCNY={formatCNY}
          />

        </div>
      </main>

      {/* AI Modal Overlay */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm transition-all animate-in fade-in duration-200">
          <div className="glass-panel !bg-white/90 !rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl shadow-wisdom-500/20 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg font-heading">
                <div className="p-1.5 bg-wisdom-100 text-wisdom-600 rounded-lg">
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
                    <div className="w-12 h-12 border-4 border-wisdom-100 border-t-wisdom-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-wisdom-500 animate-pulse" />
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
