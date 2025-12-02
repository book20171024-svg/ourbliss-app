
import React, { useState, useEffect } from 'react';
import { useCouple } from '../context/CoupleContext';
import { MessageCircle, LogOut, Save, Gift, BookHeart, ChevronRight, Sparkles, User, Settings, Copy, Check, Download, Lock, ShieldCheck, Loader2, FileText, Upload, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, writeBatch, doc, setDoc, addDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

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
    // Fallback copy method
    const textArea = document.createElement("textarea");
    textArea.value = coupleId || "";
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      alert("Couple ID 已複製！");
    } catch (err) {
      alert("複製失敗，請手動選取 ID");
    }
    document.body.removeChild(textArea);
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

  // --- Backup Logic (Export) ---
  const handleBackup = async () => {
    if (!coupleId) return;
    if (!confirm("確定要匯出全資料備份嗎？\n(此操作不會刪除任何資料，僅下載備份檔)")) return;

    setIsBackingUp(true);
    try {
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
      
      // Removed alert to prevent interruption flow on mobile
      // alert("✅ 下載已開始！請妥善保存您的備份檔案。您的原始資料依然安全保存在雲端。");
    } catch (e) {
      console.error(e);
      alert("備份失敗，請稍後再試。");
    } finally {
      setIsBackingUp(false);
    }
  };

  // --- Restore Logic (Import) ---
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
        
        alert("✅ 資料還原成功！正在重新載入...");
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

  // --- Robust Batch Import Logic (Hybrid Parser) ---
  const handleBatchImport = async () => {
    if (!importText.trim()) return;
    setIsImporting(true);
    
    try {
      const rawLines = importText.split('\n');
      const memoriesToImport: any[] = [];
      
      let currentMemory: any = null;
      let captureMode: 'desc' | 'comment' = 'desc';

      // Helper to finalize a memory block
      const finalizeCurrent = () => {
        if (currentMemory && currentMemory.date) {
           memoriesToImport.push(currentMemory);
        }
      };

      // Regex for "Date Line"
      // Supports: "【日期】2020/01/01" OR "🌟 2020-01-01｜Title"
      const tagDateRegex = /[【\[]日期[】\]]\s*(.*)/;
      const blogDateRegex = /(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/; 

      for (let line of rawLines) {
        line = line.trim();
        if (!line) continue;

        // 1. Check if line starts a NEW memory (contains a date pattern)
        const tagMatch = line.match(tagDateRegex);
        const blogMatch = line.match(blogDateRegex);

        if (tagMatch || blogMatch) {
            // Push previous memory
            finalizeCurrent();
            
            // Start new memory
            currentMemory = {
                title: '未命名回憶',
                date: '',
                location: '',
                description: '',
                mood: '😊',
                comment: ''
            };
            captureMode = 'desc';

            if (tagMatch) {
                // Style A: 【日期】2020/01/01
                // Clean: remove everything inside brackets (like weekday) and standardize separators
                currentMemory.date = tagMatch[1].trim().replace(/\//g, '-').replace(/[（(].*[)）]/g, '').trim();
            } else if (blogMatch) {
                // Style B: 🌟 2019-10-20｜Title
                // Extract Mood (First char if emoji)
                const firstChar = line.charAt(0);
                // Simple check for Emoji range or specific chars
                if (firstChar.match(/\p{Emoji}/u) || firstChar === '🌟' || firstChar === '✨') {
                    currentMemory.mood = firstChar;
                }
                
                // Extract Date
                currentMemory.date = blogMatch[1].replace(/\//g, '-');
                
                // Extract Title (After separator | or ｜)
                const parts = line.split(/[|｜]/);
                if (parts.length > 1) {
                    currentMemory.title = parts[1].trim();
                }
            }
            continue;
        }

        // If no current memory, skip
        if (!currentMemory) continue;

        // 2. Check for Tags (Style A)
        const titleMatch = line.match(/[【\[]標題[】\]]\s*(.*)/);
        if (titleMatch) { currentMemory.title = titleMatch[1].trim(); continue; }

        const locMatch = line.match(/[【\[]地點[】\]]\s*(.*)/);
        if (locMatch) { currentMemory.location = locMatch[1].trim(); continue; }
        
        const contentMatch = line.match(/[【\[]內容[】\]]/);
        if (contentMatch) { captureMode = 'desc'; continue; }

        // 3. Check for Comments (Style A & B)
        // Matches: 【對方留言】, —留言—, ---留言---
        if (line.match(/[【\[]對方留言[】\]]/) || line.includes('—留言—') || line.includes('---')) {
            captureMode = 'comment';
            continue;
        }

        // 4. Check for ignored keywords
        if (line.includes('（留空）') || line.includes('待補')) continue;

        // 5. Append Content
        if (captureMode === 'desc') {
            currentMemory.description += (currentMemory.description ? '\n' : '') + line;
        } else {
            currentMemory.comment += (currentMemory.comment ? '\n' : '') + line;
        }
      }
      
      // Finalize last block
      finalizeCurrent();

      if (memoriesToImport.length === 0) {
         alert("❌ 找不到有效的日期格式。\n支援格式 1：【日期】2020/01/01\n支援格式 2：🌟 2020-01-01｜標題");
         setIsImporting(false);
         return;
      }

      alert(`⏳ 偵測到 ${memoriesToImport.length} 筆資料，正在匯入...`);
      
      let count = 0;
      for (const mem of memoriesToImport) {
          // Add Memory
          const memRef = await addDoc(collection(db, `couples/${coupleId}/memories`), {
            title: mem.title,
            date: mem.date,
            location: mem.location,
            description: mem.description,
            mood: mem.mood,
            images: [], 
            likes: [],
            importedAt: new Date().toISOString()
         });

         // Add Comment if exists
         if (mem.comment) {
             const partnerRole = currentUserRole === 'partner1' ? 'partner2' : 'partner1';
             
             // FIX: Calculate timestamp from MEMORY date, NOT current date
             let commentTimestamp = Date.now();
             try {
                // Ensure format YYYY-MM-DD
                const cleanDate = mem.date.trim();
                const parts = cleanDate.split('-');
                if (parts.length === 3) {
                   const y = parseInt(parts[0]);
                   const m = parseInt(parts[1]) - 1; // Month is 0-indexed
                   const d = parseInt(parts[2]);
                   // Set to noon (12:00:00) on that day to avoid timezone rolling to previous day
                   commentTimestamp = new Date(y, m, d, 12, 0, 0).getTime();
                } else {
                   // Fallback parse
                   commentTimestamp = new Date(cleanDate).getTime();
                }
             } catch (e) {
                console.warn("Date parsing error for comment:", mem.date);
                commentTimestamp = Date.now();
             }

             // Handle NaN from invalid dates
             if (isNaN(commentTimestamp)) {
                commentTimestamp = Date.now();
             }

             await addDoc(collection(db, `couples/${coupleId}/memories/${memRef.id}/comments`), {
                senderId: partnerRole,
                text: mem.comment.trim(),
                timestamp: commentTimestamp
             });
         }
         count++;
      }

      alert(`🎉 成功匯入 ${count} 筆回憶！`);
      setImportText('');
      setShowBatchImport(false);
      navigate('/memories');

    } catch (e: any) {
      console.error(e);
      alert(`匯入發生錯誤: ${e.message}`);
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
                    <div key={i} className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold ${pinInput.length > i ? 'border-[#D9B26D] text-[#D9B26D]' : 'border-[#F7F3ED] text-[#C1C1C1]'}`}>
                       {pinInput.length > i ? '•' : ''}
                    </div>
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
           <div className="p-6 flex-1 flex flex-col overflow-y-auto">
              <p className="text-xs text-[#8A8A8A] mb-4 leading-relaxed">
                支援兩種格式 (可混用)：<br/>
                1. 【日期】2020/01/01<br/>
                2. 🌟 2020-01-01｜標題
              </p>
              <textarea 
                className="flex-1 w-full bg-white rounded-xl border border-[#EAEAEA] p-4 text-xs font-mono leading-relaxed outline-none resize-none mb-4"
                placeholder="在此貼上您的回憶文字..."
                value={importText}
                onChange={e => setImportText(e.target.value)}
              />
              <button 
                onClick={handleBatchImport}
                disabled={isImporting} 
                className="w-full bg-[#D9B26D] text-white py-4 rounded-full font-bold shadow-lg disabled:opacity-50 flex-shrink-0"
              >
                {isImporting ? '分析匯入中...' : '開始匯入'}
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default More;
