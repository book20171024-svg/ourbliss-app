
import React, { useState, useEffect } from 'react';
import { useCouple } from '../context/CoupleContext';
import { MessageCircle, LogOut, Save, Gift, BookHeart, ChevronRight, Sparkles, User, Settings, Copy, Check, Download, Lock, ShieldCheck, Loader2, FileText, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, writeBatch, doc, setDoc, addDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import packageJson from '../../package.json'; // Ensure this exists or hardcode version

const More: React.FC = () => {
  const { coupleData, currentUserRole, updateCoupleData, signOut, coupleId } = useCouple();
  const navigate = useNavigate();
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [editName, setEditName] = useState('');
  
  // App Lock
  const [hasPin, setHasPin] = useState(!!localStorage.getItem('ourbliss_app_pin'));
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinInput, setPinInput] = useState('');

  // Backup & Restore
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  
  // Batch Import
  const [showBatchImport, setShowBatchImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (coupleData) {
      if (currentUserRole === 'partner1') setEditName(coupleData.partner1Name);
      else setEditName(coupleData.partner2Name);
    }
  }, [coupleData, currentUserRole]);

  const handleSaveProfile = async () => {
    if (!editName.trim()) return;
    if (currentUserRole === 'partner1') await updateCoupleData({ partner1Name: editName });
    else await updateCoupleData({ partner2Name: editName });
    setShowSettings(false);
  };

  const handleCopyId = () => {
    if (coupleId) {
      navigator.clipboard.writeText(coupleId).then(() => {
        alert("Couple ID 已複製！");
      }).catch(() => {
        alert("複製失敗，請長按下方 ID 手動複製");
      });
    }
  };

  // --- App Lock Logic ---
  const handleSetPin = (num: string) => {
    if (pinInput.length < 4) {
      const newPin = pinInput + num;
      setPinInput(newPin);
      if (newPin.length === 4) {
        localStorage.setItem('ourbliss_app_pin', newPin);
        setHasPin(true);
        setShowPinSetup(false);
        setPinInput('');
        alert("密碼鎖已設定！下次開啟 App 需輸入密碼。");
      }
    }
  };

  const handleRemovePin = () => {
    if (confirm("確定要移除密碼鎖嗎？")) {
      localStorage.removeItem('ourbliss_app_pin');
      setHasPin(false);
    }
  };

  // --- Backup Logic ---
  const handleBackup = async () => {
    if (!coupleId) return;
    if (!confirm("確定要匯出全資料備份嗎？這可能需要一點時間。")) return;

    setIsBackingUp(true);
    try {
      alert("⏳ 正在打包所有回憶與資料，請稍候...");
      const backupData: any = {
        meta: {
          exportDate: new Date().toISOString(),
          coupleId: coupleId,
          version: '3.1'
        },
        profile: coupleData,
      };

      // Fetch Collections
      const collections = ['memories', 'events', 'goals', 'chatMessages', 'anniversaries'];
      for (const colName of collections) {
        const snap = await getDocs(collection(db, `couples/${coupleId}/${colName}`));
        backupData[colName] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      // Trigger Download
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `ourbliss_backup_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      
      alert("✅ 下載已開始！請妥善保存您的備份檔案。");
    } catch (e) {
      console.error(e);
      alert("備份失敗，請稍後再試。");
    } finally {
      setIsBackingUp(false);
    }
  };

  // --- Restore Logic ---
  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !coupleId) return;

    if (!confirm("⚠️ 警告：還原操作會將備份檔案中的資料寫入目前的帳號。\n確定要繼續嗎？")) {
       e.target.value = ''; // clear input
       return;
    }

    setIsRestoring(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.meta || !json.meta.coupleId) {
          throw new Error("無效的備份檔案格式");
        }

        const batch = writeBatch(db);
        let opCount = 0;
        const MAX_BATCH = 450; 

        // Helper to commit and reset batch
        const checkBatch = async () => {
           opCount++;
           if (opCount >= MAX_BATCH) {
             await batch.commit();
             opCount = 0;
           }
        };

        // 1. Restore Profile (Optional, maybe manually skip)
        // await updateCoupleData(json.profile);

        // 2. Restore Collections
        const collections = ['memories', 'events', 'goals', 'chatMessages', 'anniversaries'];
        for (const colName of collections) {
          if (json[colName] && Array.isArray(json[colName])) {
             for (const item of json[colName]) {
                const { id, ...data } = item;
                const ref = doc(db, `couples/${coupleId}/${colName}`, id || Date.now().toString());
                batch.set(ref, data);
                await checkBatch();
             }
          }
        }
        
        if (opCount > 0) await batch.commit();
        
        alert("✅ 資料還原成功！請重新整理頁面。");
        window.location.reload();

      } catch (err) {
        console.error(err);
        alert("還原失敗：檔案格式錯誤或網路問題");
      } finally {
        setIsRestoring(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  // --- Batch Import Logic (Improved Regex) ---
  const handleBatchImport = async () => {
    if (!importText.trim()) return;
    setIsImporting(true);
    
    try {
      // Split by '【日期】' to separate entries. 
      const blocks = importText.split(/(?=【日期】)/).filter(b => b.trim().length > 0);

      if (blocks.length === 0) {
         alert("❌ 找不到【日期】標籤，請確認格式。");
         setIsImporting(false);
         return;
      }

      alert(`⏳ 偵測到 ${blocks.length} 筆資料，開始匯入...`);
      
      let successCount = 0;

      for (const block of blocks) {
         const getTagContent = (tagName: string) => {
            const regex = new RegExp(`【${tagName}】\\s*([\\s\\S]*?)(?=\\n+【|$)`, 'i');
            const match = block.match(regex);
            return match ? match[1].trim() : '';
         };

         // 1. Parse Date
         let dateRaw = getTagContent('日期'); // e.g., 2019/10/20（週日）
         // Clean: remove brackets content, replace / with -
         let dateStr = dateRaw.replace(/[\(（].*?[\)）]/g, '').trim().replace(/\//g, '-');
         
         if (!dateStr || dateStr.length < 8) {
             console.warn("Skipping block due to invalid date:", dateRaw);
             continue;
         }

         // 2. Parse Title
         const title = getTagContent('標題') || '未命名回憶';

         // 3. Parse Location
         let location = getTagContent('地點');
         if (location.includes('留空') || location.includes('待補')) location = '';

         // 4. Parse Content
         const description = getTagContent('內容');

         // 5. Parse Partner Comment
         const partnerComment = getTagContent('對方留言');

         // Save Memory
         const memRef = await addDoc(collection(db, `couples/${coupleId}/memories`), {
            title,
            date: dateStr,
            location,
            description,
            mood: 'happy',
            images: [], 
            likes: [],
            importedAt: new Date().toISOString()
         });

         // Save Comment if exists
         if (partnerComment && !partnerComment.includes('無') && !partnerComment.includes('待補')) {
             const partnerRole = currentUserRole === 'partner1' ? 'partner2' : 'partner1';
             await addDoc(collection(db, `couples/${coupleId}/memories/${memRef.id}/comments`), {
                senderId: partnerRole,
                text: partnerComment,
                timestamp: Date.now()
             });
         }
         
         successCount++;
      }

      alert(`🎉 成功匯入 ${successCount} 筆回憶！`);
      setImportText('');
      setShowBatchImport(false);
      navigate('/memories');

    } catch (e) {
      console.error(e);
      alert("匯入發生錯誤，請檢查格式。");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="h-full bg-[#F7F3ED] overflow-y-auto p-6 pb-24 relative">
      <header className="mb-8">
        <h2 className="text-3xl font-serif font-bold text-[#3A3A3A]">更多設定</h2>
        <p className="text-[#8A8A8A] text-sm mt-1">v3.1 (Stable)</p>
      </header>

      {/* Profile Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#EAEAEA] mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#F7F3ED] border-2 border-white shadow-md overflow-hidden">
             <img src={currentUserRole === 'partner1' ? coupleData?.partner1Avatar : coupleData?.partner2Avatar} className="w-full h-full object-cover" alt="avatar" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-[#3A3A3A]">{currentUserRole === 'partner1' ? coupleData?.partner1Name : coupleData?.partner2Name}</h3>
            <p className="text-xs text-[#8A8A8A] uppercase tracking-wider">{currentUserRole === 'partner1' ? 'Partner 1' : 'Partner 2'}</p>
          </div>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-3 bg-[#F9F9F9] rounded-full text-[#C1C1C1] hover:text-[#D9B26D] hover:bg-[#FFF8E8] transition-colors">
          <Settings size={20} />
        </button>
      </div>

      <div className="space-y-4">
        {/* Features Section */}
        <h3 className="text-xs font-bold text-[#8A8A8A] uppercase tracking-widest ml-1">AI Features</h3>
        <div className="grid grid-cols-2 gap-4">
           {/* Link to Yearly Story now */}
           <button onClick={() => navigate('/ai-yearly-story')} className="bg-white p-4 rounded-2xl border border-[#EAEAEA] shadow-sm flex flex-col items-center gap-2 active:scale-95 transition-transform">
              <BookHeart size={24} className="text-[#D9B26D]" />
              <span className="text-sm font-bold text-[#3A3A3A]">年度回顧</span>
           </button>
           <button onClick={() => navigate('/ai-monthly-story')} className="bg-white p-4 rounded-2xl border border-[#EAEAEA] shadow-sm flex flex-col items-center gap-2 active:scale-95 transition-transform">
              <Sparkles size={24} className="text-[#D9B26D]" />
              <span className="text-sm font-bold text-[#3A3A3A]">每月回顧</span>
           </button>
        </div>

        {/* Data Management Section */}
        <h3 className="text-xs font-bold text-[#8A8A8A] uppercase tracking-widest ml-1 mt-6">Data & Privacy</h3>
        <div className="bg-white rounded-2xl border border-[#EAEAEA] overflow-hidden">
           <button onClick={() => setShowBatchImport(true)} className="w-full flex items-center justify-between p-4 border-b border-[#F7F3ED] active:bg-[#F9F9F9]">
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-[#D9B26D]" />
                <span className="text-sm font-bold text-[#3A3A3A]">快速匯入回憶 (貼上文字)</span>
              </div>
              <ChevronRight size={16} className="text-[#C1C1C1]" />
           </button>
           
           {/* Account Recovery Key - Visible */}
           <div className="p-4 border-b border-[#F7F3ED] flex flex-col gap-2">
              <div className="flex items-center justify-between" onClick={handleCopyId}>
                <div className="flex items-center gap-3">
                  <Copy size={20} className="text-[#D9B26D]" />
                  <span className="text-sm font-bold text-[#3A3A3A]">帳號救援金鑰 (ID)</span>
                </div>
                <span className="text-[10px] text-[#D9B26D] bg-[#FFF8E8] px-2 py-1 rounded-full">點擊複製</span>
              </div>
              <div className="bg-[#F9F9F9] p-3 rounded-lg text-center mt-1">
                 <p className="text-xs font-mono text-[#8A8A8A] select-all tracking-wider break-all">
                    {coupleId}
                 </p>
              </div>
           </div>

           {/* Backup (Export) - Up Arrow */}
           <div className="p-4 border-b border-[#F7F3ED] flex flex-col gap-3">
               <button 
                 onClick={handleBackup} 
                 disabled={isBackingUp}
                 className="flex items-center gap-3 w-full text-left"
               >
                 {isBackingUp ? <Loader2 size={20} className="text-[#D9B26D] animate-spin" /> : <Upload size={20} className="text-[#D9B26D]" />}
                 <span className="text-sm font-bold text-[#3A3A3A]">匯出全資料備份 (.json)</span>
               </button>
           </div>
           
           {/* Restore (Import) - Down Arrow */}
           <div className="p-4 border-b border-[#F7F3ED] flex flex-col gap-3">
               <label className="flex items-center gap-3 w-full text-left cursor-pointer">
                 {isRestoring ? <Loader2 size={20} className="text-red-400 animate-spin" /> : <Download size={20} className="text-[#D9B26D]" />}
                 <span className="text-sm font-bold text-[#3A3A3A]">匯入備份 (還原資料)</span>
                 <input type="file" accept=".json" onChange={handleRestore} className="hidden" disabled={isRestoring} />
               </label>
           </div>

           <button 
             onClick={() => hasPin ? handleRemovePin() : setShowPinSetup(true)} 
             className="w-full flex items-center justify-between p-4 active:bg-[#F9F9F9]"
           >
              <div className="flex items-center gap-3">
                {hasPin ? <ShieldCheck size={20} className="text-green-500" /> : <Lock size={20} className="text-[#C1C1C1]" />}
                <div className="text-left">
                  <span className="text-sm font-bold text-[#3A3A3A] block">啟動密碼鎖 (App Lock)</span>
                  <span className="text-[10px] text-[#8A8A8A] block">{hasPin ? '已開啟' : '未設定'}</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-[#C1C1C1]" />
           </button>
        </div>

        <button onClick={signOut} className="w-full bg-[#FFF5F5] text-red-400 py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 mt-8">
           <LogOut size={18} /> 登出空間
        </button>
      </div>

      {/* Edit Name Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-[#F7F3ED] flex flex-col animate-slide-up">
           <div className="px-6 py-4 bg-white/80 backdrop-blur-md flex justify-between items-center shadow-sm border-b border-[#EAEAEA]">
             <button onClick={() => setShowSettings(false)} className="text-[#8A8A8A]">取消</button>
             <h3 className="font-bold text-[#3A3A3A]">編輯個人檔案</h3>
             <button onClick={handleSaveProfile} className="text-[#D9B26D] font-bold">儲存</button>
           </div>
           <div className="p-6">
              <label className="text-xs font-bold text-[#8A8A8A] mb-2 block uppercase">顯示名稱</label>
              <input 
                value={editName} 
                onChange={e => setEditName(e.target.value)} 
                className="w-full p-4 bg-white rounded-xl border border-[#EAEAEA] outline-none font-bold text-[#3A3A3A]"
              />
           </div>
        </div>
      )}

      {/* PIN Setup Modal */}
      {showPinSetup && (
        <div className="fixed inset-0 z-[100] bg-[#3A3A3A]/90 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
           <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl">
              <h3 className="text-xl font-bold text-center text-[#3A3A3A] mb-2">設定 4 位數密碼</h3>
              <p className="text-xs text-[#8A8A8A] text-center mb-8">保護您的隱私，下次開啟 App 時需輸入</p>
              
              <div className="flex justify-center gap-4 mb-8">
                 {[0, 1, 2, 3].map(i => (
                    <div key={i} className={`w-4 h-4 rounded-full border border-[#D9B26D] ${pinInput.length > i ? 'bg-[#D9B26D]' : 'bg-transparent'}`} />
                 ))}
              </div>

              <div className="grid grid-cols-3 gap-4">
                 {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                   <button key={num} onClick={() => handleSetPin(num.toString())} className="h-12 bg-[#F7F3ED] rounded-xl font-bold text-lg active:bg-[#D9B26D] active:text-white transition-colors">
                     {num}
                   </button>
                 ))}
                 <div />
                 <button onClick={() => handleSetPin('0')} className="h-12 bg-[#F7F3ED] rounded-xl font-bold text-lg active:bg-[#D9B26D] active:text-white transition-colors">0</button>
                 <button onClick={() => setShowPinSetup(false)} className="h-12 flex items-center justify-center text-red-400 font-bold">取消</button>
              </div>
           </div>
        </div>
      )}

      {/* Batch Import Modal */}
      {showBatchImport && (
        <div className="fixed inset-0 z-[100] bg-[#F7F3ED] flex flex-col animate-slide-up">
           <div className="px-6 py-4 bg-white/80 backdrop-blur-md flex justify-between items-center shadow-sm border-b border-[#EAEAEA]">
             <button onClick={() => setShowBatchImport(false)} className="text-[#8A8A8A]">取消</button>
             <h3 className="font-bold text-[#3A3A3A]">匯入回憶</h3>
             <div />
           </div>
           <div className="p-6 flex-1 flex flex-col">
              <p className="text-xs text-[#8A8A8A] mb-4 leading-relaxed">
                請將整理好的文字貼在下方。格式範例：<br/>
                【日期】2020/01/01 <br/>
                【標題】跨年 <br/>
                【地點】101 <br/>
                【內容】... <br/>
                【對方留言】...
              </p>
              <textarea 
                className="flex-1 w-full bg-white rounded-xl border border-[#EAEAEA] p-4 text-xs font-mono leading-relaxed outline-none resize-none mb-4"
                placeholder="在此貼上..."
                value={importText}
                onChange={e => setImportText(e.target.value)}
              />
              <button 
                onClick={handleBatchImport}
                disabled={isImporting} 
                className="w-full bg-[#D9B26D] text-white py-4 rounded-full font-bold shadow-lg disabled:opacity-50"
              >
                {isImporting ? '匯入處理中...' : '開始匯入'}
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default More;
