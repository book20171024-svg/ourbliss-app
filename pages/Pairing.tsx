
import React, { useState } from 'react';
import { useCouple } from '../context/CoupleContext';
import { Heart, Key, ArrowRight, User, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Pairing: React.FC = () => {
  const { signIn } = useCouple();
  const [inputCode, setInputCode] = useState('');
  const [mode, setMode] = useState<'welcome' | 'join' | 'create'>('welcome');
  const [selectedRole, setSelectedRole] = useState<'partner1' | 'partner2' | null>(null);
  const navigate = useNavigate();

  const handleCreate = () => {
    // Generate a new random ID
    const newId = 'couple_' + Math.floor(100000000 + Math.random() * 900000000).toString();
    signIn('partner1', newId);
    navigate('/');
  };

  const handleJoin = () => {
    if (inputCode.length > 3 && selectedRole) {
      signIn(selectedRole, inputCode);
      navigate('/');
    }
  };

  if (mode === 'welcome') {
    return (
      <div className="min-h-screen bg-[#F7F3ED] flex flex-col items-center justify-center p-8 text-center animate-fade-in">
        <div className="mb-8 relative">
           <div className="absolute inset-0 bg-[#D9B26D] blur-3xl opacity-20 rounded-full"></div>
           <Heart size={80} className="text-[#D9B26D] relative z-10 animate-pulse" fill="#D9B26D" />
        </div>
        
        <h1 className="text-4xl font-serif text-[#3A3A3A] mb-2 font-bold">Our Bliss</h1>
        <p className="text-[#8A8A8A] mb-12 text-sm tracking-widest uppercase">紀錄我們最美好的時光</p>

        <div className="w-full space-y-4 max-w-sm">
          <button 
            onClick={handleCreate}
            className="w-full bg-[#D9B26D] text-white py-4 rounded-full shadow-xl soft-shadow font-bold text-sm active:scale-95 transition-transform"
          >
            建立新空間 (我是第一位)
          </button>
          
          <button 
            onClick={() => setMode('join')}
            className="w-full bg-white text-[#D9B26D] border border-[#EAEAEA] py-4 rounded-full font-bold text-sm shadow-sm active:scale-95 transition-transform"
          >
            我有 ID (加入 / 登入舊帳號)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F3ED] flex flex-col p-6 animate-slide-up">
      <button onClick={() => setMode('welcome')} className="text-[#C1C1C1] mb-8 text-left self-start">
        ← 返回
      </button>

      <h2 className="text-2xl font-serif font-bold text-[#3A3A3A] mb-2">
        {mode === 'create' ? '建立專屬空間' : '登入 / 加入空間'}
      </h2>
      <p className="text-xs text-[#8A8A8A] mb-8">請輸入你們的專屬 Couple ID</p>

      <div className="bg-white p-6 rounded-3xl shadow-sm mb-6 border border-[#EAEAEA]">
        <label className="block text-xs font-bold text-[#8A8A8A] mb-3 uppercase tracking-wider">輸入 ID</label>
        <div className="flex items-center border-b-2 border-[#F7F3ED] py-2 mb-6 focus-within:border-[#D9B26D] transition-colors">
          <Key className="text-[#D9B26D] mr-3" size={20} />
          <input 
            type="text" 
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            placeholder="例如: couple_123456789"
            className="flex-1 outline-none text-[#3A3A3A] bg-transparent font-medium"
          />
        </div>

        <label className="block text-xs font-bold text-[#8A8A8A] mb-3 uppercase tracking-wider">選擇您的身分</label>
        <div className="flex gap-3">
           <button 
             onClick={() => setSelectedRole('partner1')}
             className={`flex-1 py-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
               selectedRole === 'partner1' ? 'border-[#D9B26D] bg-[#FFF8E8] text-[#D9B26D]' : 'border-[#F7F3ED] bg-[#F9F9F9] text-[#C1C1C1]'
             }`}
           >
             <User size={20} />
             <span className="text-xs font-bold">伴侶 1 (大寶)</span>
           </button>
           <button 
             onClick={() => setSelectedRole('partner2')}
             className={`flex-1 py-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
               selectedRole === 'partner2' ? 'border-[#D9B26D] bg-[#FFF8E8] text-[#D9B26D]' : 'border-[#F7F3ED] bg-[#F9F9F9] text-[#C1C1C1]'
             }`}
           >
             <Users size={20} />
             <span className="text-xs font-bold">伴侶 2 (小寶)</span>
           </button>
        </div>
      </div>

      <button 
        onClick={handleJoin}
        disabled={!inputCode || !selectedRole}
        className={`w-full py-4 rounded-full font-bold flex items-center justify-center space-x-2 transition-all shadow-lg ${
          inputCode && selectedRole ? 'bg-[#D9B26D] text-white soft-shadow active:scale-95' : 'bg-[#EAEAEA] text-[#C1C1C1]'
        }`}
      >
        <span>進入空間</span>
        <ArrowRight size={18} />
      </button>
    </div>
  );
};

export default Pairing;
