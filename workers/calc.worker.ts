import { calculateFIRE } from '../utils/finance';
import { FinancialParams } from '../types';
import { Region } from '../locales';

type CalcRequest = { id: number; params: FinancialParams; region?: Region };

self.onmessage = (e: MessageEvent<CalcRequest>) => {
  const { id, params, region } = e.data;
  const activeRegion: Region = region || 'CN';

  try {
    const result = calculateFIRE(params, { includeTrend: false, region: activeRegion });

    self.postMessage({ success: true, id, data: result });
  } catch (error) {
    self.postMessage({ success: false, id, error: String(error) });
  }
};
