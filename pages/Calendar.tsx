
import React, { useState, useEffect } from 'react';
import { useCouple } from '../context/CoupleContext';
import { db } from '../services/firebaseConfig';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { CalendarEvent } from '../types';
import { Plus, Calendar as CalendarIcon, MapPin, User, Users, Heart, AlignLeft, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CalendarPage: React.FC = () => {
  const { coupleId, currentUserRole } = useCouple();
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  // Default to today selected
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!coupleId) return;
    const q = query(collection(db, `couples/${coupleId}/events`), orderBy('dateTime', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CalendarEvent));
      
      const filtered = fetchedEvents.filter(ev => {
        // Creator always sees their own events
        if (ev.createdBy === currentUserRole) return true;
        // Joint and Partner events are visible
        if (ev.type === 'joint' || ev.type === 'partner') return true;
        // Personal events are hidden from partner
        return false;
      });
      setEvents(filtered);
    });
    return () => unsubscribe();
  }, [coupleId, currentUserRole]);

  // Calendar Logic
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  
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
    const newDate = new Date(currentDate.setMonth(currentDate.getMonth() + offset));
    setCurrentDate(new Date(newDate));
    // Reset selected date to first of month
    setSelectedDate(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-01`);
  };

  const selectedDayEvents = events.filter(e => e.dateTime.startsWith(selectedDate));
  const selectedDayObj = new Date(selectedDate);

  // Navigate to Add Event with pre-selected date
  const handleAddEvent = () => {
    navigate('/event-add', { state: { initialDate: selectedDate } });
  };

  return (
    <div className="flex flex-col h-full bg-[#F7F3ED] overflow-hidden">
      {/* Fixed Calendar Header & Grid */}
      <div className="bg-white pt-4 pb-2 px-4 shadow-sm z-10 rounded-b-3xl flex-shrink-0">
        <div className="flex justify-between items-center mb-4">
           <button onClick={() => changeMonth(-1)} className="p-2 text-[#C1C1C1] hover:text-[#D9B26D]">
             <ChevronLeft size={24} />
           </button>
           <h2 className="text-xl font-serif font-bold text-[#3A3A3A] tracking-widest">
             {year}年 {monthNames[month]}
           </h2>
           <button onClick={() => changeMonth(1)} className="p-2 text-[#C1C1C1] hover:text-[#D9B26D]">
             <ChevronRight size={24} />
           </button>
        </div>

        {/* Weekday Labels */}
        <div className="grid grid-cols-7 text-center text-xs text-[#C1C1C1] font-bold mb-2">
          <div className="text-red-300">日</div>
          <div>一</div><div>二</div><div>三</div><div>四</div><div>五</div>
          <div className="text-blue-300">六</div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-y-1 gap-x-1 pb-2">
          {blanks.map(b => <div key={`blank-${b}`} className="h-14" />)}
          {daysArray.map(day => {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = getEventsForDay(day);
            const isSelected = selectedDate === dateStr;
            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
            
            return (
              <div 
                key={day} 
                onClick={() => handleDayClick(day)}
                className={`h-16 flex flex-col items-center pt-1 rounded-lg cursor-pointer transition-colors relative border ${
                  isSelected ? 'bg-[#F7F3ED] border-[#D9B26D]' : 'border-transparent hover:bg-gray-50'
                }`}
              >
                <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-[#3A3A3A] text-white' : 'text-[#3A3A3A]'}`}>
                  {day}
                </span>
                
                {/* Event Bars */}
                <div className="w-full px-1 mt-1 flex flex-col gap-[2px]">
                  {dayEvents.slice(0, 3).map((e, i) => (
                    <div 
                      key={i} 
                      className="w-full h-[3px] rounded-full" 
                      style={{ backgroundColor: e.color || '#D9B26D' }} 
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="w-full flex justify-center">
                      <div className="w-1 h-1 bg-[#C1C1C1] rounded-full" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scrollable Event List */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 hide-scrollbar">
        <div className="flex justify-between items-center mb-4 px-2">
          <div className="flex flex-col">
            <span className="text-xs text-[#8A8A8A] uppercase tracking-wider">
              {selectedDayObj.toLocaleDateString('zh-TW', { weekday: 'long' })}
            </span>
            <span className="text-2xl font-serif font-bold text-[#3A3A3A]">
              {selectedDayObj.getDate()} {monthNames[selectedDayObj.getMonth()]}
            </span>
          </div>
          <button 
             onClick={handleAddEvent}
             className="bg-[#D9B26D] text-white p-3 rounded-full shadow-lg active:scale-95 transition-transform"
          >
            <Plus size={24} />
          </button>
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
               <CalendarIcon size={40} className="mb-2 opacity-20" />
               <p className="text-xs">今天沒有行程</p>
               <button onClick={handleAddEvent} className="mt-4 text-[#D9B26D] text-sm font-medium">
                 + 新增活動
               </button>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

// Event Card Component
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
    <div className="bg-white rounded-xl p-4 shadow-sm border-l-[4px] flex gap-4" style={{ borderLeftColor: event.color || '#D9B26D' }}>
       <div className="flex flex-col items-center justify-start min-w-[50px] border-r border-[#F7F3ED] pr-4">
          <span className="text-sm font-bold text-[#3A3A3A]">{timeStr}</span>
          <div className={`mt-2 ${typeInfo.text}`}>
            <Icon size={16} />
          </div>
       </div>
       <div className="flex-1">
          <h4 className="font-bold text-[#3A3A3A] text-base mb-1">{event.title}</h4>
          
          <div className="space-y-1">
            {event.location && (
              <div className="flex items-center gap-1.5 text-xs text-[#8A8A8A]">
                 <MapPin size={12} className="text-[#C1C1C1]" />
                 <span>{event.location}</span>
              </div>
            )}
            {event.note && (
              <div className="flex items-start gap-1.5 text-xs text-[#8A8A8A] mt-1">
                 <AlignLeft size={12} className="text-[#C1C1C1] mt-0.5" />
                 <span className="line-clamp-2 text-[#C1C1C1]">{event.note}</span>
              </div>
            )}
            {event.reminder && (
              <div className="inline-flex items-center gap-1 bg-[#F7F3ED] px-2 py-0.5 rounded text-[10px] text-[#D9B26D] mt-1">
                <Clock size={10} />
                <span>已設提醒</span>
              </div>
            )}
          </div>
       </div>
    </div>
  );
};

export default CalendarPage;
