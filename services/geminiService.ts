import { GoogleGenAI } from "@google/genai";
import { FinancialParams } from "../types";

export const getFinancialAdvice = async (
  params: FinancialParams,
  requiredWealth: number
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    你是一位精通中国国情和FIRE（财务自由）规划的理财专家。
    用户目前生活在中国一二线城市。
    用户情况如下：
    - 当前年龄：${params.currentAge}岁
    - 计划退休年龄：${params.retirementAge}岁
    - 预期寿命：${params.deathAge}岁
    - 当前月消费：${params.monthlyExpense} 元
    - 拥有自住房且无房贷。
    - 无养老金/社保收入（全靠积蓄）。
    - 预期通胀率：${params.inflationRate}%
    - 预期投资回报率：${params.investmentReturnRate}%
    
    经过计算，他在${params.retirementAge}岁退休时，需要准备的流动净资产（不含房产）为：${(requiredWealth / 10000).toFixed(2)} 万人民币。

    请根据以上数据，给出一段简洁、幽默但深刻的分析建议（300字以内）。
    内容包括：
    1. 这个资金量在当前生活的可行性评价。
    2. 针对生活方式的特别提醒（例如医疗、娱乐、通胀风险）。
    3. 投资组合配置的简要建议（保守/激进比例）。
    
    请用Markdown格式输出。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "无法生成建议，请稍后再试。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI 服务暂时不可用，请检查网络或 API Key 设置。";
  }
};
