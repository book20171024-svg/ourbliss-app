
import React, { useState, useEffect, useRef } from 'react';
import { useCouple } from '../context/CoupleContext';
import { db, storage } from '../services/firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Send, Image as ImageIcon, Loader2, ArrowLeft } from 'lucide-react';
import { ChatMessage } from '../types';
import { useNavigate } from 'react-router-dom';
import { compressImage } from '../services/imageUtils'; // Import compression

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
      scrollToBottom();
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !coupleId || !currentUserRole) return;

    setIsUploading(true);
    try {
      // Compress before upload
      const compressedFile = await compressImage(file, 1024, 0.7);

      const storageRef = ref(storage, `chat_images/${coupleId}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, compressedFile);
      const url = await getDownloadURL(storageRef);

      await addDoc(collection(db, `couples/${coupleId}/chatMessages`), {
        senderId: currentUserRole,
        text: '',
        imageUrl: url,
        timestamp: Date.now(),
      });
      scrollToBottom();
    } catch (error: any) {
      console.error("Image upload failed:", error);
      alert("圖片上傳失敗");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
  };

  // Determine partner info (for header)
  const partnerName = currentUserRole === 'partner1' ? coupleData?.partner2Name : coupleData?.partner1Name;
  const partnerAvatar = currentUserRole === 'partner1' ? coupleData?.partner2Avatar : coupleData?.partner1Avatar;
  const partnerStatus = currentUserRole === 'partner1' ? coupleData?.partner2Status : coupleData?.partner1Status;

  return (
    <div className="flex flex-col h-full bg-[#F7F3ED] w-full relative">
      {/* Header - Fixed - Soft Gold Theme */}
      <header className="bg-white/90 backdrop-blur-md px-4 py-3 flex items-center gap-3 shadow-sm border-b border-[#EAEAEA] flex-shrink-0 z-20 pt-safe-top">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full text-[#8A8A8A] hover:bg-[#F7F3ED]">
           <ArrowLeft size={22} />
        </button>
        
        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm bg-[#EAEAEA]">
          <img 
            src={partnerAvatar || "https://picsum.photos/50"} 
            className="w-full h-full object-cover" 
            alt="partner"
          />
        </div>
        <div>
           <h2 className="text-base font-bold leading-tight text-[#3A3A3A]">
             {partnerName || 'Partner'}
           </h2>
           <p className="text-[10px] text-[#D9B26D] font-bold">
              {partnerStatus || 'Online'}
           </p>
        </div>
      </header>

      {/* Messages - Scrollable Area - Beige Background */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F7F3ED] pb-24">
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserRole;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                
                {msg.imageUrl && (
                  <div className={`mb-1 overflow-hidden rounded-2xl border-4 ${isMe ? 'border-[#D9B26D]/20' : 'border-white'} shadow-sm bg-white cursor-pointer`}>
                    <img 
                       src={msg.imageUrl} 
                       alt="chat-img" 
                       className="max-w-full h-auto max-h-60 object-cover min-w-[100px] min-h-[100px]" 
                       onLoad={scrollToBottom}
                    />
                  </div>
                )}

                {msg.text && (
                  <div 
                    className={`px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm relative ${
                      isMe 
                        ? 'bg-[#D9B26D] text-white rounded-2xl rounded-tr-none' 
                        : 'bg-white text-[#3A3A3A] rounded-2xl rounded-tl-none border border-[#EAEAEA]'
                    }`}
                  >
                    {msg.text}
                  </div>
                )}

                <span className="text-[10px] text-[#C1C1C1] mt-1 px-1 font-medium">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            </div>
          );
        })}
        {isUploading && (
          <div className="flex justify-end animate-pulse">
            <div className="bg-[#D9B26D] text-white px-4 py-2 rounded-2xl rounded-tr-none text-xs">
               發送圖片中...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed Bottom - Safe Area Aware */}
      <div className="absolute bottom-0 left-0 right-0 bg-white p-3 border-t border-[#EAEAEA] flex items-center gap-2 max-w-md mx-auto z-30 safe-area-bottom">
        <button 
           onClick={() => fileInputRef.current?.click()}
           className="p-3 text-[#D9B26D] bg-[#FFF8E8] rounded-full hover:bg-[#D9B26D] hover:text-white transition-colors"
        >
          {isUploading ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*"
          onChange={handleFileChange} 
        />
        
        <form onSubmit={handleSend} className="flex-1 flex items-center gap-2">
           <input 
             value={newMessage}
             onChange={(e) => setNewMessage(e.target.value)}
             placeholder="輸入訊息..."
             className="flex-1 bg-[#F7F3ED] rounded-full px-5 py-3 text-sm text-[#3A3A3A] outline-none placeholder-[#C1C1C1]"
           />
           <button 
             type="submit" 
             disabled={!newMessage.trim()} 
             className="p-3 bg-[#D9B26D] text-white rounded-full shadow-md disabled:opacity-50 active:scale-95 transition-transform"
           >
             <Send size={18} />
           </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
