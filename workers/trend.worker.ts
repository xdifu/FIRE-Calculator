import { calculateTrendAnalysis } from '../utils/finance';
import { FinancialParams } from '../types';
import { Region } from '../locales';

type TrendRequest = { id: number; params: FinancialParams; region?: Region };

self.onmessage = (e: MessageEvent<TrendRequest>) => {
    const { id, params, region } = e.data;
    const activeRegion: Region = region || 'CN';

    try {
        const trendData = calculateTrendAnalysis(
            params.currentAge,
            params.deathAge,
            params.monthlyExpense,
            params.inflationRate,
            params.investmentReturnRate,
            activeRegion,
            params.superBalance || 0
        );

        self.postMessage({ success: true, id, data: trendData });
    } catch (error) {
        self.postMessage({ success: false, id, error: String(error) });
    }
};
