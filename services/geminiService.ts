import { GoogleGenAI } from "@google/genai";
import { Asset, Transaction } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeAssetHealth = async (assets: Asset[], transactions: Transaction[]) => {
  if (!process.env.API_KEY) {
    return "API Key not found. Please configure the environment variable.";
  }

  try {
    const dataSummary = JSON.stringify({
      totalAssets: assets.length,
      statusCounts: assets.reduce((acc, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recentTransactions: transactions.slice(0, 10).map(t => ({
        type: t.type,
        asset: t.assetName,
        date: new Date(t.timestamp).toLocaleDateString(),
        notes: t.notes
      }))
    });

    const prompt = `
      请扮演一位智能设施经理。分析以下资产和交易数据的 JSON。
      请用中文提供一份简明的摘要（最多 3 段），涵盖：
      1. 当前资产利用率。
      2. 基于日志或状态的任何维护关注点。
      3. 优化资产分配的建议。
      
      数据:
      ${dataSummary}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "暂时无法生成分析。";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "分析数据时出错。请稍后再试。";
  }
};