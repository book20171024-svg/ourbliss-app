
import React, { useState, useEffect } from 'react';
import { useCouple } from '../context/CoupleContext';
import { db } from '../services/firebaseConfig';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Anniversary } from '../types';
import { Plus, Trash2, Heart, Gift, Calculator } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AnniversaryList: React.FC = () => {
  const { coupleId, coupleData, updateCoupleData } = useCouple();
  const navigate = useNavigate();
  const [anns, setAnns] = useState<Anniversary[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');

  // Main Ann State
  const [mainDate, setMainDate] = useState(coupleData?.anniversaryDate.split('T')[0] || '');

  useEffect(() => {
    if (!coupleId) return;
    const q = query(collection(db, `couples/${coupleId}/anniversaries`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAnns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Anniversary)));
    });
    return () => unsubscribe();
  }, [coupleId]);

  const getDaysDiff = (dateStr: string) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(dateStr);
    target.setHours(0,0,0,0);
    return Math.ceil((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getNextMilestone = (startDateStr: string) => {
    const daysPassed = Math.abs(getDaysDiff(startDateStr));
    const next100 = Math.ceil(daysPassed / 100) * 100;
    const daysTo100 = next100 - daysPassed;
    
    // Simple year logic
    const start = new Date(startDateStr);
    const today = new Date();
    const currentYearAnn = new Date(start);
    currentYearAnn.setFullYear(today.getFullYear());
    if (currentYearAnn < today) currentYearAnn.setFullYear(today.getFullYear() + 1);
    
    const daysToYear = Math.ceil((currentYearAnn.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return { next100, daysTo100, daysToYear };
  };

  const handleUpdateMain = async () => {
     if(mainDate) {
       await updateCoupleData({ anniversaryDate: new Date(mainDate).toISOString() });
     }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coupleId) return;
    await addDoc(collection(db, `couples/${coupleId}/anniversaries`), {
      title: newTitle,
      date: newDate,
      type: 'other'
    });
    setShowAdd(false);
    setNewTitle('');
    setNewDate('');
  };

  const handleDelete = async (id: string) => {
    if(!coupleId || !confirm("確定刪除？")) return;
    await deleteDoc(doc(db, `couples/${coupleId}/anniversaries`, id));
  };

  const mainDays = getDaysDiff(mainDate);
  const mainMilestone = getNextMilestone(mainDate);

  return (
    <div className="min-h-full bg-[#F7F3ED] p-6 pb-24">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-serif font-bold text-[#3A3A3A]">紀念日管理</h2>
        <button onClick={() => navigate(-1)} className="text-[#8A8A8A]">返回</button>
      </div>

      {/* Main Anniversary Card */}
      <div className="bg-white rounded-2xl p-6 shadow-md mb-8 border border-[#D9B26D]/20 relative overflow-hidden">
         <div className="absolute top-0 right-0 bg-[#D9B26D] text-white text-[10px] px-2 py-1 rounded-bl-xl font-bold">MAIN</div>
         <div className="flex items-center gap-2 mb-4 text-[#D9B26D]">
           <Heart fill="#D9B26D" size={20} />
           <span className="font-bold text-sm">我們在一起</span>
         </div>
         <div className="text-center mb-6">
             <p className="text-5xl font-serif font-bold text-[#3A3A3A] mb-1">{mainDays}</p>
             <p className="text-xs text-[#8A8A8A] tracking-widest uppercase">DAYS</p>
         </div>
         
         {/* Milestones */}
         <div className="grid grid-cols-2 gap-4 bg-[#F7F3ED] p-4 rounded-xl">
            <div className="text-center">
              <span className="block text-[10px] text-[#8A8A8A] mb-1">距離 {mainMilestone.next100} 天</span>
              <span className="font-bold text-[#3A3A3A]">還有 {mainMilestone.daysTo100} 天</span>
            </div>
            <div className="text-center border-l border-[#EAEAEA]">
              <span className="block text-[10px] text-[#8A8A8A] mb-1">距離下個週年</span>
              <span className="font-bold text-[#3A3A3A]">還有 {mainMilestone.daysToYear} 天</span>
            </div>
         </div>

         <input 
           type="date" 
           value={mainDate}
           onChange={(e) => setMainDate(e.target.value)}
           onBlur={handleUpdateMain}
           className="mt-4 w-full text-center bg-transparent text-xs text-[#C1C1C1] outline-none"
         />
      </div>

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-[#8A8A8A]">其他紀念日</h3>
        <button onClick={() => setShowAdd(!showAdd)} className="text-[#D9B26D] text-sm flex items-center gap-1">
          <Plus size={16} /> 新增
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white p-4 rounded-xl shadow-sm mb-4 animate-fade-in space-y-3">
          <input className="w-full border-b border-[#EAEAEA] py-2 outline-none text-sm" placeholder="名稱 (例如: 第一次旅行)" value={newTitle} onChange={e => setNewTitle(e.target.value)} required />
          <input type="date" className="w-full border-b border-[#EAEAEA] py-2 outline-none text-sm text-[#8A8A8A]" value={newDate} onChange={e => setNewDate(e.target.value)} required />
          <button type="submit" className="w-full bg-[#D9B26D] text-white py-2 rounded-lg text-sm">新增</button>
        </form>
      )}

      <div className="space-y-3">
        {anns.map(ann => {
          const days = getDaysDiff(ann.date);
          const milestone = getNextMilestone(ann.date);
          
          return (
            <div key={ann.id} className="bg-white p-4 rounded-xl shadow-sm flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#F7F3ED] flex items-center justify-center text-[#D9B26D]">
                    <Gift size={14} />
                  </div>
                  <div>
                     <h4 className="text-[#3A3A3A] font-medium text-sm">{ann.title}</h4>
                     <p className="text-[10px] text-[#C1C1C1]">{ann.date}</p>
                  </div>
                </div>
                <button onClick={() => handleDelete(ann.id)} className="text-red-200 hover:text-red-400"><Trash2 size={14} /></button>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-[#F7F3ED] mt-1">
                 <span className="text-xs text-[#8A8A8A]">已過 <strong className="text-[#3A3A3A]">{days}</strong> 天</span>
                 <span className="text-[10px] bg-[#FFF8E8] text-[#D9B26D] px-2 py-0.5 rounded-full">下個週年: {milestone.daysToYear} 天</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AnniversaryList;
