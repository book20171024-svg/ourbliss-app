
import React, { useEffect, useState, useRef } from 'react';
import { useCouple } from '../context/CoupleContext';
import { db, storage } from '../services/firebaseConfig';
import { collection, query, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Memory } from '../types';
import { Plus, X, Image as ImageIcon, MapPin, Smile, Clock, Calendar, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LazyImage from '../components/LazyImage'; // Import LazyImage

const Memories: React.FC = () => {
  const { coupleId } = useCouple();
  const navigate = useNavigate();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  
  // New Memory Form
  const [images, setImages] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [dateInput, setDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [timeInput, setTimeInput] = useState(new Date().toTimeString().slice(0, 5));
  const [desc, setDesc] = useState('');
  const [location, setLocation] = useState('');
  const [mood, setMood] = useState<'happy' | 'romantic' | 'adventure' | 'chill'>('happy');
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!coupleId) return;
    const q = query(collection(db, `couples/${coupleId}/memories`), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setMemories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Memory)));
    });
    return () => unsubscribe();
  }, [coupleId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      if (selected.length + images.length > 3) {
        alert("最多只能上傳 3 張照片");
        return;
      }
      setImages(prev => [...prev, ...selected]);
    }
  };

  const handleSubmit = async () => {
    if (!coupleId || (images.length === 0 && !desc)) return;
    setIsUploading(true);

    try {
      const imageUrls: string[] = [];
      
      for (const file of images) {
        const storageRef = ref(storage, `memories/${coupleId}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        imageUrls.push(url);
      }

      await addDoc(collection(db, `couples/${coupleId}/memories`), {
        title: title || '未命名回憶',
        description: desc,
        date: dateInput,
        time: timeInput,
        location,
        mood,
        images: imageUrls,
        likes: []
      });

      setShowAdd(false);
      resetForm();
    } catch (e) {
      console.error(e);
      alert("上傳失敗");
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setImages([]);
    setTitle('');
    setDesc('');
    setLocation('');
    setMood('happy');
    setDateInput(new Date().toISOString().split('T')[0]);
    setTimeInput(new Date().toTimeString().slice(0, 5));
  };

  return (
    <div className="h-full bg-[#F7F3ED] overflow-y-auto">
      <header className="sticky top-0 z-10 bg-[#F7F3ED]/95 backdrop-blur-md px-6 py-4 flex justify-between items-center shadow-sm">
        <h2 className="text-xl font-bold font-serif text-[#3A3A3A]">回憶錄</h2>
        <button onClick={() => setShowAdd(true)} className="w-10 h-10 bg-[#D9B26D] text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform">
          <Plus size={24} />
        </button>
      </header>

      <div className="px-4 py-4 space-y-6 pb-32">
        {memories.map(mem => (
          <div key={mem.id} onClick={() => navigate(`/memories/${mem.id}`)} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-[#EAEAEA] active:scale-[0.98] transition-transform duration-200 cursor-pointer">
            
            <div className="px-5 pt-5 pb-1 flex justify-between items-center">
               <div className="flex items-center gap-2 text-xs font-bold text-[#D9B26D] tracking-widest uppercase">
                  <Clock size={12} />
                  <span>{mem.time || 'All Day'}</span>
                  <span className="text-[#EAEAEA]">|</span>
                  <span>{mem.date}</span>
               </div>
               {mem.mood && <span className="text-lg">
                  {mem.mood === 'happy' ? '😊' : mem.mood === 'romantic' ? '🥰' : mem.mood === 'adventure' ? '🧗' : '☕️'}
               </span>}
            </div>

            <div className="px-5 pb-1">
               <h3 className="font-bold text-[#3A3A3A] text-xl leading-tight font-serif">{mem.title}</h3>
            </div>

            {mem.location && (
              <div className="px-5 pb-4 flex items-center gap-1.5 text-xs text-[#8A8A8A]">
                <MapPin size={12} className="text-[#C1C1C1]" /> 
                {mem.location}
              </div>
            )}

            {/* Thumbnail Images with LazyImage */}
            <div className={`grid gap-0.5 ${mem.images?.length === 1 ? 'grid-cols-1' : mem.images?.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {mem.images && mem.images.length > 0 ? (
                mem.images.map((img, idx) => (
                  <div key={idx} className="aspect-[4/3] relative overflow-hidden bg-[#F7F3ED]">
                    <LazyImage src={img} className="w-full h-full object-cover" />
                  </div>
                ))
              ) : (
                 // @ts-ignore
                 mem.imageUrl && (
                   <div className="aspect-[4/3] relative overflow-hidden bg-[#F7F3ED]">
                      {/* @ts-ignore */}
                      <LazyImage src={mem.imageUrl} className="w-full h-full object-cover" />
                   </div>
                 )
              )}
            </div>
            
            {mem.description && (
              <div className="px-5 py-4 border-t border-[#F9F9F9]">
                <p className="text-sm text-[#8A8A8A] line-clamp-2 leading-relaxed">{mem.description}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Memory - Full Screen Overlay */}
      {showAdd && (
        <div className="fixed inset-0 z-[100] bg-[#F7F3ED] flex flex-col animate-slide-up">
          {/* Header */}
          <div className="px-6 py-4 bg-white/80 backdrop-blur-md flex justify-between items-center shadow-sm border-b border-[#EAEAEA] flex-shrink-0">
             <button onClick={() => setShowAdd(false)} className="p-2 -ml-2 text-[#8A8A8A] hover:text-[#3A3A3A]">
               <X size={24}/>
             </button>
             <h3 className="font-serif font-bold text-lg text-[#3A3A3A]">新增回憶</h3>
             <button onClick={handleSubmit} disabled={isUploading} className="p-2 -mr-2 text-[#D9B26D] font-bold disabled:opacity-50">
               {isUploading ? <span className="text-xs">上傳中...</span> : <Check size={24} />}
             </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              <div className="flex gap-3">
                 <div className="flex-1 space-y-1">
                    <label className="text-[10px] text-[#8A8A8A] font-bold">日期</label>
                    <div className="flex items-center gap-2 border-b border-[#EAEAEA] py-2">
                      <Calendar size={16} className="text-[#D9B26D]" />
                      <input type="date" className="w-full outline-none text-sm bg-transparent" value={dateInput} onChange={e => setDateInput(e.target.value)} />
                    </div>
                 </div>
                 <div className="flex-1 space-y-1">
                    <label className="text-[10px] text-[#8A8A8A] font-bold">時間</label>
                    <div className="flex items-center gap-2 border-b border-[#EAEAEA] py-2">
                      <Clock size={16} className="text-[#D9B26D]" />
                      <input type="time" className="w-full outline-none text-sm bg-transparent" value={timeInput} onChange={e => setTimeInput(e.target.value)} />
                    </div>
                 </div>
              </div>

              <input placeholder="回憶標題" className="w-full border-b border-[#EAEAEA] py-3 outline-none font-serif font-bold text-2xl bg-transparent placeholder-[#C1C1C1]" value={title} onChange={e => setTitle(e.target.value)} />
              
              <div className="flex gap-3">
                 <div className="flex-1 flex items-center gap-2 border border-[#EAEAEA] rounded-2xl px-3 py-3 bg-white">
                    <MapPin size={18} className="text-[#C1C1C1]" />
                    <input placeholder="地點" className="w-full outline-none text-sm bg-transparent" value={location} onChange={e => setLocation(e.target.value)} />
                 </div>
                 <div className="flex-1 flex items-center gap-2 border border-[#EAEAEA] rounded-2xl px-3 py-3 bg-white">
                    <Smile size={18} className="text-[#C1C1C1]" />
                    <select className="w-full outline-none text-sm bg-transparent" value={mood} onChange={(e:any) => setMood(e.target.value)}>
                      <option value="happy">開心 😊</option>
                      <option value="romantic">浪漫 🥰</option>
                      <option value="adventure">冒險 🧗</option>
                      <option value="chill">放鬆 ☕️</option>
                    </select>
                 </div>
              </div>

              <textarea placeholder="寫下當時的心情與故事..." className="w-full border border-[#EAEAEA] rounded-2xl p-4 h-40 outline-none text-sm resize-none bg-white leading-relaxed" value={desc} onChange={e => setDesc(e.target.value)} />
              
              {/* Image Preview / Add */}
              <div>
                <label className="text-xs text-[#8A8A8A] mb-3 block font-bold uppercase tracking-wider">照片 ({images.length}/3)</label>
                <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar">
                  {images.map((file, i) => (
                    <div key={i} className="w-24 h-24 flex-shrink-0 rounded-2xl overflow-hidden relative border border-[#EAEAEA] shadow-sm">
                      <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="" />
                      <button onClick={() => setImages(images.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 backdrop-blur-sm"><X size={12} /></button>
                    </div>
                  ))}
                  {images.length < 3 && (
                    <button onClick={() => fileInputRef.current?.click()} className="w-24 h-24 border-2 border-dashed border-[#D9B26D]/30 rounded-2xl flex flex-col items-center justify-center text-[#D9B26D] bg-[#FFF8E8] active:scale-95 transition-transform">
                      <ImageIcon size={24} />
                      <span className="text-[10px] mt-1 font-bold">新增照片</span>
                    </button>
                  )}
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" multiple />
                </div>
              </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Memories;
