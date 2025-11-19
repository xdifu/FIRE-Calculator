import { FinancialParams, CalculationResult, SimulationYear, TrendPoint, AccumulationPoint } from '../types';

/**
 * REALISTIC CAREER WAGE GROWTH MODEL (Tier 1 Cities)
 * Represents "Real" growth above inflation.
 */
const getRealWageGrowthRate = (age: number): number => {
  if (age < 25) return 0.08; // Junior: Rapid skill acquisition
  if (age < 30) return 0.06; // Senior: Establishing core value
  if (age < 35) return 0.04; // Expert: High earning, slower growth
  if (age < 45) return 0.01; // Mid-Life Plateau: Keeping up with inflation + slight merit
  return 0.00;               // 45+: Stagnation / Defense phase (High risk of flat real income)
};

// --- MAIN ENTRY POINT ---
export const calculateFIRE = (params: FinancialParams, options: { includeTrend?: boolean, region?: 'CN' | 'AU' } = { includeTrend: true, region: 'CN' }): CalculationResult => {
  if (options.region === 'AU') {
    return calculateFIRE_AU(params, options);
  }
  return calculateFIRE_CN(params, options);
};

// --- CHINA STRATEGY (Original) ---
const calculateFIRE_CN = (params: FinancialParams, options: { includeTrend?: boolean }): CalculationResult => {
  const { currentAge, retirementAge, deathAge, monthlyExpense, inflationRate, investmentReturnRate } = params;

  // 1. Decumulation
  const { nominal: requiredWealth, pv: requiredWealthPV, simulation } = calculateRetirementNeeds(
    currentAge, retirementAge, deathAge, monthlyExpense, inflationRate, investmentReturnRate
  );

  // 2. Accumulation
  const { initialMonthlySavings, accumulationData, success } = calculateAccumulationPath(
    currentAge, retirementAge, requiredWealth, inflationRate, investmentReturnRate
  );

  // 3. Trend
  const trendData = options.includeTrend ? calculateTrendAnalysis(
    currentAge, deathAge, monthlyExpense, inflationRate, investmentReturnRate, 'CN'
  ) : [];

  return {
    requiredWealth: Math.round(requiredWealth),
    requiredWealthPV: Math.round(requiredWealthPV),
    firstYearSavingsMonthly: Math.round(initialMonthlySavings),
    simulationData: simulation,
    accumulationData,
    trendData,
    fireSuccess: success
  };
};

// --- AUSTRALIA STRATEGY (Superannuation) ---
const calculateFIRE_AU = (params: FinancialParams, options: { includeTrend?: boolean }): CalculationResult => {
  const {
    currentAge, retirementAge, deathAge, monthlyExpense, inflationRate, investmentReturnRate,
    superBalance = 0
  } = params;

  const PRESERVATION_AGE = 60;

  // --- Phase 1: Decumulation Needs ---
  // We need to survive from Retirement -> Death.
  // But we have two pots: Liquid (Outside) and Super (Inside).
  // Super opens at 60.

  // A. Calculate Total Capital Need (PV) at Retirement Age if it was all one pot
  const { simulation } = calculateRetirementNeeds(
    currentAge, retirementAge, deathAge, monthlyExpense, inflationRate, investmentReturnRate
  );

  // B. Accumulation with Super
  // We need to solve for "Additional Voluntary Savings" (Outside Super) to bridge the gap.
  // But wait, "Super Contribution" is usually % of Salary. We don't have Salary input.
  // We have "Monthly Expense".
  // Let's assume the user saves a specific amount $S$ per month.
  // Part of $S$ is mandatory Super (if we knew salary).
  // Since we don't know salary, let's interpret "Super Contribution Rate" as:
  // "For every $1 I save in my bank, I also put $R into Super".
  // OR: Just simulate two pots growing.

  // REVISED APPROACH FOR AU UI without Salary Input:
  // We calculate "Total Monthly Savings Required".
  // But we assume a split: X% goes to Super, Y% goes to Liquid?
  // No, usually Super is fixed by employer.
  // Let's assume a proxy salary = MonthlyExpense * 2 (Savings rate 50%).
  // This is arbitrary.

  // BETTER APPROACH:
  // Just treat Super as a separate pot that grows from `superBalance`.
  // And we solve for `Required Liquid Savings` to cover the gap.
  // IF Super isn't enough for post-60, we need more Liquid.
  // IF Super is too much, we still need Liquid for pre-60.

  // 1. Project Current Super Balance to Retirement Age
  const monthlyReturn = Math.pow(1 + investmentReturnRate / 100, 1 / 12) - 1;

  const accessAge = Math.max(retirementAge, PRESERVATION_AGE);
  const monthsToSuperAccess = Math.max(0, (accessAge - currentAge) * 12);
  const projectedSuperAtAccess = superBalance * Math.pow(1 + monthlyReturn, monthsToSuperAccess);

  // Bridge Need (Retire -> Preservation Age)
  let bridgeCapitalNeeded = 0;
  if (retirementAge < PRESERVATION_AGE) {
    const bridgeEndAge = Math.min(PRESERVATION_AGE, deathAge);
    if (bridgeEndAge > retirementAge) {
      const { nominal } = calculateRetirementNeeds(
        currentAge,
        retirementAge,
        bridgeEndAge,
        monthlyExpense,
        inflationRate,
        investmentReturnRate
      );
      bridgeCapitalNeeded = nominal;
    }
  }

  // Post-preservation need (accessible once Super unlocks)
  let postNeedAtAccess = 0;
  if (deathAge > accessAge) {
    const { nominal } = calculateRetirementNeeds(
      currentAge,
      accessAge,
      deathAge,
      monthlyExpense,
      inflationRate,
      investmentReturnRate
    );
    postNeedAtAccess = nominal;
  }

  const monthsBetweenRetirementAndAccess = Math.max(0, (accessAge - retirementAge) * 12);
  const discountFactor = Math.pow(1 + monthlyReturn, monthsBetweenRetirementAndAccess);
  const discountedPostNeed = postNeedAtAccess / (discountFactor || 1);
  const projectedSuperAtRetirement = projectedSuperAtAccess / (discountFactor || 1);

  const requiredLiquidWealth = bridgeCapitalNeeded + Math.max(0, discountedPostNeed - projectedSuperAtRetirement);
  const totalTargetAtRetirement = requiredLiquidWealth + projectedSuperAtRetirement;
  const inflationDiscount = Math.pow(1 + inflationRate / 100, Math.max(0, retirementAge - currentAge));
  const requiredWealthPV = totalTargetAtRetirement / (inflationDiscount || 1);

  // Now solve for Monthly Savings to reach RequiredLiquidWealth
  const { initialMonthlySavings, accumulationData, success } = calculateAccumulationPath(
    currentAge, retirementAge, requiredLiquidWealth, inflationRate, investmentReturnRate
  );

  // Trend
  const trendData = options.includeTrend ? calculateTrendAnalysis(
    currentAge, deathAge, monthlyExpense, inflationRate, investmentReturnRate, 'AU', superBalance
  ) : [];

  return {
    requiredWealth: Math.round(totalTargetAtRetirement),
    requiredWealthPV: Math.round(requiredWealthPV),
    firstYearSavingsMonthly: Math.round(initialMonthlySavings),
    simulationData: simulation,
    accumulationData, // This only shows Liquid accumulation. Super is hidden? Let's add Super to chart?
    // For now, keep it simple.
    trendData,
    fireSuccess: success
  };
};

// --- SHARED HELPERS ---

export const calculateRetirementNeeds = (
  currentAge: number, retirementAge: number, deathAge: number, currentMonthlyExpense: number, inflationRate: number, returnRate: number
) => {
  const monthlyInflation = Math.pow(1 + inflationRate / 100, 1 / 12) - 1;
  const monthlyReturn = Math.pow(1 + returnRate / 100, 1 / 12) - 1;
  const monthsToRetire = Math.max(0, (retirementAge - currentAge) * 12);
  const monthsInRetirement = (deathAge - retirementAge) * 12;

  const initialRetirementMonthlyExpense = currentMonthlyExpense * Math.pow(1 + monthlyInflation, monthsToRetire);

  let low = 0;
  const futureMonthlyExpense = initialRetirementMonthlyExpense;
  let high = futureMonthlyExpense * 12 * 1000;
  let requiredWealth = 0;

  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    if (simulateDepletionMonthly(mid, initialRetirementMonthlyExpense, monthsInRetirement, monthlyInflation, monthlyReturn)) {
      requiredWealth = mid;
      high = mid;
    } else {
      low = mid;
    }
  }

  // Simulation Generation (Shared)
  const simulation: SimulationYear[] = [];
  let balance = requiredWealth;
  let currentMonthlyExp = initialRetirementMonthlyExpense;

  for (let year = retirementAge; year <= deathAge; year++) {
    const yearStartBalance = balance;
    let yearTotalExp = 0;
    for (let m = 0; m < 12; m++) {
      balance -= currentMonthlyExp;
      yearTotalExp += currentMonthlyExp;
      balance *= (1 + monthlyReturn);
      currentMonthlyExp *= (1 + monthlyInflation);
    }
    simulation.push({
      age: year,
      expenses: Math.round(yearTotalExp),
      portfolioStart: Math.round(yearStartBalance),
      portfolioEnd: Math.round(balance),
      isRetired: true,
    });
  }

  const pv = requiredWealth / Math.pow(1 + inflationRate / 100, retirementAge - currentAge);
  return { nominal: requiredWealth, pv, simulation };
};

const simulateDepletionMonthly = (
  startPrincipal: number, startExpense: number, totalMonths: number, monthlyInflation: number, monthlyReturn: number
): boolean => {
  let balance = startPrincipal;
  let expense = startExpense;
  for (let m = 0; m < totalMonths; m++) {
    balance -= expense;
    if (balance < -1) return false;
    balance *= (1 + monthlyReturn);
    expense *= (1 + monthlyInflation);
  }
  return true;
};

export const calculateAccumulationPath = (
  currentAge: number, retirementAge: number, targetWealth: number, inflationRate: number, returnRate: number
) => {
  const yearsToGrow = retirementAge - currentAge;
  if (yearsToGrow <= 0) return { initialMonthlySavings: 0, accumulationData: [], success: true };

  const monthlyInflation = Math.pow(1 + inflationRate / 100, 1 / 12) - 1;
  const monthlyReturn = Math.pow(1 + returnRate / 100, 1 / 12) - 1;

  let discountFactorSum = 0;
  let currentWageMultiplier = 1.0;
  const totalMonths = yearsToGrow * 12;

  for (let m = 0; m < totalMonths; m++) {
    if (m > 0 && m % 12 === 0) {
      const currentYearAge = currentAge + Math.floor(m / 12);
      const realGrowth = getRealWageGrowthRate(currentYearAge);
      const annualNominalGrowth = (1 + realGrowth) * (1 + inflationRate / 100) - 1;
      currentWageMultiplier *= (1 + annualNominalGrowth);
    }
    const monthsUntilRetirement = totalMonths - 1 - m;
    const growthFactor = Math.pow(1 + monthlyReturn, monthsUntilRetirement);
    discountFactorSum += currentWageMultiplier * growthFactor;
  }

  const initialMonthlySavings = targetWealth / discountFactorSum;

  const accumulationData: AccumulationPoint[] = [];
  let totalPrincipal = 0;
  let currentBalance = 0;
  let wageMult = 1.0;

  for (let y = 0; y <= yearsToGrow; y++) {
    const age = currentAge + y;
    if (y > 0) {
      for (let m = 0; m < 12; m++) {
        const monthlyContribution = initialMonthlySavings * wageMult;
        currentBalance *= (1 + monthlyReturn);
        currentBalance += monthlyContribution;
        totalPrincipal += monthlyContribution;
      }
      const realGrowth = getRealWageGrowthRate(age);
      const annualNominalGrowth = (1 + realGrowth) * (1 + inflationRate / 100) - 1;
      wageMult *= (1 + annualNominalGrowth);
    }
    accumulationData.push({
      age: age,
      totalWealth: Math.round(currentBalance),
      totalPrincipal: Math.round(totalPrincipal),
      totalInterest: Math.round(currentBalance - totalPrincipal),
      monthlySavings: Math.round(initialMonthlySavings * wageMult),
      salaryGrowthRate: getRealWageGrowthRate(age) * 100
    });
  }

  return { initialMonthlySavings, accumulationData, success: initialMonthlySavings < Infinity && !isNaN(initialMonthlySavings) };
};

export const calculateTrendAnalysis = (
  currentAge: number, deathAge: number, monthlyExpense: number, inflationRate: number, returnRate: number, region: 'CN' | 'AU' = 'CN', superBalance: number = 0
): TrendPoint[] => {
  const points: TrendPoint[] = [];
  for (let rAge = 30; rAge <= 65; rAge++) {
    if (rAge <= currentAge) continue;

    let result;
    if (region === 'AU') {
      // Simplified AU Trend: Just call the main AU logic
      // We need to mock the params
      const params: FinancialParams = {
        currentAge, retirementAge: rAge, deathAge, monthlyExpense, inflationRate, investmentReturnRate: returnRate, superBalance
      };
      result = calculateFIRE_AU(params, { includeTrend: false });
    } else {
      const { nominal, pv } = calculateRetirementNeeds(currentAge, rAge, deathAge, monthlyExpense, inflationRate, returnRate);
      const { initialMonthlySavings } = calculateAccumulationPath(currentAge, rAge, nominal, inflationRate, returnRate);
      result = { requiredWealth: nominal, requiredWealthPV: pv, firstYearSavingsMonthly: initialMonthlySavings };
    }

    points.push({
      retirementAge: rAge,
      requiredWealthNominal: result.requiredWealth,
      requiredWealthPV: result.requiredWealthPV,
      savingsPressure: result.firstYearSavingsMonthly
    });
  }
  return points;
};
