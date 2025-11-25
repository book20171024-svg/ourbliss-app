
import React, { useState, useEffect, useRef } from 'react';
import { useCouple } from '../context/CoupleContext';
import { db, storage } from '../services/firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Send, Image as ImageIcon, Loader2 } from 'lucide-react';
import { ChatMessage } from '../types';

const Chat: React.FC = () => {
  const { coupleId, currentUserRole, coupleData } = useCouple();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!coupleId) return;

    const q = query(
      collection(db, `couples/${coupleId}/chatMessages`),
      orderBy('timestamp', 'asc')
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

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `chat_images/${coupleId}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      await addDoc(collection(db, `couples/${coupleId}/chatMessages`), {
        senderId: currentUserRole,
        text: '', // Empty text for image-only messages
        imageUrl: url,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      console.error("Image upload failed:", error);
      alert("圖片上傳失敗，請稍後再試。");
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-[#F7F3ED]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md p-4 sticky top-0 z-10 border-b border-[#EAEAEA] flex items-center justify-between shadow-sm">
        <h2 className="text-lg font-serif font-bold text-[#3A3A3A]">
           {currentUserRole === 'partner1' ? coupleData?.partner2Name : coupleData?.partner1Name}
        </h2>
        <div className="w-8 h-8 rounded-full overflow-hidden border border-[#D9B26D]">
          <img 
            src={currentUserRole === 'partner1' ? coupleData?.partner2Avatar : coupleData?.partner1Avatar || "https://picsum.photos/50"} 
            className="w-full h-full object-cover" 
            alt="partner"
          />
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
                  <div className={`mb-1 overflow-hidden rounded-2xl border ${isMe ? 'border-[#D9B26D]/50' : 'border-white'} shadow-sm`}>
                    <img src={msg.imageUrl} alt="chat-img" className="max-w-full h-auto max-h-60 object-cover" loading="lazy" />
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
          <div className="flex justify-end">
            <div className="bg-[#D9B26D]/10 text-[#D9B26D] px-4 py-2 rounded-2xl text-xs flex items-center gap-2">
               <Loader2 size={12} className="animate-spin" /> 圖片傳送中...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-[#EAEAEA]">
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
