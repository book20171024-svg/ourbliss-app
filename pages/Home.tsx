
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
import { compressImage } from '../services/imageUtils'; // Import compression

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
  
  const [isContentReady, setIsContentReady] = useState(false);

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
      setIsContentReady(true);
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

        {/* Top Cover Section - REDUCED HEIGHT */}
        <div className="relative w-full h-[220px] rounded-b-[40px] overflow-hidden shadow-lg border-b-4 border-white shrink-0 bg-[#EAEAEA]">
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
           <div className="absolute bottom-8 left-0 right-0 flex justify-center items-end gap-6 z-10">
              {/* Partner 1 */}
              <div className="flex flex-col items-center relative">
                 {coupleData