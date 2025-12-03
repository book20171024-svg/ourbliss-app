
import { GoogleGenAI } from "@google/genai";
import { Memory } from "../types";

// Helper to safely get API Key in Vite environment
// explicitly casting to 'any' to avoid TypeScript errors with import.meta.env
const getApiKey = () => {
  try {
    const meta = import.meta as any;
    if (typeof meta !== 'undefined' && meta.env) {
      return meta.env.VITE_GEMINI_API_KEY;
    }
  } catch (e) {
    console.warn("Environment access error", e);
  }
  return '';
};

const API_KEY = getApiKey();
// Initialize safely - if no key, the calls will fail gracefully later
const ai = new GoogleGenAI({ apiKey: API_KEY || "dummy_key" });

// Shared Error Handler
const handleGeminiError = (error: any, defaultMsg: string) => {
  console.error("Gemini Error:", error);
  const errMsg = JSON.stringify(error) || error?.toString() || "";
  
  // Specific checks for common API Key issues
  if (errMsg.includes("leaked") || errMsg.includes("reported as leaked")) {
    return "⚠️ API Key 已失效（被標記為洩漏）。請至 Google AI Studio 產生新 Key，並更新 Vercel 的 VITE_GEMINI_API_KEY 設定。";
  }
  
  if (errMsg.includes("PERMISSION_DENIED") || errMsg.includes("403")) {
    return "⚠️ API Key 權限不足或已失效。請檢查 Vercel 設定並重新部署 (Redeploy)。";
  }

  if (errMsg.includes("API_KEY_INVALID")) {
    return "⚠️ API Key 格式錯誤。請檢查 Vercel 設定。";
  }
  
  return defaultMsg;
};

/**
 * Generates a warm, romantic summary of a memory.
 */
export const generateMemorySummary = async (memory: Memory): Promise<string> => {
  if (!API_KEY || API_KEY.includes("請在此填入")) {
    return "請先設定 API Key (VITE_GEMINI_API_KEY)。";
  }

  try {
    const prompt = `
      我們是一對情侶。請幫我為這段回憶寫一個溫暖、簡短且充滿感情的摘要（繁體中文，50字以內）：
      標題: ${memory.title}
      地點: ${memory.location}
      描述: ${memory.description}
      日期: ${memory.date}
      心情: ${memory.mood || '溫馨'}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "無法產生摘要。";
  } catch (error) {
    return handleGeminiError(error, "AI 暫時休息中，請稍後再試。");
  }
};

/**
 * Generates a creative story based on the couple's time together.
 */
export const generateCoupleStory = async (names: string, days: number): Promise<string> => {
  if (!API_KEY || API_KEY.includes("請在此填入")) {
    return "請先設定 Vercel 環境變數 VITE_GEMINI_API_KEY。";
  }

  try {
    const prompt = `
      寫一個關於 ${names} 的浪漫微小說。
      他們已經在一起 ${days} 天了。
      風格：溫柔、治癒、像繪本一樣的敘述。
      長度：200字左右。
      語言：繁體中文。
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "無法產生故事。";
  } catch (error) {
    return handleGeminiError(error, "AI 暫時休息中。");
  }
};

/**
 * Generates a short daily warm message.
 */
export const generateDailyMessage = async (names: string, days: number): Promise<string> => {
  // Silent fallback if no key, to not break the UI on load
  if (!API_KEY || API_KEY.includes("請在此填入")) {
    return "願你們今天也像彼此依靠的肩膀一樣溫暖。(請設定 API Key)";
  }

  try {
    const today = new Date();
    const prompt = `
      為情侶 ${names} 寫一句短短的、溫暖的「每日一句」。
      他們在一起 ${days} 天了。
      今天是 ${today.getMonth() + 1}月，請結合季節感或戀愛感。
      繁體中文，20字以內。
      不要任何標題，直接給句子。
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text?.trim() || "願你們今天也像彼此依靠的肩膀一樣溫暖。";
  } catch (error) {
    // Log error but return fallback text for daily message
    console.error("Daily Message Error:", error);
    return "願你們今天也像彼此依靠的肩膀一樣溫暖。";
  }
};

/**
 * Generates a monthly summary story (Structured & Concise).
 */
export const generateMonthlyStory = async (names: string, monthStr: string, memories: Memory[]): Promise<string> => {
  if (!API_KEY) return "請先設定 API_KEY 以生成月度回顧。";

  const memoryText = memories.map(m => `- ${m.date} ${m.title}: ${m.description}`).join('\n');

  try {
    const prompt = `
      請為 ${names} 寫一份關於 ${monthStr} 的「戀愛月報」。
      這是他們這個月的回憶片段：
      ${memoryText}
      
      請嚴格遵守以下四個段落格式輸出（每段約 30-50 字，精簡溫暖，繁體中文）：

      【💌 暖心總結】
      (用一句話總結這個月的氛圍)

      【✨ 彼此的閃光點】
      (稱讚他們這個月做得好的地方)

      【💡 可以更好的地方】
      (溫柔地提出一個小小的相處建議)

      【✨ 建議體驗的活動】
      (推薦一個適合下個月的約會靈感)
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "無法生成故事。";
  } catch (error) {
    return handleGeminiError(error, "AI 暫時無法生成，請檢查 API Key 或網路。");
  }
};

/**
 * Generates a yearly summary story (Structured & Concise).
 */
export const generateYearlyStory = async (names: string, year: string, memories: Memory[]): Promise<string> => {
  if (!API_KEY) return "請先設定 API_KEY 以生成年度回顧。";

  const memoryText = memories.slice(0, 50).map(m => `- ${m.date} ${m.title}`).join('\n');

  try {
    const prompt = `
      請為 ${names} 寫一份 ${year} 年的「年度戀愛報告」。
      回憶列表：
      ${memoryText}

      請嚴格遵守以下四個段落格式輸出（每段約 50-80 字，精簡感人，繁體中文）：

      【💌 年度總結】
      (總結這一年的核心回憶與感情變化)

      【🏆 年度最佳時刻】
      (回顧最亮眼、最值得紀念的瞬間)

      【🌱 我們可以更好】
      (溫柔提出對未來的期許與改進方向)

      【✨ 明年的願望清單】
      (推薦 1-2 個明年一定要一起完成的目標)
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "無法生成故事。";
  } catch (error) {
    return handleGeminiError(error, "AI 暫時無法生成，請檢查 API Key 或網路。");
  }
};

/**
 * Generates a congratulation card text for goal completion.
 */
export const generateGoalCompletionCard = async (goalTitle: string, names: string): Promise<string> => {
  if (!API_KEY) return "恭喜達成目標！";

  try {
    const prompt = `
      情侶 ${names} 剛剛完成了一個共同目標：「${goalTitle}」。
      請寫一段約 30-50 字的溫暖祝賀詞。
      繁體中文。
    `;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text || "恭喜達成目標！";
  } catch (error) {
    return handleGeminiError(error, "恭喜達成目標！");
  }
};
