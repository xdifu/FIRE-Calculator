
export interface FinancialParams {
  currentAge: number;
  retirementAge: number;
  deathAge: number;
  monthlyExpense: number; // In CNY, current value
  inflationRate: number; // Percentage
  investmentReturnRate: number; // Percentage
}

export interface SimulationYear {
  age: number;
  expenses: number;
  portfolioStart: number;
  portfolioEnd: number;
  isRetired: boolean;
}

export interface AccumulationPoint {
  age: number;
  totalWealth: number;
  totalPrincipal: number; // The cash you put in
  totalInterest: number;  // The market growth
  monthlySavings: number; // Nominal savings rate at this age
  salaryGrowthRate: number;
}

export interface TrendPoint {
  retirementAge: number;
  requiredWealthPV: number; // Present Value
  requiredWealthNominal: number; // Future Value
  savingsPressure: number; // Monthly savings needed if starting now
}

export interface CalculationResult {
  requiredWealth: number; // Nominal amount needed at retirement
  requiredWealthPV: number; // Present Value (Purchasing Power)
  firstYearSavingsMonthly: number; // How much to save per month NOW
  simulationData: SimulationYear[]; // Decumulation (Retirement phase)
  accumulationData: AccumulationPoint[]; // Accumulation (Working phase)
  trendData: TrendPoint[]; // Sensitivity analysis
  fireSuccess: boolean; // Is it mathematically possible?
}
