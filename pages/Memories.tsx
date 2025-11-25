
import React, { useEffect, useState, useRef } from 'react';
import { useCouple } from '../context/CoupleContext';
import { db, storage } from '../services/firebaseConfig';
import { collection, query, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Memory } from '../types';
import { Plus, X, Image as ImageIcon, MapPin, Smile, Clock, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
      
      // Upload images
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
    <div className="min-h-full bg-[#F7F3ED] pb-20">
      <header className="sticky top-0 z-10 bg-[#F7F3ED]/95 backdrop-blur-md px-6 py-4 flex justify-between items-center shadow-sm">
        <h2 className="text-xl font-bold font-serif text-[#3A3A3A]">回憶錄</h2>
        <button onClick={() => setShowAdd(true)} className="w-10 h-10 bg-[#D9B26D] text-white rounded-full flex items-center justify-center shadow-lg active:scale-95">
          <Plus size={24} />
        </button>
      </header>

      <div className="px-4 py-4 space-y-6">
        {memories.map(mem => (
          <div key={mem.id} onClick={() => navigate(`/memories/${mem.id}`)} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-[#EAEAEA] active:scale-[0.98] transition-transform duration-200">
            
            {/* 1. Time & Date */}
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

            {/* 2. Title */}
            <div className="px-5 pb-1">
               <h3 className="font-bold text-[#3A3A3A] text-xl leading-tight font-serif">{mem.title}</h3>
            </div>

            {/* 3. Location */}
            {mem.location && (
              <div className="px-5 pb-4 flex items-center gap-1.5 text-xs text-[#8A8A8A]">
                <MapPin size={12} className="text-[#C1C1C1]" /> 
                {mem.location}
              </div>
            )}

            {/* 4. Thumbnail Images */}
            <div className={`grid gap-0.5 ${mem.images?.length === 1 ? 'grid-cols-1' : mem.images?.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {mem.images && mem.images.length > 0 ? (
                mem.images.map((img, idx) => (
                  <div key={idx} className="aspect-[4/3] relative overflow-hidden bg-[#F7F3ED]">
                    <img src={img} className="w-full h-full object-cover" alt="" />
                  </div>
                ))
              ) : (
                 // Backwards compatibility for single imageUrl
                 // @ts-ignore
                 mem.imageUrl && (
                   <div className="aspect-[4/3] relative overflow-hidden bg-[#F7F3ED]">
                      {/* @ts-ignore */}
                      <img src={mem.imageUrl} className="w-full h-full object-cover" alt="" />
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

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-[#3A3A3A]">新增回憶</h3>
              <button onClick={() => setShowAdd(false)} className="p-2 bg-[#F7F3ED] rounded-full"><X size={20}/></button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto hide-scrollbar">
              
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

              <input placeholder="標題" className="w-full border-b border-[#EAEAEA] py-3 outline-none font-bold text-lg" value={title} onChange={e => setTitle(e.target.value)} />
              
              <div className="flex gap-2">
                 <div className="flex-1 flex items-center gap-2 border rounded-xl px-3 py-2 bg-[#F9F9F9]">
                    <MapPin size={16} className="text-[#C1C1C1]" />
                    <input placeholder="地點" className="w-full outline-none text-sm bg-transparent" value={location} onChange={e => setLocation(e.target.value)} />
                 </div>
                 <div className="flex-1 flex items-center gap-2 border rounded-xl px-3 py-2 bg-[#F9F9F9]">
                    <Smile size={16} className="text-[#C1C1C1]" />
                    <select className="w-full outline-none text-sm bg-transparent" value={mood} onChange={(e:any) => setMood(e.target.value)}>
                      <option value="happy">開心 😊</option>
                      <option value="romantic">浪漫 🥰</option>
                      <option value="adventure">冒險 🧗</option>
                      <option value="chill">放鬆 ☕️</option>
                    </select>
                 </div>
              </div>

              <textarea placeholder="寫下當時的心情..." className="w-full border border-[#EAEAEA] rounded-xl p-3 h-24 outline-none text-sm resize-none" value={desc} onChange={e => setDesc(e.target.value)} />
              
              {/* Image Preview / Add */}
              <div>
                <label className="text-xs text-[#8A8A8A] mb-2 block">照片 ({images.length}/3)</label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.map((file, i) => (
                    <div key={i} className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden relative border border-[#EAEAEA]">
                      <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="" />
                      <button onClick={() => setImages(images.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5"><X size={12} /></button>
                    </div>
                  ))}
                  {images.length < 3 && (
                    <button onClick={() => fileInputRef.current?.click()} className="w-20 h-20 border-2 border-dashed border-[#D9B26D]/50 rounded-lg flex flex-col items-center justify-center text-[#D9B26D] bg-[#FFF8E8]">
                      <ImageIcon size={20} />
                      <span className="text-[10px] mt-1">新增</span>
                    </button>
                  )}
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" multiple />
                </div>
              </div>

            </div>

            <button onClick={handleSubmit} disabled={isUploading} className="w-full bg-[#D9B26D] text-white py-4 rounded-full mt-6 font-bold shadow-lg shadow-[#D9B26D]/30 active:scale-95 transition-transform">
              {isUploading ? '上傳中...' : '儲存回憶'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Memories;
