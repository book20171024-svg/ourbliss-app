
import React, { useEffect, useState, useRef } from 'react';
import { useCouple } from '../context/CoupleContext';
import { db, storage } from '../services/firebaseConfig';
import { doc, onSnapshot, collection, query, where, orderBy, limit, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Heart, MessageCircle, Calendar as CalendarIcon, MapPin, Gift, ArrowRight, Sparkles, RefreshCw, Camera, Smile } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CalendarEvent, Memory } from '../types';
import { generateDailyMessage } from '../services/geminiService';

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
    const qMem = query(memRef, orderBy('date', 'desc'), limit(20)); 
    
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
        const storageRef = ref(storage, `avatars/${coupleData.id}/${currentUserRole}_${Date.now()}`);
        await uploadBytes(storageRef, file);
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
        const storageRef = ref(storage, `covers/${coupleId}_${Date.now()}`);
        await uploadBytes(storageRef, file);
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

        {/* Top Cover Section */}
        <div className="relative w-full h-[280px] rounded-b-[40px] overflow-hidden shadow-lg border-b-4 border-white shrink-0">
           <img 
             src={coupleData.coverImage || "https://images.unsplash.com/photo-1516541196182-6bdb0516ed27?q=80&w=1000&auto=format&fit=crop"} 
             className="w-full h-full object-cover"
             alt="Cover"
           />
           <div className="absolute inset-0 bg-black/20" /> {/* Dim overlay */}
           
           <button onClick={() => coverInputRef.current?.click()} className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40">
             <Camera size={18} />
           </button>

           {/* Avatar & Status Section */}
           <div className="absolute bottom-10 left-0 right-0 flex justify-center items-end gap-6 z-10">
              {/* Partner 1 */}
              <div className="flex flex-col items-center relative">
                 {coupleData.partner1Status && (
                   <div className="absolute -top-8 bg-white/90 backdrop-blur px-3 py-1 rounded-full shadow-sm text-xs font-bold text-[#D9B26D] animate-bounce">
                      {coupleData.partner1Status}
                   </div>
                 )}
                 <div 
                   onClick={() => currentUserRole === 'partner1' && fileInputRef.current?.click()} 
                   className="relative w-20 h-20 rounded-full border-4 border-white shadow-xl cursor-pointer"
                 >
                   <img src={coupleData.partner1Avatar || "https://picsum.photos/200"} className="w-full h-full rounded-full object-cover" alt="p1"/>
                   {currentUserRole === 'partner1' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setShowStatusMenu(true); }}
                        className="absolute bottom-0 right-0 bg-[#D9B26D] text-white w-6 h-6 rounded-full flex items-center justify-center border-2 border-white"
                      >
                        <Smile size={12} />
                      </button>
                   )}
                 </div>
                 <span className="text-white font-bold text-shadow mt-2 text-sm">{coupleData.partner1Name}</span>
              </div>
              
              {/* Days Heart */}
              <div className="flex flex-col items-center pb-6">
                <Heart size={32} fill="#D9B26D" className="text-[#D9B26D] animate-pulse drop-shadow-md" />
                <span className="text-white font-bold text-lg drop-shadow-md">{daysPassed} DAYS</span>
              </div>

              {/* Partner 2 */}
              <div className="flex flex-col items-center relative">
                 {coupleData.partner2Status && (
                   <div className="absolute -top-8 bg-white/90 backdrop-blur px-3 py-1 rounded-full shadow-sm text-xs font-bold text-[#D9B26D] animate-bounce">
                      {coupleData.partner2Status}
                   </div>
                 )}
                 <div 
                   onClick={() => currentUserRole === 'partner2' && fileInputRef.current?.click()} 
                   className="relative w-20 h-20 rounded-full border-4 border-white shadow-xl cursor-pointer"
                 >
                   <img src={coupleData.partner2Avatar || "https://picsum.photos/201"} className="w-full h-full rounded-full object-cover" alt="p2"/>
                   {currentUserRole === 'partner2' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setShowStatusMenu(true); }}
                        className="absolute bottom-0 right-0 bg-[#D9B26D] text-white w-6 h-6 rounded-full flex items-center justify-center border-2 border-white"
                      >
                        <Smile size={12} />
                      </button>
                   )}
                 </div>
                 <span className="text-white font-bold text-shadow mt-2 text-sm">{coupleData.partner2Name}</span>
              </div>
           </div>
        </div>

        <div className="px-6 -mt-6 relative z-10">
           {/* Daily Message */}
           <div className="bg-white px-6 py-4 rounded-2xl shadow-md border border-[#F7F3ED] text-center mx-auto mb-6">
             <div className="flex justify-center items-center gap-2 mb-1">
               <div className="bg-[#D9B26D]/10 text-[#D9B26D] text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                 <Sparkles size={10} /> 每日小語
               </div>
               <button 
                  onClick={handleManualGenerate} 
                  disabled={isGenerating}
                  className="text-[#C1C1C1] hover:text-[#D9B26D]"
               >
                  <RefreshCw size={12} className={isGenerating ? "animate-spin" : ""} />
               </button>
             </div>
             
             {dailyMessage ? (
               <p className="text-sm text-[#3A3A3A] font-serif italic leading-relaxed animate-fade-in">
                 {dailyMessage}
               </p>
             ) : (
               <div className="flex flex-col items-center gap-2 mt-2">
                 <div className="h-2 w-3/4 bg-gray-100 rounded animate-pulse" />
                 <div className="h-2 w-1/2 bg-gray-100 rounded animate-pulse" />
               </div>
             )}
           </div>

           {/* Main Content Card */}
           <div className="bg-white rounded-[32px] shadow-xl shadow-[#D9B26D]/10 overflow-hidden relative aspect-[4/5] w-full max-h-[400px] border border-white mx-auto">
            {todayEvent ? (
              <div 
                onClick={() => navigate(`/event-edit/${todayEvent.id}`)}
                className="w-full h-full p-8 flex flex-col justify-between bg-gradient-to-br from-white to-[#F7F3ED] cursor-pointer"
              >
                <div>
                  <span className="inline-block px-3 py-1 bg-[#D9B26D]/10 text-[#D9B26D] rounded-full text-xs font-bold mb-4">
                    TODAY'S PLAN
                  </span>
                  <h2 className="text-3xl font-serif font-bold text-[#3A3A3A] leading-tight mb-2">
                    {todayEvent.title}
                  </h2>
                  <div className="flex items-center gap-2 text-[#8A8A8A] text-sm mb-4">
                    {todayEvent.isAllDay ? '全天' : new Date(todayEvent.dateTime).toLocaleTimeString('zh-TW', {hour:'2-digit', minute:'2-digit'})}
                    {todayEvent.type === 'joint' && <span className="bg-[#D9B26D] text-white text-[10px] px-1.5 rounded">共同</span>}
                  </div>
                  {todayEvent.location && (
                    <div className="flex items-center gap-2 text-[#8A8A8A] text-sm">
                      <MapPin size={16} /> {todayEvent.location}
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <div className="w-12 h-12 rounded-full bg-[#3A3A3A] text-white flex items-center justify-center">
                    <ArrowRight size={20} />
                  </div>
                </div>
              </div>
            ) : featuredMemory ? (
              <div onClick={() => navigate(`/memories/${featuredMemory.data.id}`)} className="w-full h-full relative group cursor-pointer">
                <img 
                  src={featuredMemory.data.images?.[0] || "https://picsum.photos/400/500"} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  alt="Memory"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-8 text-white">
                  <span className={`text-xs font-bold tracking-widest px-2 py-1 rounded inline-block mb-2 ${featuredMemory.type === 'onThisDay' ? 'bg-[#D9B26D] text-white' : 'bg-white/20 text-white'}`}>
                     {featuredMemory.type === 'onThisDay' ? '★ 那年今天' : 'LATEST MEMORY'}
                  </span>
                  <h2 className="text-2xl font-serif font-bold mb-1">{featuredMemory.data.title}</h2>
                  <div className="flex items-center gap-2 text-xs opacity-80 mb-1">
                     <CalendarIcon size={12} /> {featuredMemory.data.date}
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-[#C1C1C1] bg-[#F9F9F9] p-8 text-center">
                <CalendarIcon size={48} className="mb-4 opacity-20" />
                <p className="mb-4">今天沒有行程，也沒有回憶...</p>
                <button onClick={() => navigate('/event-add')} className="px-6 py-3 bg-[#D9B26D] text-white rounded-full text-sm font-bold shadow-lg">
                  建立第一個回憶
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons (Bottom Left Positioned) */}
          <div className="flex justify-center gap-8 mt-8 pb-4">
            <button 
              onClick={() => navigate('/anniversaries')}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-[#EAEAEA] active:scale-95 transition-transform"
            >
               <Gift size={18} className="text-[#D9B26D]" />
               <span className="text-xs font-bold text-[#8A8A8A]">紀念日</span>
            </button>
            
            <button 
              onClick={() => navigate('/chat')}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-[#EAEAEA] active:scale-95 transition-transform"
            >
               <MessageCircle size={18} className="text-[#D9B26D]" />
               <span className="text-xs font-bold text-[#8A8A8A]">聊天</span>
            </button>
          </div>
        </div>
      </div>

       {/* Status Picker - Bottom Sheet Style Overlay */}
       {showStatusMenu && (
        <div className="fixed inset-0 z-[60]">
           <div className="absolute inset-0 bg-black/20" onClick={() => setShowStatusMenu(false)} />
           <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 animate-slide-up shadow-2xl">
              <h3 className="text-center font-bold text-[#3A3A3A] mb-4">現在的心情是...</h3>
              <div className="grid grid-cols-4 gap-4">
                {statusOptions.map(s => (
                  <button key={s.label} onClick={() => updateStatus(s.label + ' ' + s.icon)} className="flex flex-col items-center gap-2 p-2 hover:bg-[#F7F3ED] rounded-xl active:scale-95 transition-transform">
                    <span className="text-3xl">{s.icon}</span>
                    <span className="text-xs font-medium text-[#8A8A8A]">{s.label}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowStatusMenu(false)} className="w-full mt-6 py-3 bg-[#F7F3ED] text-[#8A8A8A] rounded-xl text-sm font-bold">
                取消
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default Home;
