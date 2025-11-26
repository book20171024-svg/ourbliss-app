
import React, { useState } from 'react';
import { useCouple } from '../context/CoupleContext';
import { MessageCircle, LogOut, Save, Gift, BookHeart, ChevronRight, Sparkles, User, Settings, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const More: React.FC = () => {
  const { coupleData, currentUserRole, updateCoupleData, signOut, coupleId } = useCouple();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleSave = async (p1: string, p2: string) => {
    await updateCoupleData({ partner1Name: p1, partner2Name: p2 });
  };

  const copyId = () => {
    if(coupleId) {
        navigator.clipboard.writeText(coupleId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="h-full w-full overflow-y-auto hide-scrollbar bg-[#F7F3ED]">
      <div className="p-6 pb-32">
        <h2 className="text-2xl font-serif text-[#3A3A3A] mb-6 font-bold">更多</h2>

        {/* Feature Links */}
        <div className="bg-white rounded-3xl shadow-sm mb-6 overflow-hidden border border-[#EAEAEA]">
          <MenuItem 
            icon={MessageCircle} 
            label="聊天室" 
            onClick={() => navigate('/chat')} 
            color="#D9B26D"
          />
          <div className="h-px bg-[#F7F3ED] mx-4" />
          <MenuItem 
            icon={Gift} 
            label="紀念日管理" 
            onClick={() => navigate('/anniversaries')} 
            color="#E8C88B"
          />
        </div>

        <h3 className="text-xs font-bold text-[#8A8A8A] mb-3 ml-2 tracking-widest uppercase">AI 實驗室</h3>
        <div className="bg-white rounded-3xl shadow-sm mb-6 overflow-hidden border border-[#EAEAEA]">
          <MenuItem 
            icon={Sparkles} 
            label="AI 月度回顧" 
            onClick={() => navigate('/ai-monthly-story')} 
            color="#8AB4F8"
          />
           <div className="h-px bg-[#F7F3ED] mx-4" />
          <MenuItem 
            icon={BookHeart} 
            label="AI 年度故事" 
            onClick={() => navigate('/ai-yearly-story')} 
            color="#F28B82"
          />
        </div>

        {/* Settings */}
        <h3 className="text-xs font-bold text-[#8A8A8A] mb-3 ml-2 tracking-widest uppercase">設定 & 安全</h3>
        <div className="bg-white rounded-3xl p-6 shadow-sm mb-6 space-y-6 border border-[#EAEAEA]">
          
          {/* Recovery Key Section - Important for safety */}
          <div className="bg-[#FFF8E8] p-4 rounded-2xl border border-[#D9B26D]/20">
             <label className="block text-[10px] text-[#D9B26D] font-bold mb-1 uppercase tracking-wide">帳號救援金鑰 (重要)</label>
             <p className="text-[10px] text-[#8A8A8A] mb-2">請務必複製保存此 ID。若更換手機或清除資料，需使用此 ID 登入才能找回回憶。</p>
             <button onClick={copyId} className="w-full flex justify-between items-center bg-white p-3 rounded-xl border border-[#D9B26D]/30 active:scale-95 transition-transform">
                 <span className="font-mono text-[#3A3A3A] font-bold text-sm tracking-wide">{coupleId}</span>
                 {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="text-[#D9B26D]" />}
             </button>
          </div>

          <div className="h-px bg-[#F7F3ED]" />

          <div className="flex gap-4">
            <div className="flex-1">
               <label className="block text-xs text-[#8A8A8A] mb-2">伴侶 1 暱稱</label>
               <input 
                 className="w-full border-b border-[#EAEAEA] py-2 outline-none text-sm font-medium text-[#3A3A3A] focus:border-[#D9B26D] transition-colors" 
                 defaultValue={coupleData?.partner1Name}
                 onBlur={(e) => handleSave(e.target.value, coupleData?.partner2Name || '')}
                 disabled={currentUserRole !== 'partner1'}
               />
            </div>
            <div className="flex-1">
               <label className="block text-xs text-[#8A8A8A] mb-2">伴侶 2 暱稱</label>
               <input 
                 className="w-full border-b border-[#EAEAEA] py-2 outline-none text-sm font-medium text-[#3A3A3A] focus:border-[#D9B26D] transition-colors" 
                 defaultValue={coupleData?.partner2Name}
                 onBlur={(e) => handleSave(coupleData?.partner1Name || '', e.target.value)}
                 disabled={currentUserRole !== 'partner2'}
               />
            </div>
          </div>
        </div>

        <button 
          onClick={() => { signOut(); navigate('/pairing'); }}
          className="w-full bg-white text-red-400 border border-red-100 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-50 text-sm active:scale-95 transition-transform"
        >
          <LogOut size={16} />
          登出 / 切換帳號
        </button>

        <p className="text-center text-[#C1C1C1] text-[10px] mt-8">Our Bliss v2.2 (Optimized)</p>
      </div>
    </div>
  );
};

const MenuItem: React.FC<{ icon: any, label: string, onClick: () => void, color: string }> = ({ icon: Icon, label, onClick, color }) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center justify-between p-4 hover:bg-[#F7F3ED]/50 transition-colors group"
  >
    <div className="flex items-center gap-4">
       <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: color }}>
         <Icon size={18} />
       </div>
       <span className="text-[#3A3A3A] font-medium text-sm">{label}</span>
    </div>
    <ChevronRight size={18} className="text-[#C1C1C1] group-hover:text-[#D9B26D] transition-colors" />
  </button>
);

export default More;
