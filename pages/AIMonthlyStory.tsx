import React, { useState, useEffect } from 'react';
import { useCouple } from '../context/CoupleContext';
import { db } from '../services/firebaseConfig';
import { collection, query, where, getDocs, setDoc, doc, onSnapshot } from 'firebase/firestore';
import { generateMonthlyStory } from '../services/geminiService';
import { Memory } from '../types';
import { Sparkles, ArrowLeft, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AIMonthlyStory: React.FC = () => {
  const { coupleData, coupleId } = useCouple();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [story, setStory] = useState('');
  
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  useEffect(() => {
    if (!coupleId) return;
    const ref = doc(db, `couples/${coupleId}/aiSummaries`, `monthly_${currentMonth}`);
    
    // Using onSnapshot to handle offline/online sync gracefully
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setStory(snap.data().content);
      }
    }, (error) => {
      console.warn("Offline or permission error:", error);
    });

    return () => unsubscribe();
  }, [coupleId, currentMonth]);

  const handleGenerate = async () => {
    if (!coupleId || !coupleData) return;
    
    if (!navigator.onLine) {
      alert("請檢查網路連線後再試。");
      return;
    }

    setLoading(true);

    try {
      // 1. Fetch memories from this month
      // Note: getDocs might fail if offline and not cached.
      const start = currentMonth + "-01";
      const end = currentMonth + "-31";
      const q = query(
        collection(db, `couples/${coupleId}/memories`),
        where("date", ">=", start),
        where("date", "<=", end)
      );
      
      const snap = await getDocs(q);
      const memories = snap.docs.map(d => d.data() as Memory);

      if (memories.length === 0) {
        setStory("這個月還沒有足夠的回憶來生成故事，快去紀錄吧！");
        setLoading(false);
        return;
      }

      // 2. Generate
      const names = `${coupleData.partner1Name} & ${coupleData.partner2Name}`;
      const result = await generateMonthlyStory(names, currentMonth, memories);
      
      // 3. Save
      await setDoc(doc(db, `couples/${coupleId}/aiSummaries`, `monthly_${currentMonth}`), {
        content: result,
        generatedAt: new Date().toISOString()
      });
      // The onSnapshot listener will update the story state.

    } catch (e) {
      console.error(e);
      setStory("生成失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full p-6 flex flex-col bg-[#F7F3ED]">
      <button onClick={() => navigate(-1)} className="self-start text-[#C1C1C1] mb-6">
        <ArrowLeft size={24} />
      </button>

      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-[#D9B26D]/10 rounded-full flex items-center justify-center mb-4">
          <Calendar className="text-[#D9B26D]" size={32} />
        </div>
        <h2 className="text-2xl font-serif text-[#3A3A3A] mb-1">{currentMonth} 月回顧</h2>
        <p className="text-[#8A8A8A] text-sm mb-8">專屬你們的每月時光膠囊</p>

        {!story ? (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-[#D9B26D] text-white px-8 py-3 rounded-full font-medium shadow-lg soft-shadow active:scale-95 transition-transform flex items-center gap-2"
          >
            {loading ? '回憶整理中...' : (
              <>
                <Sparkles size={20} />
                <span>生成本月故事</span>
              </>
            )}
          </button>
        ) : (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#EAEAEA] w-full animate-fade-in relative">
            <p className="text-[#3A3A3A] leading-8 text-justify font-serif whitespace-pre-line">
              {story}
            </p>
            <div className="mt-6 pt-4 border-t border-[#F7F3ED] text-center">
              <span className="text-[10px] text-[#C1C1C1] uppercase tracking-widest">Our Bliss AI Memory</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIMonthlyStory;