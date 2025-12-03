import { GoogleGenAI } from "@google/genai";
import { Memory } from "../types";

/** 👍 永遠從 Vercel 環境變數取得 API Key（最安全、最不會壞） */
function getApiKey() {
  return import.meta.env.VITE_GEMINI_API_KEY || "";
}

/** 建立 AI 客戶端（動態建立可避免白屏） */
function createAI() {
  const apiKey = getApiKey();

  if (!apiKey || apiKey.length < 20) {
    throw new Error("Gemini API Key 未設定，請檢查 Vercel Environment Variables");
  }

  return new GoogleGenAI({ apiKey });
}

/** 共用 AI 呼叫函式 */
async function callAI(prompt: string): Promise<string> {
  try {
    const ai = createAI();

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text?.trim() || "（AI 沒有回應內容）";
  } catch (error) {
    console.error("[Gemini Error]", error);
    return "AI 暫時無法服務，請稍後再試。";
  }
}

/* -------------------------------------------
 * 1️⃣ 回憶摘要
 * -----------------------------------------*/
export async function generateMemorySummary(memory: Memory): Promise<string> {
  const prompt = `
    我們是一對情侶。請為這段回憶寫一段溫暖、感性的摘要（繁體中文，50 字內）：
    標題：${memory.title}
    地點：${memory.location}
    描述：${memory.description}
    日期：${memory.date}
    心情：${memory.mood || "溫馨"}
  `;
  return await callAI(prompt);
}

/* -------------------------------------------
 * 2️⃣ 情侶故事
 * -----------------------------------------*/
export async function generateCoupleStory(names: string, days: number): Promise<string> {
  const prompt = `
    請寫一篇關於 ${names} 的浪漫微小說。
    他們已經在一起 ${days} 天。
    風格：溫柔、療癒、像繪本。
    長度：約 200 字（繁體中文）
  `;
  return await callAI(prompt);
}

/* -------------------------------------------
 * 3️⃣ 每日一句
 * -----------------------------------------*/
export async function generateDailyMessage(names: string, days: number): Promise<string> {
  const today = new Date();

  const prompt = `
    為情侶 ${names} 寫一句每日暖心短句。
    他們在一起 ${days} 天。
    今天為 ${today.getMonth() + 1} 月。
    要溫柔、感性，20 字內（繁體中文）
  `;
  return await callAI(prompt);
}

/* -------------------------------------------
 * 4️⃣ 月回顧（四段式）
 * -----------------------------------------*/
export async function generateMonthlyStory(
  names: string,
  monthStr: string,
  memories: Memory[]
): Promise<string> {
  const memoryText = memories
    .map(m => `- ${m.date} ${m.title}: ${m.description}`)
    .join("\n");

  const prompt = `
    請為 ${names} 寫一份 ${monthStr} 的「戀愛月報」。
    以下為本月回憶：
    ${memoryText}

    請分四段輸出（每段 50–80 字）：

    💌 暖心總結：
    ✨ 彼此的閃光點：
    🌱 我們可以更好：
    💡 推薦一起做的事：
  `;
  return await callAI(prompt);
}

/* -------------------------------------------
 * 5️⃣ 年回顧（四段式）
 * -----------------------------------------*/
export async function generateYearlyStory(
  names: string,
  year: string,
  memories: Memory[]
): Promise<string> {
  const memoryText = memories
    .slice(0, 50)
    .map(m => `- ${m.date} ${m.title}`)
    .join("\n");

  const prompt = `
    請為 ${names} 寫一份 ${year} 年的「年度戀愛報告」。
    回憶摘錄：
    ${memoryText}

    請分四段輸出（每段約 100 字）：

    💌 年度總結：
    🏆 年度最佳時刻：
    🌱 我們可以更好：
    ✨ 明年的願望清單：
  `;
  return await callAI(prompt);
}
