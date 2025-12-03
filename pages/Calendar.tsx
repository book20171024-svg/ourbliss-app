
import React, { useState, useEffect } from 'react';
import { useCouple } from '../context/CoupleContext';
import { db } from '../services/firebaseConfig';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { CalendarEvent } from '../types';
import { Plus, Calendar as CalendarIcon, MapPin, User, Users, Heart, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CalendarPage: React.FC = () => {
  const { coupleId, currentUserRole } = useCouple();
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!coupleId) return;
    const q = query(collection(db, `couples/${coupleId}/events`), orderBy('dateTime', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CalendarEvent));
      
      const filtered = fetchedEvents.filter(ev => {
        if (ev.createdBy === currentUserRole) return true;
        if (ev.type === 'joint' || ev.type === 'partner') return true;
        return false;
      });
      setEvents(filtered);
    });
    return () => unsubscribe();
  }, [coupleId, currentUserRole]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.dateTime.startsWith(dateStr));
  };

  const handleDayClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(1); 
    newDate.setMonth(newDate.getMonth() + offset);
    
    setCurrentDate(newDate);
    setSelectedDate(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-01`);
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now.toISOString().split('T')[0]);
  };

  const selectedDayEvents = events.filter(e => e.dateTime.startsWith(selectedDate));
  const selectedDayObj = new Date(selectedDate);

  const handleAddEvent = () => {
    navigate('/event-add', { state: { initialDate: selectedDate } });
  };

  return (
    <div className="flex flex-col h-full bg-[#F7F3ED] overflow-hidden relative">
      {/* Calendar Header & Grid - Moved down by adding pt-10 */}
      <div className="bg-white pt-10 pb-4 px-4 shadow-sm z-10 rounded-b-[40px] flex-shrink-0">
        <div className="flex justify-between items-center mb-4 px-2">
           <div className="flex items-center gap-2">
             <button onClick={() => changeMonth(-1)} className="p-1 text-[#C1C1C1] hover:text-[#D9B26D]">
               <ChevronLeft size={24} />
             </button>
             <h2 className="text-lg font-serif font-bold text-[#3A3A3A] tracking-widest">
               {year}年 {monthNames[month]}
             </h2>
             <button onClick={() => changeMonth(1)} className="p-1 text-[#C1C1C1] hover:text-[#D9B26D]">
               <ChevronRight size={24} />
             </button>
           </div>
           
           <button onClick={goToToday} className="bg-[#F7F3ED] text-[#D9B26D] px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 active:scale-95">
             <RotateCcw size={12} /> 今天
           </button>
        </div>

        <div className="grid grid-cols-7 text-center text-xs text-[#C1C1C1] font-bold mb-2">
          <div className="text-red-300">日</div>
          <div>一</div><div>二</div><div>三</div><div>四</div><div>五</div>
          <div className="text-blue-300">六</div>
        </div>

        {/* Grid Cells */}
        <div className="grid grid-cols-7 gap-y-2 gap-x-1 pb-2">
          {blanks.map(b => <div key={`blank-${b}`} className="h-10" />)}
          {daysArray.map(day => {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = getEventsForDay(day);
            const isSelected = selectedDate === dateStr;
            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
            
            return (
              <div 
                key={day} 
                onClick={() => handleDayClick(day)}
                className={`h-10 flex flex-col items-center justify-start pt-1 rounded-xl cursor-pointer border transition-colors ${
                  isSelected ? 'bg-[#F7F3ED] border-[#D9B26D]' : 'border-transparent hover:bg-gray-50'
                }`}
              >
                <span className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full leading-none ${isToday ? 'bg-[#3A3A3A] text-white' : 'text-[#3A3A3A]'}`}>
                  {day}
                </span>
                
                {/* Dots/Bars - Max 3 dots to prevent overflow */}
                <div className="flex gap-[3px] mt-1">
                  {dayEvents.slice(0, 3).map((e, i) => (
                    <div 
                      key={i} 
                      className="w-1.5 h-1.5 rounded-full" 
                      style={{ backgroundColor: e.color || '#D9B26D' }} 
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scrollable Event List */}
      <div className="flex-1 overflow-y-auto p-6 pb-32 hide-scrollbar">
        <div className="flex flex-col mb-4 px-2">
            <span className="text-xs text-[#8A8A8A] uppercase tracking-wider">
              {selectedDayObj.toLocaleDateString('zh-TW', { weekday: 'long' })}
            </span>
            {/* Display Month First, then Date - Larger Font */}
            <span className="text-2xl font-serif font-bold text-[#3A3A3A] mt-1">
              {monthNames[selectedDayObj.getMonth()]} {selectedDayObj.getDate()}日
            </span>
        </div>

        <div className="space-y-4">
           {selectedDayEvents.length > 0 ? (
             selectedDayEvents.map(event => (
               <div key={event.id} onClick={() => navigate(`/event-edit/${event.id}`)} className="cursor-pointer active:scale-[0.98] transition-transform">
                 <EventCard event={event} />
               </div>
             ))
           ) : (
             <div className="flex flex-col items-center justify-center py-12 text-[#C1C1C1]">
               <CalendarIcon size={40} className="mb-3 opacity-20" />
               <p className="text-sm">沒有行程</p>
             </div>
           )}
        </div>
      </div>
      
      {/* Floating Add Button (Absolute) */}
      <button 
         onClick={handleAddEvent}
         className="absolute bottom-28 right-6 bg-[#D9B26D] text-white p-4 rounded-full shadow-xl active:scale-95 transition-transform z-20"
      >
        <Plus size={28} />
      </button>
    </div>
  );
};

const EventCard: React.FC<{ event: CalendarEvent }> = ({ event }) => {
  const getTypeInfo = () => {
    switch(event.type) {
      case 'joint': return { label: '共同', icon: Users, text: 'text-[#D9B26D]' };
      case 'personal': return { label: '單獨', icon: User, text: 'text-blue-400' };
      case 'partner': return { label: '伴侶', icon: Heart, text: 'text-pink-400' };
      default: return { label: '活動', icon: CalendarIcon, text: 'text-gray-400' };
    }
  };
  const typeInfo = getTypeInfo();
  const Icon = typeInfo.icon;
  const timeStr = new Date(event.dateTime).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border-l-[6px] flex gap-4" style={{ borderLeftColor: event.color || '#D9B26D' }}>
       <div className="flex flex-col items-center justify-center min-w-[50px] border-r border-[#F7F3ED] pr-4">
          <span className="text-sm font-bold text-[#3A3A3A]">{timeStr}</span>
          <div className={`mt-2 ${typeInfo.text}`}>
            <Icon size={18} />
          </div>
       </div>
       <div className="flex-1 py-1">
          <h4 className="font-bold text-[#3A3A3A] text-base mb-1">{event.title}</h4>
          {event.location && (
            <div className="flex items-center gap-1.5 text-xs text-[#8A8A8A]">
                <MapPin size={12} className="text-[#C1C1C1]" />
                <span>{event.location}</span>
            </div>
          )}
       </div>
    </div>
  );
};

export default CalendarPage;
