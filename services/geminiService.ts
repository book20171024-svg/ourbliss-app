
import { GoogleGenAI } from "@google/genai";
import { Memory } from "../types";

// ⚠️ IMPORTANT: In Vercel Environment Variables, please set the key name to 'API_KEY'
// ⚠️ 重要：請在 Vercel 的 Environment Variables 中，將變數名稱設為 'API_KEY'
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates a warm, romantic summary of a memory.
 */
export const generateMemorySummary = async (memory: Memory): Promise<string> => {
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
 * Generates a monthly summary story.
 */
export const generateMonthlyStory = async (names: string, monthStr: string, memories: Memory[]): Promise<string> => {
  const memoryText = memories.map(m => `- ${m.date} ${m.title}: ${m.description}`).join('\n');

  try {
    const prompt = `
      請為 ${names} 寫一段關於 ${monthStr} 的月度回顧故事。
      這是他們這個月發生的事：
      ${memoryText}
      
      請將這些片段串成一個溫馨的故事，強調兩人的連結與成長。
      若回憶較少，請發揮創意補足溫馨的氛圍。
      繁體中文，200-300字。
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
 * Generates a yearly summary story.
 */
export const generateYearlyStory = async (names: string, year: string, memories: Memory[]): Promise<string> => {
  // Summarize memories for context (limit length to avoid token limits)
  const memoryText = memories.slice(0, 50).map(m => `- ${m.date} ${m.title}`).join('\n');

  try {
    const prompt = `
      請為 ${names} 寫一段關於 ${year} 年的年度總結故事。
      這一年他們共同創造了 ${memories.length} 個美好回憶。
      部分回憶標題如下：
      ${memoryText}

      請寫一段感謝彼此陪伴、回顧重點時刻、並展望未來的感人信件風格文章。
      繁體中文，400字左右。
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
