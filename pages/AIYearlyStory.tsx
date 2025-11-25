import React, { useState, useEffect } from 'react';
import { useCouple } from '../context/CoupleContext';
import { db } from '../services/firebaseConfig';
import { collection, getCountFromServer, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { generateYearlyStory } from '../services/geminiService';
import { Sparkles, ArrowLeft, Book } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AIYearlyStory: React.FC = () => {
  const { coupleData, coupleId } = useCouple();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [story, setStory] = useState('');
  
  const currentYear = new Date().getFullYear().toString();

  useEffect(() => {
    if (!coupleId) return;
    const ref = doc(db, `couples/${coupleId}/aiSummaries`, `yearly_${currentYear}`);
    
    // Switch to onSnapshot to avoid "offline" errors from getDoc
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setStory(snap.data().content);
      }
    }, (error) => {
       console.warn("Snapshot error:", error);
    });
    
    return () => unsubscribe();
  }, [coupleId, currentYear]);

  const handleGenerate = async () => {
    if (!coupleId || !coupleData) return;
    
    if (!navigator.onLine) {
        alert("請檢查網路連線後再試。");
        return;
    }
    
    setLoading(true);

    try {
      // Get count of memories
      const coll = collection(db, `couples/${coupleId}/memories`);
      // getCountFromServer requires network; fallbacks might be needed in full offline mode
      // but for generating AI story, we assume online.
      const snapshot = await getCountFromServer(coll);
      const count = snapshot.data().count;

      if (count === 0) {
        setStory("這一年還沒有紀錄回憶，無法生成故事。");
        setLoading(false);
        return;
      }

      // Generate
      const names = `${coupleData.partner1Name} & ${coupleData.partner2Name}`;
      const result = await generateYearlyStory(names, currentYear, count);
      
      // Save
      await setDoc(doc(db, `couples/${coupleId}/aiSummaries`, `yearly_${currentYear}`), {
        content: result,
        generatedAt: new Date().toISOString()
      });
      // State updates via onSnapshot

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
          <Book className="text-[#D9B26D]" size={32} />
        </div>
        <h2 className="text-2xl font-serif text-[#3A3A3A] mb-1">{currentYear} 年度故事</h2>
        <p className="text-[#8A8A8A] text-sm mb-8">獻給你們的一年總結</p>

        {!story ? (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-[#D9B26D] text-white px-8 py-3 rounded-full font-medium shadow-lg soft-shadow active:scale-95 transition-transform flex items-center gap-2"
          >
            {loading ? '撰寫中...' : (
              <>
                <Sparkles size={20} />
                <span>生成年度故事</span>
              </>
            )}
          </button>
        ) : (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#EAEAEA] w-full animate-fade-in relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#3A3A3A] text-white text-[10px] px-3 py-1 rounded-full uppercase tracking-widest">
              Yearly Report
            </div>
            <p className="text-[#3A3A3A] leading-8 text-justify font-serif whitespace-pre-line mt-2">
              {story}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIYearlyStory;