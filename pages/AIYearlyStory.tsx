
import React, { useState, useEffect } from 'react';
import { useCouple } from '../context/CoupleContext';
import { db } from '../services/firebaseConfig';
import { collection, doc, setDoc, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { generateYearlyStory } from '../services/geminiService';
import { Sparkles, ArrowLeft, Book, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Memory } from '../types';

const AIYearlyStory: React.FC = () => {
  const { coupleData, coupleId } = useCouple();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [story, setStory] = useState('');
  
  // Allow user to select year
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!coupleId) return;
    const ref = doc(db, `couples/${coupleId}/aiSummaries`, `yearly_${selectedYear}`);
    
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setStory(snap.data().content);
      } else {
        setStory(''); // Reset if no story for this year
      }
    }, (error) => {
       console.warn("Snapshot error:", error);
    });
    
    return () => unsubscribe();
  }, [coupleId, selectedYear]);

  const handleGenerate = async () => {
    if (!coupleId || !coupleData) return;
    
    if (!navigator.onLine) {
        alert("請檢查網路連線後再試。");
        return;
    }
    
    setLoading(true);

    try {
      // Fetch memories ONLY for that year
      const start = `${selectedYear}-01-01`;
      const end = `${selectedYear}-12-31`;
      
      const q = query(
        collection(db, `couples/${coupleId}/memories`),
        where("date", ">=", start),
        where("date", "<=", end)
      );

      const snap = await getDocs(q);
      const memories = snap.docs.map(d => d.data() as Memory);
      const count = memories.length;

      if (count === 0) {
        setStory(`${selectedYear} 年還沒有找到回憶，無法生成故事。請先去「更多」匯入該年份的回憶！`);
        setLoading(false);
        return;
      }

      // Generate
      const names = `${coupleData.partner1Name} & ${coupleData.partner2Name}`;
      const result = await generateYearlyStory(names, selectedYear.toString(), memories);
      
      // Save
      await setDoc(doc(db, `couples/${coupleId}/aiSummaries`, `yearly_${selectedYear}`), {
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

  const changeYear = (offset: number) => {
    setSelectedYear(prev => prev + offset);
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
            <Book className="text-[#D9B26D]" size={32} />
          </div>
          
          {/* Year Selector */}
          <div className="flex items-center gap-4 mb-2">
              <button onClick={() => changeYear(-1)} className="p-2 bg-white rounded-full shadow-sm text-[#C1C1C1] hover:text-[#D9B26D] active:scale-95 transition-transform">
                  <ChevronLeft size={20} />
              </button>
              <h2 className="text-2xl font-serif text-[#3A3A3A] font-bold tracking-wide">{selectedYear} 年度故事</h2>
              <button onClick={() => changeYear(1)} disabled={selectedYear >= new Date().getFullYear()} className="p-2 bg-white rounded-full shadow-sm text-[#C1C1C1] hover:text-[#D9B26D] disabled:opacity-30 active:scale-95 transition-transform">
                  <ChevronRight size={20} />
              </button>
          </div>

          <p className="text-[#8A8A8A] text-sm">獻給你們的一年總結</p>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-32 w-full">
        {!story ? (
          <div className="flex justify-center mt-12">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="bg-[#D9B26D] text-white px-8 py-3 rounded-full font-medium shadow-lg soft-shadow active:scale-95 transition-transform flex items-center gap-2"
            >
              {loading ? 'AI 回顧中...' : (
                <>
                  <Sparkles size={20} />
                  <span>生成年度故事</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#EAEAEA] w-full animate-fade-in relative mt-4 mb-10">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#3A3A3A] text-white text-[10px] px-3 py-1 rounded-full uppercase tracking-widest">
              Yearly Report
            </div>
            <p className="text-[#3A3A3A] leading-8 text-justify font-serif whitespace-pre-line mt-4">
              {story}
            </p>
            <div className="mt-8 pt-6 border-t border-[#F7F3ED] text-center flex justify-between items-center">
              <span className="text-[10px] text-[#C1C1C1] uppercase tracking-widest">Our Bliss</span>
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

export default AIYearlyStory;
