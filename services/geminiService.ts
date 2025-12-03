import { GoogleGenAI } from "@google/genai";
import { Memory } from "../types";

/** 取得 API Key（localStorage > Vercel 環境變數） */
function getApiKey() {
  const userKey = localStorage.getItem("user_gemini_key");
  return userKey || import.meta.env.VITE_GEMINI_API_KEY || "";
}

/** 建立安全 AI 客戶端（避免全域 instance 造成白屏） */
function getAI() {
  const apiKey = getApiKey();

  if (!apiKey || apiKey.length < 10) {
    throw new Error("API Key 未設定或無效");
  }

  return new GoogleGenAI({ apiKey });
}

/** 通用的 AI 呼叫函式（統一錯誤處理） */
async function callAI(prompt: string): Promise<string> {
  try {
    const ai = getAI();

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text?.trim() || "";
  } catch (err) {
    console.error("Gemini Error:", err);
    return "AI 暫時無法服務，請稍後再試。";
  }
}

/** 產生回憶摘要 */
export async function generateMemorySummary(memory: Memory): Promise<string> {
  const prompt = `
    我們是一對情侶。請幫我為這段回憶寫一個溫暖、簡短且充滿感情的摘要（繁體中文，50字以內）：
    標題: ${memory.title}
    地點: ${memory.location}
    描述: ${memory.description}
    日期: ${memory.date}
    心情: ${memory.mood || "溫馨"}
  `;

  return await callAI(prompt);
}

/** 情侶故事 */
export async function generateCoupleStory(names: string, days: number): Promise<string> {
  const prompt = `
    寫一個關於 ${names} 的浪漫微小說。
    他們已經在一起 ${days} 天了。
    風格：溫柔、治癒、像繪本一樣。
    長度：200字左右。
    語言：繁體中文。
  `;

  return await callAI(prompt);
}

/** 每日一句 */
export async function generateDailyMessage(names: string, days: number): Promise<string> {
  const today = new Date();

  const prompt = `
    為情侶 ${names} 寫一句短短的、溫暖的每日一句。
    他們在一起 ${days} 天了。
    今天是 ${today.getMonth() + 1} 月。
    繁體中文，20字內。
  `;

  return await callAI(prompt);
}

/** 月回顧 */
export async function generateMonthlyStory(
  names: string,
  monthStr: string,
  memories: Memory[]
): Promise<string> {
  const memoryText = memories.map(m => `- ${m.date} ${m.title}: ${m.description}`).join("\n");

  const prompt = `
    請為 ${names} 寫一段 ${monthStr} 的月回顧故事。
    本月回憶如下：
    ${memoryText}

    請串成 200–300 字的溫馨故事。
  `;

  return await callAI(prompt);
}

/** 年回顧 */
export async function generateYearlyStory(
  names: string,
  year: string,
  memories: Memory[]
): Promise<string> {
  const memoryText = memories.slice(0, 50).map(m => `- ${m.date} ${m.title}`).join("\n");

  const prompt = `
    請為 ${names} 寫一段 ${year} 年的年度總結故事。
    他們創造了 ${memories.length} 個回憶。
    回憶摘錄：
    ${memoryText}

    請寫成 400 字左右、信件風格、溫暖且感人。
  `;

  return await callAI(prompt);
}

/** 恭喜卡片 */
export async function generateGoalCompletionCard(
  goalTitle: string,
  names: string
): Promise<string> {
  const prompt = `
    情侶 ${names} 完成了共同目標：「${goalTitle}」。
    請寫 50–80 字的祝賀詞，甜蜜、有力量。
  `;

  return await callAI(prompt);
}
