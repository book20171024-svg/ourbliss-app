
import React, { useState, useEffect } from 'react';
import { useCouple } from '../context/CoupleContext';
import { MessageCircle, LogOut, Save, Gift, BookHeart, ChevronRight, Sparkles, User, Settings, Copy, Check, Download, Lock, ShieldCheck, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, writeBatch, doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

const More: React.FC = () => {
  const { coupleData, currentUserRole, updateCoupleData, signOut, coupleId } = useCouple();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);
  
  // App Lock State
  const [hasPin, setHasPin] = useState(!!localStorage.getItem('ourbliss_app_pin'));
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinInput, setPinInput] = useState('');

  const handleSave = async (p1: string, p2: string) => {
    await updateCoupleData({ partner1Name: p1, partner2Name: p2 });
  };

  const copyId = () => {
    if(coupleId) {
        navigator.clipboard.writeText(coupleId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleBackup = async () => {
    if (!coupleId) return;
    if (!confirm("確定要匯出所有資料嗎？這可能需要一點時間。")) return;

    setBackingUp(true);
    try {
        const data: any = { profile: coupleData, exportedAt: new Date().toISOString() };
        
        // Fetch Collections
        const collections = ['memories', 'events', 'goals', 'chatMessages', 'anniversaries'];
        for (const colName of collections) {
            const snap = await getDocs(collection(db, `couples/${coupleId}/${colName}`));
            data[colName] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `OurBliss_Backup_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error(err);
        alert("匯出失敗，請檢查網路。");
    } finally {
        setBackingUp(false);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !coupleId) return;
    
    if(!confirm("⚠️ 警告：還原資料將會寫入目前的帳號。建議您在還原前先備份目前的資料。確定要繼續嗎？")) {
        e.target.value = '';
        return;
    }

    setRestoring(true);
    const reader = new FileReader();
    
    reader.onload = async (event) => {
        try {
            const json = JSON.parse(event.target?.result as string);
            
            // 1. Restore Profile (Optional, mostly we keep current ID but update names if needed)
            // Not overwriting ID to allow restoring data to a NEW couple ID
            if(json.profile) {
                await updateCoupleData({
                    partner1Name: json.profile.partner1Name,
                    partner2Name: json.profile.partner2Name,
                    anniversaryDate: json.profile.anniversaryDate,
                    partner1Avatar: json.profile.partner1Avatar,
                    partner2Avatar: json.profile.partner2Avatar,
                    coverImage: json.profile.coverImage,
                });
            }

            // 2. Restore Collections
            const collections = ['memories', 'events', 'goals', 'chatMessages', 'anniversaries'];
            
            for (const colName of collections) {
                if (Array.isArray(json[colName])) {
                    for (const item of json[colName]) {
                        if (item.id) {
                           // Use setDoc to preserve original IDs or update existing ones
                           await setDoc(doc(db, `couples/${coupleId}/${colName}`, item.id), item);
                        }
                    }
                }
            }
            
            alert("✅ 資料還原成功！請重新整理頁面以查看最新內容。");
            window.location.reload();
            
        } catch (err) {
            console.error(err);
            alert("❌ 還原失敗：檔案格式錯誤或網路問題。");
        } finally {
            setRestoring(false);
            e.target.value = '';
        }
    };
    
    reader.readAsText(file);
  };

  const handlePinSubmit = () => {
    if (pinInput.length !== 4) return alert("請輸入 4 位數密碼");
    localStorage.setItem('ourbliss_app_pin', pinInput);
    setHasPin(true);
    setShowPinSetup(false);
    setPinInput('');
    alert("密碼鎖已設定！下次開啟 App 時需輸入密碼。");
  };

  const handleRemovePin = () => {
    if (!confirm("確定要移除密碼鎖嗎？")) return;
    localStorage.removeItem('ourbliss_app_pin');
    setHasPin(false);
  };

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

        {/* Privacy & Security */}
        <h3 className="text-xs font-bold text-[#8A8A8A] mb-3 ml-2 tracking-widest uppercase">隱私與安全</h3>
        <div className="bg-white rounded-3xl shadow-sm mb-6 overflow-hidden border border-[#EAEAEA] p-4">
           {hasPin ? (
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                      <ShieldCheck size={20} />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[#3A3A3A] font-bold text-sm">App 啟動密碼鎖</span>
                      <span className="text-[10px] text-green-600">已啟用保護</span>
                   </div>
                </div>
                <button onClick={handleRemovePin} className="text-xs text-red-400 border border-red-200 px-3 py-1.5 rounded-full hover:bg-red-50">
                   關閉
                </button>
             </div>
           ) : (
             !showPinSetup ? (
               <button onClick={() => setShowPinSetup(true)} className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-[#F7F3ED] text-[#C1C1C1] flex items-center justify-center">
                        <Lock size={20} />
                     </div>
                     <span className="text-[#3A3A3A] font-bold text-sm">開啟啟動密碼鎖</span>
                  </div>
                  <ChevronRight size={18} className="text-[#C1C1C1]" />
               </button>
             ) : (
               <div className="flex items-center gap-2 animate-fade-in">
                  <input 
                    type="password" 
                    maxLength={4}
                    placeholder="輸入4位數密碼"
                    className="flex-1 border-b border-[#D9B26D] outline-none text-center tracking-[1em] text-[#3A3A3A] font-bold py-2"
                    value={pinInput}
                    onChange={e => setPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                  />
                  <button onClick={handlePinSubmit} disabled={pinInput.length !== 4} className="bg-[#D9B26D] text-white px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-50">
                    設定
                  </button>
                  <button onClick={() => setShowPinSetup(false)} className="text-[#8A8A8A] px-2">取消</button>
               </div>
             )
           )}
        </div>

        {/* Settings */}
        <h3 className="text-xs font-bold text-[#8A8A8A] mb-3 ml-2 tracking-widest uppercase">系統設定</h3>
        <div className="bg-white rounded-3xl p-6 shadow-sm mb-6 space-y-6 border border-[#EAEAEA]">
          
          {/* Recovery Key Section */}
          <div className="bg-[#FFF8E8] p-4 rounded-2xl border border-[#D9B26D]/20">
             <label className="block text-[10px] text-[#D9B26D] font-bold mb-1 uppercase tracking-wide">帳號救援金鑰 (重要)</label>
             <p className="text-[10px] text-[#8A8A8A] mb-2">請務必複製保存此 ID。若更換手機或清除資料，需使用此 ID 登入才能找回回憶。</p>
             <button onClick={copyId} className="w-full flex justify-between items-center bg-white p-3 rounded-xl border border-[#D9B26D]/30 active:scale-95 transition-transform">
                 <span className="font-mono text-[#3A3A3A] font-bold text-sm tracking-wide">{coupleId}</span>
                 {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="text-[#D9B26D]" />}
             </button>
          </div>

          <div className="h-px bg-[#F7F3ED]" />

          <button 
             onClick={handleBackup} 
             disabled={backingUp}
             className="w-full flex items-center justify-between p-2 hover:bg-[#F9F9F9] rounded-lg transition-colors"
          >
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#EAEAEA] flex items-center justify-center text-[#8A8A8A]">
                   {backingUp ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                </div>
                <div className="text-left">
                    <span className="block text-sm font-bold text-[#3A3A3A]">{backingUp ? '打包中...' : '匯出全資料備份'}</span>
                    <span className="block text-[10px] text-[#C1C1C1]">下載 JSON 檔案</span>
                </div>
             </div>
          </button>
          
           <div className="relative">
             <button 
               onClick={() => setIsRestoreOpen(!isRestoreOpen)}
               className="w-full flex items-center justify-between p-2 hover:bg-[#F9F9F9] rounded-lg transition-colors"
             >
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#EAEAEA] flex items-center justify-center text-[#8A8A8A]">
                     {restoring ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  </div>
                  <div className="text-left">
                      <span className="block text-sm font-bold text-[#3A3A3A]">{restoring ? '還原中...' : '匯入備份資料'}</span>
                      <span className="block text-[10px] text-[#C1C1C1]">還原 JSON (覆蓋目前資料)</span>
                  </div>
               </div>
             </button>
             {isRestoreOpen && (
               <div className="mt-2 p-3 bg-[#F9F9F9] rounded-xl text-center">
                  <input type="file" accept=".json" onChange={handleRestore} disabled={restoring} className="text-xs text-[#8A8A8A]" />
               </div>
             )}
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

        <p className="text-center text-[#C1C1C1] text-[10px] mt-8">Our Bliss v2.6</p>
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
