import { GoogleGenAI } from "@google/genai";
import { FinancialParams } from "../types";

export const getFinancialAdvice = async (
  params: FinancialParams,
  requiredWealth: number,
  locale: 'zh' | 'en',
  region: 'CN' | 'AU'
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Construct Prompt based on Locale and Region
  let prompt = "";

  if (locale === 'zh') {
    // --- CHINESE PROMPT ---
    const regionContext = region === 'CN'
      ? "用户生活在中国一二线城市。无养老金/社保收入（全靠积蓄）。"
      : `用户生活在澳洲。拥有 Superannuation (养老金) 余额 ${params.superBalance || 0} AUD，缴纳率 ${params.superContributionRate || 11.5}%。`;

    const currency = region === 'CN' ? "人民币" : "澳元";
    const wealthUnit = region === 'CN' ? "万" : "k";
    const wealthValue = region === 'CN' ? (requiredWealth / 10000).toFixed(2) : (requiredWealth / 1000).toFixed(0);

    prompt = `
      你是一位精通${region === 'CN' ? '中国' : '澳洲'}国情和FIRE（财务自由）规划的理财专家。
      ${regionContext}
      用户情况如下：
      - 当前年龄：${params.currentAge}岁
      - 计划退休年龄：${params.retirementAge}岁
      - 预期寿命：${params.deathAge}岁
      - 当前月消费：${params.monthlyExpense} ${currency}
      - 预期通胀率：${params.inflationRate}%
      - 预期投资回报率：${params.investmentReturnRate}%
      
      经过计算，他在${params.retirementAge}岁退休时，需要准备的流动净资产（不含房产）为：${wealthValue} ${wealthUnit} ${currency}。

      请根据以上数据，给出一段简洁、幽默但深刻的分析建议（300字以内）。
      内容包括：
      1. 这个资金量在当前生活的可行性评价。
      2. 针对${region === 'CN' ? '国内' : '澳洲'}生活方式的特别提醒（例如医疗、娱乐、通胀风险）。
      3. 投资组合配置的简要建议。
      
      请用中文输出 Markdown 格式。
    `;
  } else {
    // --- ENGLISH PROMPT ---
    const regionContext = region === 'CN'
      ? "User lives in a Tier 1/2 city in China. No pension/social security (relies on savings)."
      : `User lives in Australia. Has Superannuation balance $${params.superBalance || 0}, Contribution rate ${params.superContributionRate || 11.5}%.`;

    const currency = region === 'CN' ? "CNY" : "AUD";
    const wealthValue = (requiredWealth / 1000).toFixed(0) + "k";

    prompt = `
      You are a financial expert specializing in FIRE (Financial Independence, Retire Early) planning for ${region === 'CN' ? 'China' : 'Australia'}.
      ${regionContext}
      User Profile:
      - Current Age: ${params.currentAge}
      - Target Retirement Age: ${params.retirementAge}
      - Life Expectancy: ${params.deathAge}
      - Monthly Expense: $${params.monthlyExpense} ${currency}
      - Inflation Rate: ${params.inflationRate}%
      - Investment Return: ${params.investmentReturnRate}%
      
      Calculated Required Net Worth (Liquid) at Retirement: $${wealthValue} ${currency}.

      Please provide a concise, witty, and insightful analysis (under 200 words).
      Include:
      1. Feasibility assessment of this capital amount.
      2. Specific lifestyle risks for ${region === 'CN' ? 'China' : 'Australia'} (e.g., healthcare, inflation).
      3. Brief investment portfolio suggestions.
      
      Output in English using Markdown.
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || (locale === 'zh' ? "无法生成建议，请稍后再试。" : "Unable to generate advice, please try again later.");
  } catch (error) {
    console.error("Gemini API Error:", error);
    return locale === 'zh' ? "AI 服务暂时不可用，请检查网络或 API Key 设置。" : "AI service unavailable. Check network or API Key.";
  }
};
