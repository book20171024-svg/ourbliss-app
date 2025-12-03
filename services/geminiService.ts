
import { GoogleGenAI } from "@google/genai";
import { Memory } from "../types";

// Always use process.env.API_KEY as per Google GenAI SDK guidelines.
// This assumes the environment variable is properly configured and replaced during build.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates a warm, romantic summary of a memory.
 */
export const generateMemorySummary = async (memory: Memory): Promise<string> => {
  if (!process.env.API_KEY) return "請檢查環境變數 API_KEY 是否設定正確。";

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
    console.error("Gemini Error:", error);
    return "AI 暫時休息中，請稍後再試。";
  }
};

/**
 * Generates a creative story based on the couple's time together.
 */
export const generateCoupleStory = async (names: string, days: number): Promise<string> => {
  if (!process.env.API_KEY) return "請先設定 API_KEY 以解鎖 AI 故事功能。";

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
    console.error("Gemini Error:", error);
    return "AI 暫時休息中。";
  }
};

/**
 * Generates a short daily warm message.
 */
export const generateDailyMessage = async (names: string, days: number): Promise<string> => {
  if (!process.env.API_KEY) return "願你們今天也像彼此依靠的肩膀一樣溫暖。";

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
    return "願你們今天也像彼此依靠的肩膀一樣溫暖。";
  }
};

/**
 * Generates a monthly summary story (Structured).
 */
export const generateMonthlyStory = async (names: string, monthStr: string, memories: Memory[]): Promise<string> => {
  if (!process.env.API_KEY) return "請先設定 API_KEY 以生成月度回顧。";

  const memoryText = memories.map(m => `- ${m.date} ${m.title}: ${m.description}`).join('\n');

  try {
    const prompt = `
      請為 ${names} 寫一份關於 ${monthStr} 的「戀愛月報」。
      這是他們這個月的回憶片段：
      ${memoryText}
      
      請嚴格遵守以下四個段落格式輸出（每段約 50-80 字，繁體中文，語氣溫柔幽默）：

      【💌 暖心總結】
      (用一句話總結這個月的氛圍)

      【✨ 彼此的閃光點】
      (稱讚他們這個月做得好的地方)

      【🌱 我們可以更好】
      (溫柔地提出一個小小的相處建議)

      【💡 推薦一起做的事】
      (根據下個月的季節或這個月的遺憾，推薦一個約會點子)
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "無法生成故事。";
  } catch (error) {
    return "AI 暫時無法生成，請檢查 API Key 或網路。";
  }
};

/**
 * Generates a yearly summary story (Structured).
 */
export const generateYearlyStory = async (names: string, year: string, memories: Memory[]): Promise<string> => {
  if (!process.env.API_KEY) return "請先設定 API_KEY 以生成年度回顧。";

  // Summarize memories for context (limit length to avoid token limits)
  const memoryText = memories.slice(0, 50).map(m => `- ${m.date} ${m.title}`).join('\n');

  try {
    const prompt = `
      請為 ${names} 寫一份 ${year} 年的「年度戀愛報告」。
      這一年他們共同創造了 ${memories.length} 個回憶。
      回憶列表：
      ${memoryText}

      請嚴格遵守以下四個段落格式輸出（每段約 100 字，繁體中文，語氣感性且充滿希望）：

      【💌 年度關鍵字】
      (總結這一年的核心回憶與感情變化)

      【🏆 年度最佳時刻】
      (回顧最亮眼、最值得紀念的瞬間)

      【🌱 給彼此的一句話】
      (感謝對方的付出，並溫柔提出對未來的期許)

      【✨ 明年的願望清單】
      (推薦 1-2 個明年一定要一起完成的目標)
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "無法生成故事。";
  } catch (error) {
    return "AI 暫時無法生成，請檢查 API Key 或網路。";
  }
};

/**
 * Generates a congratulation card text for goal completion.
 */
export const generateGoalCompletionCard = async (goalTitle: string, names: string): Promise<string> => {
  if (!process.env.API_KEY) return "恭喜達成目標！";

  try {
    const prompt = `
      情侶 ${names} 剛剛完成了一個共同目標：「${goalTitle}」。
      請寫一段約 50-80 字的溫暖祝賀詞，讚美他們的努力與默契，並鼓勵他們繼續前進。
      語氣：興奮、甜蜜、鼓勵。
      語言：繁體中文。
    `;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text || "恭喜達成目標！";
  } catch (error) {
    return "恭喜達成目標！";
  }
};
