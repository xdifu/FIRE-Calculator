import { calculateFIRE } from '../utils/finance';
import { FinancialParams } from '../types';

type CalcRequest = { id: number; params: FinancialParams };

self.onmessage = (e: MessageEvent<CalcRequest>) => {
  const { id, params } = e.data;
  try {
    const result = calculateFIRE(params, { includeTrend: false });
    self.postMessage({ success: true, id, data: result });
  } catch (error) {
    self.postMessage({ success: false, id, error: String(error) });
  }
};
