import { calculateTrendAnalysis } from '../utils/finance';
import { FinancialParams } from '../types';

type TrendRequest = { id: number; params: FinancialParams };

self.onmessage = (e: MessageEvent<TrendRequest>) => {
    const { id, params } = e.data;

    try {
        const trendData = calculateTrendAnalysis(
            params.currentAge,
            params.deathAge,
            params.monthlyExpense,
            params.inflationRate,
            params.investmentReturnRate
        );

        self.postMessage({ success: true, id, data: trendData });
    } catch (error) {
        self.postMessage({ success: false, id, error: String(error) });
    }
};
