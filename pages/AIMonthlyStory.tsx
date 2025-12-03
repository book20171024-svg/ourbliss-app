
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
  
  // Allow user to select month (Default to current month)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    if (!coupleId) return;
    const ref = doc(db, `couples/${coupleId}/aiSummaries`, `monthly_${selectedMonth}`);
    
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setStory(snap.data().content);
      } else {
        setStory(''); // Reset story if none exists for this month
      }
    }, (error) => {
      console.warn("Offline or permission error:", error);
    });

    return () => unsubscribe();
  }, [coupleId, selectedMonth]);

  const handleGenerate = async () => {
    if (!coupleId || !coupleData) return;
    
    if (!navigator.onLine) {
      alert("請檢查網路連線後再試。");
      return;
    }

    setLoading(true);

    try {
      const start = selectedMonth + "-01";
      const [y, m] = selectedMonth.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      const end = selectedMonth + `-${lastDay}`;

      const q = query(
        collection(db, `couples/${coupleId}/memories`),
        where("date", ">=", start),
        where("date", "<=", end)
      );
      
      const snap = await getDocs(q);
      const memories = snap.docs.map(d => d.data() as Memory);

      if (memories.length === 0) {
        setStory(`在 ${selectedMonth} 這個月還沒有找到回憶，無法生成故事。請先去「更多」匯入回憶，或選擇其他月份！`);
        setLoading(false);
        return;
      }

      const names = `${coupleData.partner1Name} & ${coupleData.partner2Name}`;
      const result = await generateMonthlyStory(names, selectedMonth, memories);
      
      await setDoc(doc(db, `couples/${coupleId}/aiSummaries`, `monthly_${selectedMonth}`), {
        content: result,
        generatedAt: new Date().toISOString()
      });

    } catch (e) {
      console.error(e);
      setStory("生成失敗，請檢查 API Key 是否正確。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#F7F3ED] overflow-hidden">
      {/* Fixed Header */}
      <div className="p-6 pb-2 flex-shrink-0 z-10 bg-[#F7F3ED]">
        <button onClick={() => navigate(-1)} className="self-start text-[#C1C1C1] mb-6 p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-[#D9B26D]/10 rounded-full flex items-center justify-center mb-4 shadow-inner">
            <Calendar className="text-[#D9B26D]" size={32} />
          </div>
          
          <div className="mb-4">
             <input 
               type="month" 
               value={selectedMonth}
               onChange={(e) => setSelectedMonth(e.target.value)}
               className="bg-white border border-[#EAEAEA] px-4 py-2 rounded-xl text-[#3A3A3A] font-serif font-bold outline-none focus:border-[#D9B26D] shadow-sm"
             />
          </div>

          <p className="text-[#8A8A8A] text-sm">專屬你們的每月時光膠囊</p>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-6 pb-32 w-full">
        {!story ? (
          <div className="flex justify-center mt-12">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="bg-[#D9B26D] text-white px-8 py-3 rounded-full font-medium shadow-lg soft-shadow active:scale-95 transition-transform flex items-center gap-2"
            >
              {loading ? 'AI 閱讀回憶中...' : (
                <>
                  <Sparkles size={20} />
                  <span>生成本月故事</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#EAEAEA] w-full animate-fade-in relative mt-4 mb-10">
            {/* Structured Text Rendering */}
            <div className="text-[#3A3A3A] leading-8 text-justify font-serif whitespace-pre-line">
              {story.split('【').map((section, index) => {
                if (index === 0) return section; // Text before first header
                const parts = section.split('】');
                const title = parts[0];
                const content = parts.slice(1).join('】');
                return (
                  <div key={index} className="mb-6 last:mb-0">
                    <h3 className="text-[#D9B26D] font-bold text-lg mb-2">【{title}】</h3>
                    <p>{content.trim()}</p>
                  </div>
                );
              })}
              {/* Fallback if format doesn't match */}
              {!story.includes('【') && story}
            </div>

            <div className="mt-6 pt-4 border-t border-[#F7F3ED] text-center flex justify-between items-center">
              <span className="text-[10px] text-[#C1C1C1] uppercase tracking-widest">Our Bliss AI Memory</span>
              <button 
                onClick={handleGenerate}
                disabled={loading}
                className="text-xs text-[#D9B26D] font-bold px-3 py-1 bg-[#F9F9F9] rounded-lg hover:bg-[#FFF8E8]"
              >
                {loading ? '...' : '重新生成'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIMonthlyStory;
