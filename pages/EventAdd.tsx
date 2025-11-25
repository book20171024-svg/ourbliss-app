
import React, { useState, useEffect } from 'react';
import { useCouple } from '../context/CoupleContext';
import { db } from '../services/firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, MapPin, Bell, AlignLeft, Users, User, Heart, Calendar } from 'lucide-react';
import { CalendarEvent } from '../types';

const EventAdd: React.FC = () => {
  const { coupleId, currentUserRole, loading } = useCouple();
  const navigate = useNavigate();
  const locationState = useLocation().state as { initialDate?: string } | null;

  const [title, setTitle] = useState('');
  const [type, setType] = useState<'joint' | 'personal' | 'partner'>('joint');
  const [dateTime, setDateTime] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [reminder, setReminder] = useState<CalendarEvent['reminder']>('none');
  const [note, setNote] = useState('');
  const [color, setColor] = useState('#D9B26D');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && (!coupleId || !currentUserRole)) {
      alert("請重新登入以繼續操作。");
      navigate('/');
      return;
    }

    // Set initial date if passed from calendar
    if (locationState?.initialDate) {
      // Default to 9:00 AM on selected date
      setDateTime(`${locationState.initialDate}T09:00`);
    } else if (!dateTime) {
      // Default to now if no state
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setDateTime(now.toISOString().slice(0, 16));
    }
  }, [loading, coupleId, currentUserRole, navigate, locationState]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || isSubmitting || !coupleId || !currentUserRole) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, `couples/${coupleId}/events`), {
        title,
        type,
        dateTime, // ISO string from datetime-local
        isAllDay,
        location,
        reminder,
        note,
        color,
        createdBy: currentUserRole
      });
      navigate('/calendar');
    } catch (error: any) {
      console.error("Error adding event:", error);
      alert(`新增失敗：${error.message}`);
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F7F3ED]">載入中...</div>;

  return (
    <div className="min-h-full bg-[#F7F3ED] p-6 pb-24 flex flex-col animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-serif font-bold text-[#3A3A3A]">新增活動</h2>
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full text-[#C1C1C1]"><X size={20} /></button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 space-y-5">
        <div className="bg-white p-5 rounded-3xl shadow-sm space-y-5 border border-[#EAEAEA]">
          <input 
            className="w-full text-xl font-bold outline-none placeholder-[#C1C1C1] bg-transparent text-[#3A3A3A]" 
            placeholder="活動名稱" 
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
          <div className="flex gap-2">
            {[
              { id: 'joint', label: '共同', icon: Users },
              { id: 'personal', label: '單獨', icon: User },
              { id: 'partner', label: '伴侶', icon: Heart },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setType(item.id as any)}
                className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 border ${
                  type === item.id ? 'bg-[#D9B26D]/10 border-[#D9B26D] text-[#D9B26D]' : 'bg-[#F9F9F9] border-transparent text-[#C1C1C1]'
                }`}
              >
                <item.icon size={16} />
                <span className="text-xs font-bold">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-sm divide-y divide-[#F7F3ED] border border-[#EAEAEA]">
          {/* Date Time */}
          <div className="py-3">
             <div className="flex items-center justify-between mb-2">
               <div className="flex items-center gap-2 text-[#8A8A8A] text-xs font-bold"><Calendar size={16} /> 日期與時間</div>
               <div className="flex items-center gap-2">
                 <label className="text-xs text-[#8A8A8A]">全天</label>
                 <input type="checkbox" checked={isAllDay} onChange={e => setIsAllDay(e.target.checked)} className="accent-[#D9B26D]" />
               </div>
             </div>
             <input 
               type="datetime-local" 
               className="w-full outline-none bg-transparent font-medium text-[#3A3A3A]"
               value={dateTime}
               onChange={e => setDateTime(e.target.value)}
               required
             />
          </div>

          {/* Location */}
          <div className="py-3 flex items-center gap-3">
             <MapPin size={20} className="text-[#D9B26D]" />
             <input placeholder="地點 (可開啟地圖)" className="w-full outline-none text-sm" value={location} onChange={e => setLocation(e.target.value)} />
          </div>

          {/* Reminder */}
          <div className="py-3 flex items-center gap-3">
             <Bell size={20} className="text-[#D9B26D]" />
             <select className="w-full outline-none text-sm bg-transparent" value={reminder} onChange={(e:any) => setReminder(e.target.value)}>
               <option value="none">不提醒</option>
               <option value="10min">10 分鐘前</option>
               <option value="1hour">1 小時前</option>
               <option value="1day">1 天前</option>
             </select>
          </div>

          {/* Note */}
          <div className="py-3 flex items-start gap-3">
             <AlignLeft size={20} className="text-[#D9B26D] mt-1" />
             <textarea placeholder="備註..." className="w-full outline-none text-sm h-20 resize-none" value={note} onChange={e => setNote(e.target.value)} />
          </div>

          {/* Color */}
           <div className="py-3">
            <label className="text-xs text-[#8A8A8A] font-bold block mb-2">標籤顏色</label>
            <div className="flex gap-2">
              {['#D9B26D', '#E8C88B', '#F28B82', '#81C995', '#8AB4F8', '#C58AF9'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-[#3A3A3A]' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
           </div>
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full bg-[#D9B26D] text-white py-4 rounded-full font-bold shadow-lg mt-4">
          {isSubmitting ? '建立中...' : '完成'}
        </button>
      </form>
    </div>
  );
};

export default EventAdd;
