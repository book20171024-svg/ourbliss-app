
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
    // FIX: Set date to 1st before changing month to avoid overflow (e.g. Jan 31 -> Feb 28/Mar 3)
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
      {/* Ultra Compact Calendar Header & Grid */}
      <div className="bg-white pt-2 pb-1 px-4 shadow-sm z-10 rounded-b-3xl flex-shrink-0">
        <div className="flex justify-between items-center mb-1">
           <div className="flex items-center gap-2">
             <button onClick={() => changeMonth(-1)} className="p-1 text-[#C1C1C1] hover:text-[#D9B26D]">
               <ChevronLeft size={20} />
             </button>
             <h2 className="text-sm font-serif font-bold text-[#3A3A3A] tracking-widest">
               {year}年 {monthNames[month]}
             </h2>
             <button onClick={() => changeMonth(1)} className="p-1 text-[#C1C1C1] hover:text-[#D9B26D]">
               <ChevronRight size={20} />
             </button>
           </div>
           
           <button onClick={goToToday} className="bg-[#F7F3ED] text-[#D9B26D] px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 active:scale-95">
             <RotateCcw size={10} /> 今天
           </button>
        </div>

        <div className="grid grid-cols-7 text-center text-[10px] text-[#C1C1C1] font-bold mb-0.5">
          <div className="text-red-300">日</div>
          <div>一</div><div>二</div><div>三</div><div>四</div><div>五</div>
          <div className="text-blue-300">六</div>
        </div>

        {/* Short Grid Cells: h-9 */}
        <div className="grid grid-cols-7 gap-y-0.5 gap-x-0.5 pb-1">
          {blanks.map(b => <div key={`blank-${b}`} className="h-9" />)}
          {daysArray.map(day => {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = getEventsForDay(day);
            const isSelected = selectedDate === dateStr;
            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
            
            return (
              <div 
                key={day} 
                onClick={() => handleDayClick(day)}
                className={`h-9 flex flex-col items-center justify-start pt-0.5 rounded-md cursor-pointer border ${
                  isSelected ? 'bg-[#F7F3ED] border-[#D9B26D]' : 'border-transparent hover:bg-gray-50'
                }`}
              >
                <span className={`text-[10px] font-medium w-4 h-4 flex items-center justify-center rounded-full leading-none ${isToday ? 'bg-[#3A3A3A] text-white' : 'text-[#3A3A3A]'}`}>
                  {day}
                </span>
                
                {/* Dots/Bars - Max 3 dots to prevent overflow */}
                <div className="flex gap-[2px] mt-0.5">
                  {dayEvents.slice(0, 3).map((e, i) => (
                    <div 
                      key={i} 
                      className="w-1 h-1 rounded-full" 
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
      <div className="flex-1 overflow-y-auto p-4 pb-24 hide-scrollbar">
        <div className="flex flex-col mb-4 px-2">
            <span className="text-[10px] text-[#8A8A8A] uppercase tracking-wider">
              {selectedDayObj.toLocaleDateString('zh-TW', { weekday: 'long' })}
            </span>
            {/* Display Month First, then Date */}
            <span className="text-lg font-serif font-bold text-[#3A3A3A]">
              {monthNames[selectedDayObj.getMonth()]} {selectedDayObj.getDate()}日
            </span>
        </div>

        <div className="space-y-3">
           {selectedDayEvents.length > 0 ? (
             selectedDayEvents.map(event => (
               <div key={event.id} onClick={() => navigate(`/event-edit/${event.id}`)} className="cursor-pointer">
                 <EventCard event={event} />
               </div>
             ))
           ) : (
             <div className="flex flex-col items-center justify-center py-10 text-[#C1C1C1]">
               <CalendarIcon size={32} className="mb-2 opacity-20" />
               <p className="text-xs">沒有行程</p>
             </div>
           )}
        </div>
      </div>
      
      {/* Floating Add Button (Absolute) */}
      <button 
         onClick={handleAddEvent}
         className="absolute bottom-24 right-6 bg-[#D9B26D] text-white p-4 rounded-full shadow-xl active:scale-95 transition-transform z-20"
      >
        <Plus size={24} />
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
    <div className="bg-white rounded-xl p-3 shadow-sm border-l-[4px] flex gap-3" style={{ borderLeftColor: event.color || '#D9B26D' }}>
       <div className="flex flex-col items-center justify-start min-w-[40px] border-r border-[#F7F3ED] pr-3">
          <span className="text-xs font-bold text-[#3A3A3A]">{timeStr}</span>
          <div className={`mt-1 ${typeInfo.text}`}>
            <Icon size={14} />
          </div>
       </div>
       <div className="flex-1">
          <h4 className="font-bold text-[#3A3A3A] text-sm mb-1">{event.title}</h4>
          {event.location && (
            <div className="flex items-center gap-1 text-[10px] text-[#8A8A8A]">
                <MapPin size={10} className="text-[#C1C1C1]" />
                <span>{event.location}</span>
            </div>
          )}
       </div>
    </div>
  );
};

export default CalendarPage;
