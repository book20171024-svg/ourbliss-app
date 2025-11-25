import React, { useState } from 'react';
import { useCouple } from '../context/CoupleContext';
import { generateCoupleStory } from '../services/geminiService';
import { Sparkles, BookHeart } from 'lucide-react';

const AIStory: React.FC = () => {
  const { coupleData } = useCouple();
  const [story, setStory] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!coupleData) return;
    setLoading(true);
    const names = `${coupleData.partner1Name} 和 ${coupleData.partner2Name}`;
    
    // Calculate days again
    const today = new Date();
    const ann = new Date(coupleData.anniversaryDate);
    const days = Math.ceil(Math.abs(today.getTime() - ann.getTime()) / (1000 * 60 * 60 * 24));

    const result = await generateCoupleStory(names, days);
    setStory(result);
    setLoading(false);
  };

  return (
    <div className="min-h-full p-6 flex flex-col items-center">
      <div className="w-16 h-16 bg-[#D9B26D]/10 rounded-full flex items-center justify-center mb-4">
        <Sparkles className="text-[#D9B26D]" size={32} />
      </div>
      <h2 className="text-2xl font-serif text-[#3A3A3A] mb-2">專屬 AI 故事</h2>
      <p className="text-[#8A8A8A] text-sm text-center mb-8 max-w-xs">
        讓 AI 為你們的 {coupleData?.partner1Name} & {coupleData?.partner2Name} 寫一段關於愛的微小說。
      </p>

      {!story && (
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="bg-[#D9B26D] text-white px-8 py-3 rounded-full font-medium shadow-lg soft-shadow active:scale-95 transition-transform flex items-center gap-2"
        >
          {loading ? '撰寫中...' : (
            <>
              <BookHeart size={20} />
              <span>開始生成</span>
            </>
          )}
        </button>
      )}

      {story && (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#EAEAEA] mt-4 w-full animate-fade-in relative">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#D9B26D] text-white text-[10px] px-3 py-1 rounded-full uppercase tracking-widest">
            Story
          </div>
          <p className="text-[#3A3A3A] leading-8 text-justify font-serif whitespace-pre-line">
            {story}
          </p>
          <button 
             onClick={() => setStory('')}
             className="mt-6 text-[#C1C1C1] text-xs w-full text-center hover:text-[#D9B26D]"
          >
            再寫一個
          </button>
        </div>
      )}
    </div>
  );
};

export default AIStory;
