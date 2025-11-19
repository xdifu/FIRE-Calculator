
import { FinancialParams, CalculationResult, SimulationYear, TrendPoint, AccumulationPoint } from '../types';

/**
 * REALISTIC CAREER WAGE GROWTH MODEL (Chengdu / New Tier 1 Cities)
 * Represents "Real" growth above inflation.
 */
const getRealWageGrowthRate = (age: number): number => {
  if (age < 25) return 0.08; // Junior: Rapid skill acquisition
  if (age < 30) return 0.06; // Senior: Establishing core value
  if (age < 35) return 0.04; // Expert: High earning, slower growth
  if (age < 45) return 0.01; // Mid-Life Plateau: Keeping up with inflation + slight merit
  return 0.00;               // 45+: Stagnation / Defense phase (High risk of flat real income)
};

export const calculateFIRE = (params: FinancialParams, options: { includeTrend?: boolean } = { includeTrend: true }): CalculationResult => {
  const {
    currentAge,
    retirementAge,
    deathAge,
    monthlyExpense,
    inflationRate,
    investmentReturnRate,
  } = params;

  // 1. Decumulation Phase: How much Capital (K) is needed at retirement?
  // We calculate this first because it sets the target for the accumulation phase.
  const { nominal: requiredWealth, pv: requiredWealthPV, simulation } = calculateRetirementNeeds(
    currentAge,
    retirementAge,
    deathAge,
    monthlyExpense,
    inflationRate,
    investmentReturnRate
  );

  // 2. Accumulation Phase: How much monthly savings (S) is needed to reach Capital (K)?
  const { initialMonthlySavings, accumulationData, success } = calculateAccumulationPath(
    currentAge,
    retirementAge,
    requiredWealth,
    inflationRate,
    investmentReturnRate
  );

  // 3. Sensitivity Analysis (Trend): Impact of changing retirement age
  // OPTIMIZATION: Allow skipping this heavy calculation for main thread performance
  const trendData = options.includeTrend ? calculateTrendAnalysis(
    currentAge,
    deathAge,
    monthlyExpense,
    inflationRate,
    investmentReturnRate
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

/**
 * Phase 1: Decumulation (Retirement -> Death)
 * Uses Monthly Simulation for maximum precision.
 */
export const calculateRetirementNeeds = (
  currentAge: number,
  retirementAge: number,
  deathAge: number,
  currentMonthlyExpense: number,
  inflationRate: number,
  returnRate: number
) => {
  const monthlyInflation = Math.pow(1 + inflationRate / 100, 1 / 12) - 1;
  const monthlyReturn = Math.pow(1 + returnRate / 100, 1 / 12) - 1;

  const monthsToRetire = Math.max(0, (retirementAge - currentAge) * 12);
  const monthsInRetirement = (deathAge - retirementAge) * 12;

  // Expense at the very first month of retirement (Nominal)
  const initialRetirementMonthlyExpense = currentMonthlyExpense * Math.pow(1 + monthlyInflation, monthsToRetire);

  // Binary Search for the exact required capital
  let low = 0;
  // Fix: Upper bound must account for inflation over the accumulation period. 
  // 1000 years of expenses is safe, but we need to project it to Future Value first to be safe against high inflation.
  const futureMonthlyExpense = initialRetirementMonthlyExpense; // This is already FV at retirement
  let high = futureMonthlyExpense * 12 * 1000; // 1000 years of FV expenses
  let requiredWealth = 0;

  for (let i = 0; i < 40; i++) { // 40 iterations give extreme float precision
    const mid = (low + high) / 2;
    if (simulateDepletionMonthly(mid, initialRetirementMonthlyExpense, monthsInRetirement, monthlyInflation, monthlyReturn)) {
      requiredWealth = mid;
      high = mid;
    } else {
      low = mid;
    }
  }

  // Generate Yearly Summary for Charting (from the Monthly Simulation)
  const simulation: SimulationYear[] = [];
  let balance = requiredWealth;
  let currentMonthlyExp = initialRetirementMonthlyExpense;

  for (let year = retirementAge; year <= deathAge; year++) {
    const yearStartBalance = balance;
    let yearTotalExp = 0;

    // Simulate 12 months for this year
    for (let m = 0; m < 12; m++) {
      // Withdrawal at start of month
      balance -= currentMonthlyExp;
      yearTotalExp += currentMonthlyExp;

      // Growth at end of month
      balance *= (1 + monthlyReturn);

      // Inflation for next month
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

  // Present Value: Discounted by INFLATION rate (not investment rate), to show purchasing power parity
  const pv = requiredWealth / Math.pow(1 + inflationRate / 100, retirementAge - currentAge);

  return { nominal: requiredWealth, pv, simulation };
};

const simulateDepletionMonthly = (
  startPrincipal: number,
  startExpense: number,
  totalMonths: number,
  monthlyInflation: number,
  monthlyReturn: number
): boolean => {
  let balance = startPrincipal;
  let expense = startExpense;

  for (let m = 0; m < totalMonths; m++) {
    balance -= expense;
    if (balance < -1) return false; // Depleted
    balance *= (1 + monthlyReturn);
    expense *= (1 + monthlyInflation);
  }
  return true;
};

/**
 * Phase 2: Accumulation (Now -> Retirement)
 * Solves for Initial Monthly Savings using Monthly Iterations.
 */
export const calculateAccumulationPath = (
  currentAge: number,
  retirementAge: number,
  targetWealth: number,
  inflationRate: number,
  returnRate: number
) => {
  const yearsToGrow = retirementAge - currentAge;
  if (yearsToGrow <= 0) {
    return { initialMonthlySavings: 0, accumulationData: [], success: true };
  }

  const monthlyInflation = Math.pow(1 + inflationRate / 100, 1 / 12) - 1;
  const monthlyReturn = Math.pow(1 + returnRate / 100, 1 / 12) - 1;

  // We need to solve equation: Target = S_base * Sum( WageMult_m * (1+r)^(MonthsLeft) )
  let discountFactorSum = 0;
  let currentWageMultiplier = 1.0;
  const totalMonths = yearsToGrow * 12;

  for (let m = 0; m < totalMonths; m++) {
    // Update Wage Multiplier annually (every 12 months)
    if (m > 0 && m % 12 === 0) {
      const currentYearAge = currentAge + Math.floor(m / 12);
      const realGrowth = getRealWageGrowthRate(currentYearAge);
      const annualNominalGrowth = (1 + realGrowth) * (1 + inflationRate / 100) - 1;
      currentWageMultiplier *= (1 + annualNominalGrowth);
    }

    // Future Value Factor for this specific month's contribution
    // Contribution happens at END of month (conservative assumption for savings)
    const monthsUntilRetirement = totalMonths - 1 - m;
    const growthFactor = Math.pow(1 + monthlyReturn, monthsUntilRetirement);

    discountFactorSum += currentWageMultiplier * growthFactor;
  }

  const initialMonthlySavings = targetWealth / discountFactorSum;

  // Generate Chart Data (Aggregated Yearly)
  const accumulationData: AccumulationPoint[] = [];
  let totalPrincipal = 0;
  let currentBalance = 0;

  // Re-run the simulation loop to populate data
  let wageMult = 1.0;

  for (let y = 0; y <= yearsToGrow; y++) {
    const age = currentAge + y;

    // Snapshot at beginning of year (before this year's contributions) for chart
    // Except for the last year (Retirement Age), where we show the final result.

    if (y > 0) {
      // We need to simulate the 12 months passed
      for (let m = 0; m < 12; m++) {
        const absoluteMonthIndex = (y - 1) * 12 + m;

        // Update wage multiplier at start of year (already done outside inner loop logic implicitly via lookahead, 
        // but let's do it cleaner: Wage is set for the year).

        const monthlyContribution = initialMonthlySavings * wageMult;

        // Growth
        currentBalance *= (1 + monthlyReturn);
        // Contribution
        currentBalance += monthlyContribution;
        totalPrincipal += monthlyContribution;
      }

      // Prepare Wage Mult for NEXT year loop
      // Fix: Use 'age' (currentAge + y) to match the solver's logic (currentAge + floor(m/12))
      // Solver at m=12 (start of year 2) uses currentAge + 1.
      // Here at end of y=1 (start of year 2), age is currentAge + 1. So we should use age.
      const realGrowth = getRealWageGrowthRate(age);
      const annualNominalGrowth = (1 + realGrowth) * (1 + inflationRate / 100) - 1;
      wageMult *= (1 + annualNominalGrowth);
    }

    accumulationData.push({
      age: age,
      totalWealth: Math.round(currentBalance),
      totalPrincipal: Math.round(totalPrincipal),
      totalInterest: Math.round(currentBalance - totalPrincipal),
      monthlySavings: Math.round(initialMonthlySavings * wageMult), // Projecting next year's savings rate
      salaryGrowthRate: getRealWageGrowthRate(age) * 100
    });
  }

  return {
    initialMonthlySavings,
    accumulationData,
    success: initialMonthlySavings < Infinity && !isNaN(initialMonthlySavings)
  };
};


/**
 * Phase 3: Trend Analysis
 * Calculates the curve of "Required Wealth" vs "Retirement Age"
 */
export const calculateTrendAnalysis = (
  currentAge: number,
  deathAge: number,
  monthlyExpense: number,
  inflationRate: number,
  returnRate: number
): TrendPoint[] => {
  const points: TrendPoint[] = [];

  // Calculate for retirement ages 30 to 65 (Fix: Match UI slider max)
  for (let rAge = 30; rAge <= 65; rAge++) {
    if (rAge <= currentAge) continue;

    // Reuse the logic
    const { nominal, pv } = calculateRetirementNeeds(
      currentAge,
      rAge,
      deathAge,
      monthlyExpense,
      inflationRate,
      returnRate
    );

    // Also calculate savings pressure (reverse calc)
    const { initialMonthlySavings } = calculateAccumulationPath(
      currentAge,
      rAge,
      nominal,
      inflationRate,
      returnRate
    );

    points.push({
      retirementAge: rAge,
      requiredWealthNominal: Math.round(nominal),
      requiredWealthPV: Math.round(pv),
      savingsPressure: Math.round(initialMonthlySavings)
    });
  }
  return points;
};
