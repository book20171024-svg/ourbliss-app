
import React, { useState } from 'react';
import { useCouple } from '../context/CoupleContext';
import { Heart, Key, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Pairing: React.FC = () => {
  const { signIn } = useCouple();
  const [inputCode, setInputCode] = useState('');
  const [mode, setMode] = useState<'welcome' | 'join' | 'create'>('welcome');
  const navigate = useNavigate();

  const handleCreate = () => {
    // Generate a new random ID for demo purposes
    const newId = 'couple_' + Math.random().toString(36).substr(2, 9);
    signIn('partner1', newId);
    navigate('/');
  };

  const handleJoin = () => {
    if (inputCode.length > 3) {
      signIn('partner2', inputCode);
      navigate('/');
    }
  };

  if (mode === 'welcome') {
    return (
      <div className="min-h-screen bg-[#F7F3ED] flex flex-col items-center justify-center p-8 text-center">
        <div className="mb-8 relative">
           <div className="absolute inset-0 bg-[#D9B26D] blur-2xl opacity-20 rounded-full"></div>
           <Heart size={80} className="text-[#D9B26D] relative z-10 animate-pulse" fill="#D9B26D" />
        </div>
        
        <h1 className="text-3xl font-serif text-[#3A3A3A] mb-2">Our Bliss</h1>
        <p className="text-[#8A8A8A] mb-12 text-sm tracking-wide">紀錄我們最美好的時光</p>

        <button 
          onClick={handleCreate}
          className="w-full bg-[#D9B26D] text-white py-4 rounded-full shadow-lg soft-shadow mb-4 font-medium active:scale-95 transition-transform"
        >
          建立新空間
        </button>
        
        <button 
          onClick={() => setMode('join')}
          className="w-full bg-white text-[#D9B26D] border border-[#D9B26D] py-4 rounded-full font-medium active:scale-95 transition-transform"
        >
          我有邀請碼 (輸入 ID)
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F3ED] flex flex-col p-6">
      <button onClick={() => setMode('welcome')} className="text-[#C1C1C1] mb-8 text-left">
        ← 返回
      </button>

      <h2 className="text-2xl font-serif text-[#3A3A3A] mb-6">
        {mode === 'create' ? '建立專屬空間' : '加入另一半'}
      </h2>

      <div className="bg-white p-6 rounded-2xl shadow-sm mb-6">
        <label className="block text-xs text-[#8A8A8A] mb-2">輸入 ID</label>
        <div className="flex items-center border-b border-[#EAEAEA] py-2">
          <Key className="text-[#D9B26D] mr-3" size={20} />
          <input 
            type="text" 
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            placeholder="請輸入 ID..."
            className="flex-1 outline-none text-[#3A3A3A] bg-transparent"
          />
        </div>
      </div>

      <button 
        onClick={handleJoin}
        disabled={!inputCode}
        className={`w-full py-4 rounded-full font-medium flex items-center justify-center space-x-2 transition-all ${
          inputCode ? 'bg-[#D9B26D] text-white shadow-lg soft-shadow' : 'bg-[#EAEAEA] text-[#C1C1C1]'
        }`}
      >
        <span>開始旅程</span>
        <ArrowRight size={18} />
      </button>
    </div>
  );
};

export default Pairing;
