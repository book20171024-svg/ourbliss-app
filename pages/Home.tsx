
import React, { useEffect, useState, useRef } from 'react';
import { useCouple } from '../context/CoupleContext';
import { db, storage } from '../services/firebaseConfig';
import { doc, onSnapshot, collection, query, where, orderBy, limit, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Heart, MessageCircle, Calendar as CalendarIcon, MapPin, Gift, ArrowRight, Sparkles, RefreshCw, Camera, Smile } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CalendarEvent, Memory } from '../types';
import { generateDailyMessage } from '../services/geminiService';
import LazyImage from '../components/LazyImage';
import { compressImage } from '../services/imageUtils';

const statusOptions = [
  { label: '想你', icon: '💭' },
  { label: '開心', icon: '😊' },
  { label: '工作中', icon: '💻' },
  { label: '健身中', icon: '🏋️' },
  { label: '睡覺', icon: '💤' },
  { label: '吃飯', icon: '🍱' },
  { label: '無聊', icon: '😐' },
  { label: '愛你', icon: '❤️' },
];

const Home: React.FC = () => {
  const { coupleData, currentUserRole, updateCoupleData, loading, coupleId } = useCouple();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  
  const [todayEvent, setTodayEvent] = useState<CalendarEvent | null>(null);
  const [featuredMemory, setFeaturedMemory] = useState<{ type: 'latest' | 'onThisDay', data: Memory } | null>(null);
  const [dailyMessage, setDailyMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  
  // Calculate days passed
  const today = new Date();
  const ann = coupleData ? new Date(coupleData.anniversaryDate) : new Date();
  const diffTime = Math.abs(today.getTime() - ann.getTime());
  const daysPassed = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  useEffect(() => {
    if (!coupleId) return;

    // 1. Check for Today's Event
    const todayStr = new Date().toISOString().split('T')[0];
    const eventsRef = collection(db, `couples/${coupleId}/events`);
    const qEvents = query(
      eventsRef, 
      where('dateTime', '>=', todayStr + 'T00:00:00'),
      where('dateTime', '<=', todayStr + 'T23:59:59'),
      orderBy('dateTime', 'asc'),
      limit(1)
    );

    const unsubEvents = onSnapshot(qEvents, (snap) => {
      if (!snap.empty) {
        setTodayEvent({ id: snap.docs[0].id, ...snap.docs[0].data() } as CalendarEvent);
      } else {
        setTodayEvent(null);
      }
    }, (error) => console.log("Event sync error", error));

    // 2. Fetch Memories (On This Day Logic)
    const memRef = collection(db, `couples/${coupleId}/memories`);
    const qMem = query(memRef, orderBy('date', 'desc'), limit(365)); 
    
    const unsubMem = onSnapshot(qMem, (snap) => {
      const memories = snap.docs.map(d => ({ id: d.id, ...d.data() } as Memory));
      
      const currentMonthDay = todayStr.slice(5); // MM-DD
      const onThisDayMem = memories.find(m => m.date.slice(5) === currentMonthDay && m.date !== todayStr);
      
      if (onThisDayMem) {
        setFeaturedMemory({ type: 'onThisDay', data: onThisDayMem });
      } else if (memories.length > 0) {
        setFeaturedMemory({ type: 'latest', data: memories[0] });
      } else {
        setFeaturedMemory(null);
      }
    }, (error) => console.log("Memory sync error", error));

    // 3. Fetch Daily Message
    const msgRef = doc(db, `couples/${coupleId}/aiDailyMessage`, 'today');
    const unsubMsg = onSnapshot(msgRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().dateGenerated === todayStr) {
        setDailyMessage(docSnap.data().content);
      } else {
        handleAutoGenerateMessage(todayStr);
      }
    });

    return () => {
      unsubEvents();
      unsubMem();
      unsubMsg();
    };
  }, [coupleId]);

  const handleAutoGenerateMessage = async (dateStr: string) => {
    if (!coupleData || !coupleId) return;
    const names = `${coupleData.partner1Name} & ${coupleData.partner2Name}`;
    const msg = await generateDailyMessage(names, daysPassed);
    await setDoc(doc(db, `couples/${coupleId}/aiDailyMessage`, 'today'), {
      content: msg,
      dateGenerated: dateStr
    });
  };

  const handleManualGenerate = async () => {
    if(!coupleData || !coupleId) return;
    setIsGenerating(true);
    const names = `${coupleData.partner1Name} & ${coupleData.partner2Name}`;
    const msg = await generateDailyMessage(names, daysPassed);
    const todayStr = new Date().toISOString().split('T')[0];
    await setDoc(doc(db, `couples/${coupleId}/aiDailyMessage`, 'today'), {
      content: msg,
      dateGenerated: todayStr
    });
    setIsGenerating(false);
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentUserRole && coupleData) {
      try {
        const compressedFile = await compressImage(file, 500, 0.8);
        const storageRef = ref(storage, `avatars/${coupleData.id}/${currentUserRole}_${Date.now()}`);
        await uploadBytes(storageRef, compressedFile);
        const url = await getDownloadURL(storageRef);
        if (currentUserRole === 'partner1') await updateCoupleData({ partner1Avatar: url });
        else await updateCoupleData({ partner2Avatar: url });
      } catch(err) {
        alert("頭像上傳失敗，請檢查權限");
      }
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && coupleId) {
      try {
        const compressedFile = await compressImage(file, 1280, 0.8);
        const storageRef = ref(storage, `covers/${coupleId}_${Date.now()}`);
        await uploadBytes(storageRef, compressedFile);
        const url = await getDownloadURL(storageRef);
        await updateCoupleData({ coverImage: url });
      } catch(err) {
        alert("封面圖片上傳失敗，請檢查權限");
      }
    }
  };

  const updateStatus = async (statusLabel: string) => {
    if (currentUserRole === 'partner1') await updateCoupleData({ partner1Status: statusLabel });
    else await updateCoupleData({ partner2Status: statusLabel });
    setShowStatusMenu(false);
  };

  if (loading || !coupleData) return <div className="h-full flex items-center justify-center text-[#D9B26D]">載入中...</div>;

  return (
    <div className="h-full w-full overflow-y-auto hide-scrollbar bg-[#F7F3ED]">
      <div className="pb-32">
        <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
        <input type="file" ref={coverInputRef} onChange={handleCoverUpload} className="hidden" accept="image/*" />

        {/* Top Cover Section - Compact Height */}
        <div className="relative w-full h-[180px] rounded-b-[40px] overflow-hidden shadow-lg border-b-4 border-white shrink-0 bg-[#EAEAEA]">
           <LazyImage 
             src={coupleData.coverImage || "https://images.unsplash.com/photo-1516541196182-6bdb0516ed27?q=80&w=1000&auto=format&fit=crop"} 
             className="w-full h-full object-cover"
             alt="Cover"
           />
           <div className="absolute inset-0 bg-black/20" /> 
           
           <button onClick={() => coverInputRef.current?.click()} className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40">
             <Camera size={18} />
           </button>

           {/* Avatar & Status Section */}
           <div className="absolute bottom-6 left-0 right-0 flex justify-center items-end gap-6 z-10">
              {/* Partner 1 */}
              <div className="flex flex-col items-center relative">
                 <div className="w-16 h-16 rounded-full border-2 border-white shadow-lg overflow-hidden relative bg-[#F7F3ED]">
                    <LazyImage src={coupleData.partner1Avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"} className="w-full h-full object-cover" />
                    {currentUserRole === 'partner1' && (
                       <div onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer transition-opacity">
                         <Camera size={20} className="text-white" />
                       </div>
                    )}
                 </div>
                 <span className="text-white font-bold text-xs mt-2 drop-shadow-md">{coupleData.partner1Name}</span>
                 
                 {/* Status Bubble */}
                 <div 
                   onClick={() => currentUserRole === 'partner1' && setShowStatusMenu(true)}
                   className="mt-1 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full shadow-sm text-[10px] font-bold text-[#3A3A3A] flex items-center gap-1 cursor-pointer hover:scale-105 transition-transform"
                 >
                   <span>{coupleData.partner1Status || '❤️'}</span>
                 </div>
              </div>

              {/* Heart Beat & Days */}
              <div className="flex flex-col items-center mb-4">
                 <Heart className="text-white fill-white animate-pulse drop-shadow-lg" size={28} />
                 <span className="text-white font-bold text-[10px] mt-1 drop-shadow-md">{daysPassed} Days</span>
              </div>

              {/* Partner 2 */}
              <div className="flex flex-col items-center relative">
                 <div className="w-16 h-16 rounded-full border-2 border-white shadow-lg overflow-hidden relative bg-[#F7F3ED]">
                    <LazyImage src={coupleData.partner2Avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka"} className="w-full h-full object-cover" />
                    {currentUserRole === 'partner2' && (
                       <div onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer transition-opacity">
                         <Camera size={20} className="text-white" />
                       </div>
                    )}
                 </div>
                 <span className="text-white font-bold text-xs mt-2 drop-shadow-md">{coupleData.partner2Name}</span>

                 {/* Status Bubble */}
                 <div 
                   onClick={() => currentUserRole === 'partner2' && setShowStatusMenu(true)}
                   className="mt-1 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full shadow-sm text-[10px] font-bold text-[#3A3A3A] flex items-center gap-1 cursor-pointer hover:scale-105 transition-transform"
                 >
                   <span>{coupleData.partner2Status || '❤️'}</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Status Menu Overlay */}
        {showStatusMenu && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6 animate-fade-in" onClick={() => setShowStatusMenu(false)}>
             <div className="bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl transform scale-100 transition-transform">
                <h3 className="text-center font-bold text-[#3A3A3A] mb-4">現在的狀態是？</h3>
                <div className="grid grid-cols-4 gap-3">
                   {statusOptions.map((opt) => (
                      <button 
                        key={opt.label} 
                        onClick={() => updateStatus(opt.label)}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-[#F7F3ED] transition-colors"
                      >
                        <span className="text-2xl">{opt.icon}</span>
                        <span className="text-[10px] text-[#8A8A8A] font-bold">{opt.label}</span>
                      </button>
                   ))}
                </div>
                {/* Custom Input */}
                <div className="mt-4 pt-4 border-t border-[#F7F3ED]">
                   <div className="flex items-center gap-2 bg-[#F9F9F9] px-3 py-2 rounded-xl">
                      <Smile size={16} className="text-[#C1C1C1]" />
                      <input 
                        className="bg-transparent outline-none text-xs w-full text-[#3A3A3A] font-bold"
                        placeholder="自訂狀態..."
                        onKeyDown={(e) => {
                           if(e.key === 'Enter') updateStatus(e.currentTarget.value);
                        }}
                      />
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* Main Content Feed */}
        <div className="px-5 mt-4 space-y-4">
           
           {/* Daily Message - Compact */}
           <div className="bg-white px-4 py-3 rounded-2xl shadow-sm border border-[#EAEAEA] relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10">
                 <Sparkles size={40} className="text-[#D9B26D]" />
              </div>
              <div className="flex justify-between items-center mb-1">
                 <span className="text-[10px] font-bold text-[#D9B26D] bg-[#FFF8E8] px-2 py-0.5 rounded-full uppercase tracking-wider">Daily Message</span>
                 <button onClick={handleManualGenerate} disabled={isGenerating} className="text-[#C1C1C1] hover:text-[#D9B26D] transition-colors">
                    <RefreshCw size={12} className={isGenerating ? "animate-spin" : ""} />
                 </button>
              </div>
              <p className="text-[#3A3A3A] font-serif font-medium leading-relaxed text-xs pr-2">
                 {dailyMessage || "正在讀取今日的甜蜜訊息..."}
              </p>
           </div>

           {/* Today's Event Card */}
           {todayEvent && (
             <div onClick={() => navigate(`/event-edit/${todayEvent.id}`)} className="bg-[#3A3A3A] text-white p-5 rounded-3xl shadow-lg shadow-[#3A3A3A]/20 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform">
                <div>
                   <div className="flex items-center gap-2 mb-1">
                      <CalendarIcon size={14} className="text-[#D9B26D]" />
                      <span className="text-xs font-bold text-[#D9B26D] uppercase">Today's Plan</span>
                   </div>
                   <h3 className="font-bold text-lg">{todayEvent.title}</h3>
                   <p className="text-xs text-white/60 mt-0.5">{new Date(todayEvent.dateTime).toLocaleTimeString('zh-TW', {hour:'2-digit', minute:'2-digit'})} {todayEvent.location ? `@ ${todayEvent.location}` : ''}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                   <ArrowRight size={20} />
                </div>
             </div>
           )}

           {/* Featured Memory */}
           {featuredMemory && (
             <div onClick={() => navigate(`/memories/${featuredMemory.data.id}`)} className="block group cursor-pointer">
                <div className="flex items-center justify-between mb-2 px-1">
                   <h3 className="font-serif font-bold text-[#3A3A3A] text-sm">
                      {featuredMemory.type === 'onThisDay' ? '當年今日' : '最新回憶'}
                   </h3>
                   <span className="text-xs text-[#8A8A8A] flex items-center gap-1 group-hover:text-[#D9B26D] transition-colors">
                      查看更多 <ArrowRight size={12} />
                   </span>
                </div>
                <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-[#EAEAEA] active:scale-[0.98] transition-transform">
                   <div className="aspect-video bg-[#F0F0F0] relative">
                      {featuredMemory.data.images && featuredMemory.data.images.length > 0 ? (
                         <LazyImage src={featuredMemory.data.images[0]} className="w-full h-full object-cover" />
                      ) : (
                         // @ts-ignore
                         featuredMemory.data.imageUrl ? <LazyImage src={featuredMemory.data.imageUrl} className="w-full h-full object-cover" /> :
                         <div className="w-full h-full flex items-center justify-center text-[#C1C1C1] bg-[#F9F9F9]">No Image</div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-5">
                         <div className="text-white">
                            <h4 className="font-bold text-lg leading-tight mb-1">{featuredMemory.data.title}</h4>
                            <div className="flex items-center gap-2 text-xs opacity-90">
                               <span>{featuredMemory.data.date}</span>
                               {featuredMemory.data.location && (
                                  <>
                                     <span>•</span>
                                     <span className="flex items-center gap-0.5"><MapPin size={10} /> {featuredMemory.data.location}</span>
                                  </>
                               )}
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
           )}

           {/* Quick Actions Grid - Restore Chat Button */}
           <div className="grid grid-cols-2 gap-3 pb-6">
              <button onClick={() => navigate('/chat')} className="bg-white p-4 rounded-2xl shadow-sm border border-[#EAEAEA] flex items-center gap-3 active:scale-95 transition-transform">
                 <div className="w-10 h-10 rounded-full bg-[#FFF8E8] flex items-center justify-center text-[#D9B26D]">
                    <MessageCircle size={20} />
                 </div>
                 <div className="text-left">
                    <span className="block text-sm font-bold text-[#3A3A3A]">聊天室</span>
                    <span className="block text-[10px] text-[#8A8A8A]">即時訊息</span>
                 </div>
              </button>
              <button onClick={() => navigate('/anniversaries')} className="bg-white p-4 rounded-2xl shadow-sm border border-[#EAEAEA] flex items-center gap-3 active:scale-95 transition-transform">
                 <div className="w-10 h-10 rounded-full bg-[#FFF5F5] flex items-center justify-center text-red-400">
                    <Gift size={20} />
                 </div>
                 <div className="text-left">
                    <span className="block text-sm font-bold text-[#3A3A3A]">紀念日</span>
                    <span className="block text-[10px] text-[#8A8A8A]">倒數重要日子</span>
                 </div>
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
