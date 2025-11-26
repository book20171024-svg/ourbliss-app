
import React, { useState, useEffect, useRef } from 'react';
import { useCouple } from '../context/CoupleContext';
import { db, storage } from '../services/firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Send, Image as ImageIcon, Loader2, ArrowLeft } from 'lucide-react';
import { ChatMessage } from '../types';
import { useNavigate } from 'react-router-dom';

const Chat: React.FC = () => {
  const { coupleId, currentUserRole, coupleData } = useCouple();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!coupleId) return;

    // PERFORMANCE OPTIMIZATION: Limit to last 50 messages
    const q = query(
      collection(db, `couples/${coupleId}/chatMessages`),
      orderBy('timestamp', 'asc'),
      limit(50) 
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      setMessages(msgs);
      // Auto-scroll only if near bottom or initial load
      setTimeout(scrollToBottom, 100);
    });

    return () => unsubscribe();
  }, [coupleId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !coupleId || !currentUserRole) return;

    try {
      await addDoc(collection(db, `couples/${coupleId}/chatMessages`), {
        senderId: currentUserRole,
        text: newMessage,
        timestamp: Date.now(),
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !coupleId || !currentUserRole) return;

    // Safety check for file size (e.g. 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert("圖片太大，請選擇小於 5MB 的圖片");
        return;
    }

    setIsUploading(true);
    // Optimistic UI could go here
    try {
      const storageRef = ref(storage, `chat_images/${coupleId}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      await addDoc(collection(db, `couples/${coupleId}/chatMessages`), {
        senderId: currentUserRole,
        text: '',
        imageUrl: url,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      console.error("Image upload failed:", error);
      alert("圖片上傳失敗，請檢查網路或權限。");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-[#F7F3ED]">
      {/* Header with Back Button */}
      <header className="bg-white/80 backdrop-blur-md px-4 py-3 sticky top-0 z-10 border-b border-[#EAEAEA] flex items-center gap-3 shadow-sm">
        <button onClick={() => navigate(-1)} className="text-[#3A3A3A] p-1 -ml-2 rounded-full hover:bg-gray-100">
           <ArrowLeft size={22} />
        </button>
        
        <div className="w-9 h-9 rounded-full overflow-hidden border border-[#EAEAEA]">
          <img 
            src={currentUserRole === 'partner1' ? coupleData?.partner2Avatar : coupleData?.partner1Avatar || "https://picsum.photos/50"} 
            className="w-full h-full object-cover" 
            alt="partner"
          />
        </div>
        <div>
           <h2 className="text-base font-serif font-bold text-[#3A3A3A] leading-tight">
             {currentUserRole === 'partner1' ? coupleData?.partner2Name : coupleData?.partner1Name}
           </h2>
           <p className="text-[10px] text-[#D9B26D] font-bold">
              {currentUserRole === 'partner1' ? coupleData?.partner2Status : coupleData?.partner1Status || 'Online'}
           </p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserRole;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                
                {/* Image Message */}
                {msg.imageUrl && (
                  <div className={`mb-1 overflow-hidden rounded-2xl border ${isMe ? 'border-[#D9B26D]/50' : 'border-white'} shadow-sm bg-white`}>
                    <img 
                       src={msg.imageUrl} 
                       alt="chat-img" 
                       className="max-w-full h-auto max-h-60 object-cover min-w-[100px] min-h-[100px]" 
                       loading="lazy"
                    />
                  </div>
                )}

                {/* Text Message */}
                {msg.text && (
                  <div 
                    className={`px-4 py-2.5 shadow-sm text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      isMe 
                        ? 'bg-[#D9B26D] text-white rounded-2xl rounded-tr-sm' 
                        : 'bg-white text-[#3A3A3A] rounded-2xl rounded-tl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                )}

                {/* Timestamp */}
                <span className="text-[10px] text-[#C1C1C1] mt-1 px-1">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            </div>
          );
        })}
        {isUploading && (
          <div className="flex justify-end animate-pulse">
            <div className="bg-[#D9B26D]/10 text-[#D9B26D] px-4 py-2 rounded-2xl text-xs flex items-center gap-2">
               <Loader2 size={12} className="animate-spin" /> 圖片傳送中...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-[#EAEAEA] safe-area-bottom">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleFileChange}
        />
        
        <form onSubmit={handleSend} className="flex items-end gap-2">
          <button 
            type="button" 
            onClick={handleImageClick}
            disabled={isUploading}
            className="p-3 text-[#C1C1C1] hover:text-[#D9B26D] hover:bg-[#F7F3ED] rounded-full transition-colors"
          >
            <ImageIcon size={24} />
          </button>
          
          <div className="flex-1 bg-[#F7F3ED] rounded-2xl px-4 py-2 min-h-[44px] flex items-center">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="傳送訊息..."
              className="w-full bg-transparent text-[#3A3A3A] text-sm outline-none placeholder-[#C1C1C1]"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={!newMessage.trim() && !isUploading}
            className={`p-3 rounded-full transition-all shadow-md flex-shrink-0 ${
              newMessage.trim() 
                ? 'bg-[#D9B26D] text-white active:scale-95' 
                : 'bg-[#EAEAEA] text-white'
            }`}
          >
            <Send size={20} className={newMessage.trim() ? 'ml-0.5' : ''} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
