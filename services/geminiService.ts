import { GoogleGenAI } from "@google/genai";
import { Memory } from "../types";

/** 取得 API Key（localStorage > Vercel 環境變數） */
function getApiKey() {
  const userKey = localStorage.getItem("user_gemini_key");
  return userKey || import.meta.env.VITE_GEMINI_API_KEY || "";
}

/** 建立安全 AI 客戶端，避免全域 instance 導致白畫面 */
function getAI() {
  const apiKey = getApiKey();

  if (!apiKey || apiKey.length < 10) {
    throw new Error("API Key 未設定或無效");
  }

  return new GoogleGenAI({ apiKey });
}

/** 通用 AI 呼叫（統一錯誤處理） */
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

/* =====================================
 * 1️⃣ 回憶摘要
 * ===================================== */
export async function generateMemorySummary(memory: Memory): Promise<string> {
  const prompt = `
    我們是一對情侶。請為這段回憶寫一個溫暖、簡短且感性的摘要（繁體中文，50 字內）：
    標題：${memory.title}
    地點：${memory.location}
    描述：${memory.description}
    日期：${memory.date}
    心情：${memory.mood || "溫馨"}
  `;
  return await callAI(prompt);
}

/* =====================================
 * 2️⃣ 情侶微小說
 * ===================================== */
export async function generateCoupleStory(names: string, days: number): Promise<string> {
  const prompt = `
    為 ${names} 寫一段浪漫微小說。
    他們已經在一起 ${days} 天。
    風格：溫柔、治癒、像繪本。
    長度：約 200 字。
    語言：繁體中文。
  `;
  return await callAI(prompt);
}

/* =====================================
 * 3️⃣ 每日一句
 * ===================================== */
export async function generateDailyMessage(names: string, days: number): Promise<string> {
  const today = new Date();
  const prompt = `
    為情侶 ${names} 寫一句 20 字以內的每日暖心短句。
    他們在一起 ${days} 天。
    今天是 ${today.getMonth() + 1} 月，可加入季節感。
  `;
  return await callAI(prompt);
}

/* =====================================
 * 4️⃣ 月度回顧（四段式）
 * ===================================== */
export async function generateMonthlyStory(
  names: string,
  monthStr: string,
  memories: Memory[]
): Promise<string> {
  const memoryText = memories
    .map(m => `- ${m.date} ${m.title}: ${m.description}`)
    .join("\n");

  const prompt = `
    請為 ${names} 撰寫 ${monthStr} 的「戀愛月報」。
    以下是本月回憶片段：
    ${memoryText}

    請輸出四段文字（每段 50–80 字）：

    💌 暖心總結：
    （請用溫柔語氣總結這個月）

    ✨ 彼此的閃光點：
    （稱讚他們彼此的亮點）

    🌱 我們可以更好：
    （提出溫柔的建議）

    💡 推薦一起做的事：
    （依季節或回憶，推薦約會點子）
  `;

  return await callAI(prompt);
}

/* =====================================
 * 5️⃣ 年度回顧（四段式）
 * ===================================== */
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
    請為 ${names} 撰寫 ${year} 年的「年度戀愛報告」。
    本年度共有 ${memories.length} 則回憶。
    部分回憶列表：
    ${memoryText}

    請輸出四段（每段約 100 字）：

    💌 年度關鍵字：
    （濃縮這一年關係的精華）

    🏆 年度最佳時刻：
    （最值得紀念的瞬間）

    🌱 給彼此的一句話：
    （感謝或溫柔的期許）

    ✨ 明年的願望清單：
    （推薦 1–2 個明年可以一起完成的目標）
  `;

  return await callAI(prompt);
}

/* =====================================
 * 6️⃣ 恭喜卡片
 * ===================================== */
export async function generateGoalCompletionCard(
  goalTitle: string,
  names: string
): Promise<string> {
  const prompt = `
    情侶 ${names} 完成了共同目標：「${goalTitle}」。
    請寫 50–80 字的祝賀詞，用甜蜜、鼓勵、溫暖的語氣。
  `;
  return await callAI(prompt);
}
