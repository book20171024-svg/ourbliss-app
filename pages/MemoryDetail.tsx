
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCouple } from '../context/CoupleContext';
import { db, storage } from '../services/firebaseConfig';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, collection, addDoc, query, orderBy, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Memory, Comment } from '../types';
import { ArrowLeft, MapPin, Heart, MessageCircle, Send, MoreVertical, Trash2, Check, X, Calendar, Plus, Smile, Clock } from 'lucide-react';
import { compressImage } from '../services/imageUtils'; // Import compression

const MemoryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { coupleId, currentUserRole, coupleData } = useCouple();
  const navigate = useNavigate();
  
  const [memory, setMemory] = useState<Memory | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  
  // Menu State
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Edit State
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editMood, setEditMood] = useState<Memory['mood']>('happy');
  const [uploadingImg, setUploadingImg] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!coupleId || !id) return;

    // Fetch Memory
    const memRef = doc(db, `couples/${coupleId}/memories`, id);
    const unsubMem = onSnapshot(memRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as Memory;
        setMemory(data);
        setIsLiked(data.likes?.includes(currentUserRole || '') || false);
        // Sync edit state
        setEditTitle(data.title);
        setEditDate(data.date);
        setEditTime(data.time || '');
        setEditLocation(data.location);
        setEditDesc(data.description);
        setEditMood(data.mood || 'happy');
      }
    });

    // Fetch Comments
    const commentsRef = collection(db, `couples/${coupleId}/memories/${id}/comments`);
    const q = query(commentsRef, orderBy('timestamp', 'asc'));
    const unsubComments = onSnapshot(q, (snap) => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
    });

    return () => {
      unsubMem();
      unsubComments();
    };
  }, [coupleId, id, currentUserRole]);

  const handleLike = async () => {
    if (!coupleId || !id || !currentUserRole) return;
    const memRef = doc(db, `couples/${coupleId}/memories`, id);
    if (isLiked) {
      await updateDoc(memRef, { likes: arrayRemove(currentUserRole) });
    } else {
      await updateDoc(memRef, { likes: arrayUnion(currentUserRole) });
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !coupleId || !id || !currentUserRole) return;

    await addDoc(collection(db, `couples/${coupleId}/memories/${id}/comments`), {
      senderId: currentUserRole,
      text: newComment,
      timestamp: Date.now()
    });
    setNewComment('');
  };

  const handleSaveEdit = async () => {
    if (!coupleId || !id) return;
    await updateDoc(doc(db, `couples/${coupleId}/memories`, id), {
      title: editTitle,
      date: editDate,
      time: editTime,
      location: editLocation,
      description: editDesc,
      mood: editMood
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!coupleId || !id) return;
    if (window.confirm("確定要刪除這段回憶嗎？刪除後無法復原。")) {
       await deleteDoc(doc(db, `couples/${coupleId}/memories`, id));
       navigate('/memories');
    }
  };

  // Image editing
  const removeImage = async (imgUrl: string) => {
    if(!coupleId || !id || !confirm("移除這張照片？")) return;
    await updateDoc(doc(db, `couples/${coupleId}/memories`, id), {
        images: arrayRemove(imgUrl)
    });
  };

  const handleAddImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if(e.target.files && e.target.files[0] && coupleId && id) {
        setUploadingImg(true);
        try {
            const file = e.target.files[0];
            const compressed = await compressImage(file, 1280, 0.8); // Compress

            const storageRef = ref(storage, `memories/${coupleId}/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, compressed);
            const url = await getDownloadURL(storageRef);
            await updateDoc(doc(db, `couples/${coupleId}/memories`, id), {
                images: arrayUnion(url)
            });
        } catch(err) {
            alert("上傳失敗");
        } finally {
            setUploadingImg(false);
        }
    }
  }

  if (!memory || !coupleData) return <div className="p-6 text-center text-[#D9B26D]">載入中...</div>;

  return (
    <div className="min-h-full bg-[#3A3A3A] text-white flex flex-col relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/50 to-transparent">
        <button onClick={() => navigate(-1)} className="text-white p-2">
          <ArrowLeft size={24} />
        </button>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="text-white p-2">
            <MoreVertical size={24} />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-10 bg-white text-[#3A3A3A] rounded-xl shadow-xl w-32 overflow-hidden animate-fade-in origin-top-right">
              <button 
                onClick={() => { setIsEditing(true); setShowMenu(false); }}
                className="w-full text-left px-4 py-3 text-sm hover:bg-[#F7F3ED] border-b border-[#F7F3ED]"
              >
                編輯
              </button>
              <button 
                onClick={handleDelete}
                className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 size={14} /> 刪除
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Media Display */}
        <div className="flex-1 bg-black flex items-center justify-center relative min-h-[40vh] py-16">
          <div className="flex gap-4 overflow-x-auto px-6 w-full snap-x">
             {memory.images && memory.images.length > 0 ? (
                 memory.images.map((img, idx) => (
                    <div key={idx} className="relative flex-shrink-0 w-full max-w-sm snap-center">
                        <img src={img} alt="" className="w-full h-auto max-h-[60vh] object-contain rounded-lg" />
                        {isEditing && (
                            <button onClick={() => removeImage(img)} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-md">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                 ))
             ) : (
                 // Backwards compatibility
                 // @ts-ignore
                 memory.imageUrl && <img src={memory.imageUrl} className="w-full h-auto max-h-[60vh] object-contain" />
             )}
             
             {isEditing && (!memory.images || memory.images.length < 3) && (
                 <button onClick={() => fileInputRef.current?.click()} className="flex-shrink-0 w-24 h-24 border-2 border-dashed border-white/30 rounded-lg flex flex-col items-center justify-center text-white/50 self-center">
                    <Plus size={24} />
                    <span className="text-xs">{uploadingImg ? '...' : '新增'}</span>
                 </button>
             )}
             <input type="file" ref={fileInputRef} onChange={handleAddImage} className="hidden" accept="image/*" />
          </div>
        </div>

        {/* Info & Actions */}
        <div className="bg-white text-[#3A3A3A] rounded-t-3xl -mt-6 p-6 min-h-[40vh] shadow-[0_-4px_20px_rgba(0,0,0,0.2)] z-10">
          
          {isEditing ? (
             <div className="space-y-4 mb-6">
               <div className="flex justify-between items-center mb-2">
                 <h3 className="font-bold text-[#D9B26D]">編輯回憶</h3>
                 <div className="flex gap-2">
                    <button onClick={() => setIsEditing(false)} className="p-2 bg-[#F7F3ED] rounded-full"><X size={16}/></button>
                    <button onClick={handleSaveEdit} className="p-2 bg-[#D9B26D] text-white rounded-full"><Check size={16}/></button>
                 </div>
               </div>
               <input 
                 className="w-full border-b border-[#EAEAEA] py-2 text-xl font-bold outline-none" 
                 value={editTitle} 
                 onChange={e => setEditTitle(e.target.value)} 
                 placeholder="標題"
               />
               <div className="flex gap-2">
                 <input 
                    type="date"
                    className="flex-1 border-b border-[#EAEAEA] py-2 text-sm outline-none" 
                    value={editDate} 
                    onChange={e => setEditDate(e.target.value)} 
                 />
                 <input 
                    type="time"
                    className="flex-1 border-b border-[#EAEAEA] py-2 text-sm outline-none" 
                    value={editTime} 
                    onChange={e => setEditTime(e.target.value)} 
                 />
               </div>
               <input 
                   className="w-full border-b border-[#EAEAEA] py-2 text-sm outline-none" 
                   value={editLocation} 
                   onChange={e => setEditLocation(e.target.value)} 
                   placeholder="地點"
               />
               <div className="flex items-center gap-2 border-b border-[#EAEAEA] py-2">
                  <Smile size={16} className="text-[#C1C1C1]" />
                  <select className="w-full outline-none text-sm bg-transparent" value={editMood} onChange={(e:any) => setEditMood(e.target.value)}>
                    <option value="happy">開心 😊</option>
                    <option value="romantic">浪漫 🥰</option>
                    <option value="adventure">冒險 🧗</option>
                    <option value="chill">放鬆 ☕️</option>
                  </select>
               </div>
               <textarea 
                  className="w-full border border-[#EAEAEA] rounded-xl p-3 text-sm h-32 outline-none resize-none"
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  placeholder="內容描述..."
               />
             </div>
          ) : (
            <>
              <div className="flex justify-between items-start mb-2">
                <div>
                   <h1 className="text-2xl font-serif font-bold mb-1 text-[#3A3A3A]">{memory.title}</h1>
                   <div className="flex items-center text-[#8A8A8A] text-xs space-x-2 tracking-wide uppercase mt-1">
                     <Clock size={12} />
                     <span>{memory.time || '--:--'}</span>
                     <span>|</span>
                     <Calendar size={12} />
                     <span>{memory.date}</span>
                     
                     {memory.location && (
                       <>
                         <span>|</span>
                         <span className="flex items-center"><MapPin size={12} className="mr-1" /> {memory.location}</span>
                       </>
                     )}
                   </div>
                </div>
                {memory.mood && <span className="text-2xl">
                  {memory.mood === 'happy' ? '😊' : memory.mood === 'romantic' ? '🥰' : memory.mood === 'adventure' ? '🧗' : '☕️'}
                </span>}
              </div>

              <p className="text-sm text-[#3A3A3A] leading-relaxed mb-6 border-b border-[#F7F3ED] pb-6 whitespace-pre-line">
                {memory.description || "沒有文字描述"}
              </p>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-6 mb-6">
            <button 
              onClick={handleLike}
              className={`flex items-center space-x-1 transition-colors ${isLiked ? 'text-red-500' : 'text-[#8A8A8A]'}`}
            >
              <Heart size={24} fill={isLiked ? 'currentColor' : 'none'} />
              <span className="text-xs">{memory.likes?.length || 0}</span>
            </button>
            <div className="flex items-center space-x-1 text-[#8A8A8A]">
              <MessageCircle size={24} />
              <span className="text-xs">{comments.length}</span>
            </div>
          </div>

          {/* Comments Section */}
          <div className="space-y-5 mb-20">
            {comments.map(comment => {
              const name = comment.senderId === 'partner1' ? coupleData.partner1Name : coupleData.partner2Name;
              const avatar = comment.senderId === 'partner1' ? coupleData.partner1Avatar : coupleData.partner2Avatar;
              
              return (
                <div key={comment.id} className="flex gap-3 text-sm animate-fade-in">
                  <img src={avatar || "https://picsum.photos/50"} className="w-8 h-8 rounded-full object-cover border border-white shadow-sm" alt={name} />
                  <div className="flex-1 bg-[#F7F3ED] px-4 py-3 rounded-2xl rounded-tl-none">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-bold text-xs text-[#D9B26D]">{name}</span>
                      <span className="text-[10px] text-[#C1C1C1]">{new Date(comment.timestamp).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[#3A3A3A] leading-normal">{comment.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Comment Input */}
      <div className="fixed bottom-0 left-0 right-0 bg-white p-3 border-t border-[#EAEAEA] flex items-center gap-2 max-w-md mx-auto pb-6 z-20">
        <input 
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="寫下回應..."
          className="flex-1 bg-[#F7F3ED] rounded-full px-4 py-3 text-sm text-[#3A3A3A] outline-none placeholder-[#C1C1C1]"
        />
        <button 
          onClick={handleSendComment} 
          disabled={!newComment.trim()} 
          className="p-3 bg-[#D9B26D] text-white rounded-full shadow-md disabled:opacity-50 active:scale-95"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default MemoryDetail;
