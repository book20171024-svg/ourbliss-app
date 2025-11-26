
import React, { useEffect, useState } from 'react';
import { useCouple } from '../context/CoupleContext';
import { db } from '../services/firebaseConfig';
import { collection, onSnapshot, query, addDoc } from 'firebase/firestore';
import { Goal } from '../types';
import { Plus, ArrowRight, Flag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const categories = [
  { id: 'all', label: '全部', icon: '♾️' },
  { id: 'travel', label: '旅行', icon: '✈️' },
  { id: 'finance', label: '理財', icon: '💰' },
  { id: 'health', label: '健康', icon: '🏃‍♂️' },
  { id: 'relationship', label: '感情', icon: '💕' },
  { id: 'bucketList', label: '願望', icon: '🌟' },
  { id: 'other', label: '其他', icon: '✨' },
];

const Goals: React.FC = () => {
  const { coupleId } = useCouple();
  const navigate = useNavigate();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [filteredGoals, setFilteredGoals] = useState<Goal[]>([]);
  const [activeFilter, setActiveFilter] = useState('all');
  
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<Goal['category']>('bucketList');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!coupleId) return;
    const q = query(collection(db, `couples/${coupleId}/goals`));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Goal));
      setGoals(list);
    });
    return () => unsubscribe();
  }, [coupleId]);

  useEffect(() => {
    if (activeFilter === 'all') {
      setFilteredGoals(goals);
    } else {
      setFilteredGoals(goals.filter(g => g.category === activeFilter));
    }
  }, [goals, activeFilter]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coupleId || !newTitle || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, `couples/${coupleId}/goals`), {
        title: newTitle,
        category: newCategory,
        subTasks: [],
        isCompleted: false,
        createdAt: Date.now()
      });
      setNewTitle('');
      setShowAdd(false);
    } catch (e) {
      console.error(e);
      alert("新增失敗");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProgress = (goal: Goal) => {
    if (!goal.subTasks || goal.subTasks.length === 0) return 0;
    const completed = goal.subTasks.filter(t => t.isCompleted).length;
    return Math.round((completed / goal.subTasks.length) * 100);
  };

  return (
    <div className="h-full bg-[#F7F3ED] overflow-y-auto p-6 pb-24">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-serif font-bold text-[#3A3A3A]">共同目標</h2>
          <p className="text-[#8A8A8A] text-xs">一起完成的夢想清單</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="w-10 h-10 bg-[#D9B26D] text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform">
          <Plus size={24} />
        </button>
      </header>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-2 hide-scrollbar">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveFilter(cat.id)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
              activeFilter === cat.id 
                ? 'bg-[#3A3A3A] text-white border-[#3A3A3A]' 
                : 'bg-white text-[#8A8A8A] border-[#EAEAEA] shadow-sm'
            }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>
      
      <div className="space-y-4">
        {filteredGoals.map(goal => {
          const progress = getProgress(goal);
          const catInfo = categories.find(c => c.id === goal.category) || categories[categories.length - 1];
          
          return (
            <div 
              key={goal.id} 
              onClick={() => navigate(`/goals/${goal.id}`)}
              className="bg-white rounded-2xl p-4 shadow-sm border border-[#EAEAEA] flex items-center gap-4 active:scale-95 transition-transform cursor-pointer"
            >
              <div className="w-12 h-12 bg-[#F7F3ED] rounded-full flex items-center justify-center text-2xl">
                {catInfo.icon}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <h3 className={`font-bold text-[#3A3A3A] ${goal.isCompleted ? 'line-through opacity-50' : ''}`}>{goal.title}</h3>
                  <span className="text-xs font-bold text-[#D9B26D]">{progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                  <div className="h-full bg-[#D9B26D]" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
              <ArrowRight size={16} className="text-[#C1C1C1]" />
            </div>
          );
        })}
        
        {/* Empty State */}
        {filteredGoals.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
             <div className="w-20 h-20 bg-[#F9F9F9] rounded-full flex items-center justify-center mb-4 shadow-inner text-[#C1C1C1]">
                <Flag size={40} className="opacity-30" />
             </div>
             <p className="text-[#3A3A3A] font-bold mb-1">還沒有共同目標</p>
             <p className="text-[#C1C1C1] text-xs mb-6 max-w-[200px]">
               {activeFilter === 'all' 
                 ? '一起設下第一個里程碑吧！可能是旅行、存錢或是一起運動。' 
                 : `在「${categories.find(c=>c.id===activeFilter)?.label}」分類下還沒有目標。`
               }
             </p>
             <button 
               onClick={() => setShowAdd(true)}
               className="px-6 py-2 bg-[#F7F3ED] text-[#D9B26D] rounded-full text-sm font-bold border border-[#D9B26D]/20 active:scale-95 transition-transform"
             >
               + 建立目標
             </button>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center animate-fade-in">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAdd(false)}></div>
          <form onSubmit={handleAdd} className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 relative z-10 safe-area-bottom">
            <h3 className="font-bold text-lg mb-4 text-[#3A3A3A]">新增目標</h3>
            <input 
              className="w-full border-b border-[#EAEAEA] py-2 mb-4 outline-none font-bold" 
              placeholder="目標名稱 (例如: 一起看日出)" 
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {categories.filter(c => c.id !== 'all').map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setNewCategory(c.id as any)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border ${
                    newCategory === c.id ? 'bg-[#D9B26D] text-white border-[#D9B26D]' : 'text-[#8A8A8A] border-[#EAEAEA]'
                  }`}
                >
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-3 text-[#8A8A8A]">取消</button>
              <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-[#D9B26D] text-white rounded-xl font-bold">
                 {isSubmitting ? '...' : '建立'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Goals;
