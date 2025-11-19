export type Locale = 'zh' | 'en';
export type Region = 'CN' | 'AU';

export interface Translation {
    app: {
        title: string;
        subtitle: string;
        aiAdvisor: string;
        analyzing: string;
    };
    control: {
        identity: string;
        lifestyle: string;
        market: string;
        currentAge: string;
        retirementAge: string;
        monthlyExpense: string;
        monthlyExpenseDesc: string;
        investmentReturn: string;
        inflation: string;
        superBalance: string; // AU specific
        superContribution: string; // AU specific
        wageGrowth: string;
    };
    dashboard: {
        targetWealth: string;
        targetWealthDesc: string;
        nominalTarget: string;
        nominalTargetDesc: string;
        immediateAction: string;
        immediateActionDesc: string;
        accumulationPath: string;
        accumulationDesc: string;
        trendAnalysis: string;
        trendDesc: string;
        depletionAnalysis: string;
        depletionDesc: string;
        principal: string;
        interest: string;
    };
    units: {
        age: string;
        currency: string;
        currencySymbol: string;
    };
}

export const zh: Translation = {
    app: {
        title: "FIRE Lab",
        subtitle: "财务自由实验室",
        aiAdvisor: "AI 顾问",
        analyzing: "正在构建专属金融模型...",
    },
    control: {
        identity: "基础设定",
        lifestyle: "生活方式",
        market: "宏观假设",
        currentAge: "当前年龄",
        retirementAge: "目标退休",
        monthlyExpense: "月支出 (现值)",
        monthlyExpenseDesc: "请输入您当前的月度支出。系统会自动计算通胀，您只需关心现在的购买力。",
        investmentReturn: "长期年化回报",
        inflation: "平均通胀率",
        superBalance: "养老金余额 (Super)",
        superContribution: "养老金缴纳率 (SG)",
        wageGrowth: "薪资增长",
    },
    dashboard: {
        targetWealth: "FIRE 目标资产 (购买力)",
        targetWealthDesc: "这是您今天需要拥有的“购买力”总额",
        nominalTarget: "名义目标 (账户余额)",
        nominalTargetDesc: "退休时，银行卡里显示的数字",
        immediateAction: "即刻行动",
        immediateActionDesc: "若现在资产为0，本月需存下金额",
        accumulationPath: "财富积累路径",
        accumulationDesc: "复利效应可视化：蓝色为本金投入，紫色为市场赠予的收益",
        trendAnalysis: "退休年龄敏感度",
        trendDesc: "晚退几年能少存多少？(点击图表快速切换)",
        depletionAnalysis: "退休资金消耗推演",
        depletionDesc: "安全边界测试：能否平稳支撑至预期寿命？",
        principal: "本金投入",
        interest: "复利收益",
    },
    units: {
        age: "岁",
        currency: "元",
        currencySymbol: "¥",
    },
};

export const en: Translation = {
    app: {
        title: "FIRE Lab",
        subtitle: "Financial Independence Research",
        aiAdvisor: "AI Advisor",
        analyzing: "Building your financial model...",
    },
    control: {
        identity: "Identity",
        lifestyle: "Lifestyle",
        market: "Market Assumptions",
        currentAge: "Current Age",
        retirementAge: "Retirement Age",
        monthlyExpense: "Monthly Expense (PV)",
        monthlyExpenseDesc: "Enter current monthly expense. Inflation is handled automatically.",
        investmentReturn: "Annual Return",
        inflation: "Inflation Rate",
        superBalance: "Super Balance",
        superContribution: "Super Guarantee %",
        wageGrowth: "Wage Growth",
    },
    dashboard: {
        targetWealth: "FIRE Target (Purchasing Power)",
        targetWealthDesc: "Total purchasing power needed in today's value",
        nominalTarget: "Nominal Target",
        nominalTargetDesc: "The number in your bank account at retirement",
        immediateAction: "Immediate Action",
        immediateActionDesc: "Monthly savings needed starting today",
        accumulationPath: "Wealth Accumulation Path",
        accumulationDesc: "Visualizing compound interest: Blue is principal, Purple is market return",
        trendAnalysis: "Retirement Age Sensitivity",
        trendDesc: "How much less to save if you retire later?",
        depletionAnalysis: "Wealth Depletion Simulation",
        depletionDesc: "Safety test: Will your money last until life expectancy?",
        principal: "Principal",
        interest: "Interest",
    },
    units: {
        age: "y.o.",
        currency: "AUD",
        currencySymbol: "$",
    },
};
