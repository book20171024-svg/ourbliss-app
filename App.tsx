
import React, { useState, useEffect, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CoupleProvider, useCouple } from './context/CoupleContext';
import Layout from './components/Layout';
import { Lock, Loader2 } from 'lucide-react';

// Lazy Load Pages
const Home = React.lazy(() => import('./pages/Home'));
const Pairing = React.lazy(() => import('./pages/Pairing'));
const Memories = React.lazy(() => import('./pages/Memories'));
const MemoryDetail = React.lazy(() => import('./pages/MemoryDetail'));
const Chat = React.lazy(() => import('./pages/Chat'));
const More = React.lazy(() => import('./pages/More'));
const AIStory = React.lazy(() => import('./pages/AIStory'));
const CalendarPage = React.lazy(() => import('./pages/Calendar'));
const EventAdd = React.lazy(() => import('./pages/EventAdd'));
const EventEdit = React.lazy(() => import('./pages/EventEdit'));
const AnniversaryList = React.lazy(() => import('./pages/AnniversaryList'));
const AIMonthlyStory = React.lazy(() => import('./pages/AIMonthlyStory'));
const AIYearlyStory = React.lazy(() => import('./pages/AIYearlyStory'));
const Goals = React.lazy(() => import('./pages/Goals'));
const GoalDetail = React.lazy(() => import('./pages/GoalDetail'));

// Loading Fallback
const PageLoading = () => (
  <div className="h-full w-full flex items-center justify-center bg-[#F7F3ED] text-[#D9B26D]">
     <Loader2 size={32} className="animate-spin" />
  </div>
);

// Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { coupleId } = useCouple();
  if (!coupleId) {
    return <Navigate to="/pairing" replace />;
  }
  return <Layout>{children}</Layout>;
};

const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/pairing" element={<Pairing />} />
        
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        
        {/* Memories */}
        <Route path="/memories" element={<ProtectedRoute><Memories /></ProtectedRoute>} />
        <Route path="/memories/:id" element={<ProtectedRoute><MemoryDetail /></ProtectedRoute>} />
        
        {/* Calendar */}
        <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
        <Route path="/event-add" element={<ProtectedRoute><EventAdd /></ProtectedRoute>} />
        <Route path="/event-edit/:id" element={<ProtectedRoute><EventEdit /></ProtectedRoute>} />
        
        {/* Goals (New) */}
        <Route path="/goals" element={<ProtectedRoute><Goals /></ProtectedRoute>} />
        <Route path="/goals/:id" element={<ProtectedRoute><GoalDetail /></ProtectedRoute>} />
        
        {/* More & Chat */}
        <Route path="/more" element={<ProtectedRoute><More /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        
        {/* Features */}
        <Route path="/story" element={<ProtectedRoute><AIStory /></ProtectedRoute>} />
        <Route path="/anniversaries" element={<ProtectedRoute><AnniversaryList /></ProtectedRoute>} />
        <Route path="/ai-monthly-story" element={<ProtectedRoute><AIMonthlyStory /></ProtectedRoute>} />
        <Route path="/ai-yearly-story" element={<ProtectedRoute><AIYearlyStory /></ProtectedRoute>} />
      </Routes>
    </Suspense>
  );
};

const LockScreen: React.FC<{ onUnlock: () => void }> = ({ onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const savedPin = localStorage.getItem('ourbliss_app_pin');

  const handleNumClick = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);
      
      if (newPin.length === 4) {
        if (newPin === savedPin) {
          onUnlock();
        } else {
          setError(true);
          setTimeout(() => setPin(''), 500);
        }
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <div className="h-[100dvh] w-full bg-[#F7F3ED] flex flex-col items-center justify-center p-8 relative">
       <div className="mb-8 flex flex-col items-center">
          <div className="w-16 h-16 bg-[#D9B26D] rounded-full flex items-center justify-center text-white mb-4 shadow-lg shadow-[#D9B26D]/30">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-serif font-bold text-[#3A3A3A] mb-2">Welcome Back</h2>
          <p className="text-[#8A8A8A] text-sm">請輸入密碼解鎖</p>
       </div>

       <div className="flex gap-4 mb-12">
          {[0, 1, 2, 3].map(i => (
             <div key={i} className={`w-4 h-4 rounded-full border border-[#D9B26D] transition-all duration-300 ${pin.length > i ? 'bg-[#D9B26D]' : 'bg-transparent'} ${error ? 'animate-shake border-red-400 bg-red-400' : ''}`} />
          ))}
       </div>

       <div className="grid grid-cols-3 gap-x-8 gap-y-6 w-full max-w-[280px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button 
              key={num} 
              onClick={() => handleNumClick(num.toString())}
              className="w-16 h-16 rounded-full bg-white shadow-sm border border-[#EAEAEA] text-xl font-bold text-[#3A3A3A] active:bg-[#F0F0F0] active:scale-95 transition-all"
            >
              {num}
            </button>
          ))}
          <div />
          <button 
             onClick={() => handleNumClick('0')}
             className="w-16 h-16 rounded-full bg-white shadow-sm border border-[#EAEAEA] text-xl font-bold text-[#3A3A3A] active:bg-[#F0F0F0] active:scale-95 transition-all"
          >
            0
          </button>
          <button 
             onClick={handleDelete}
             className="w-16 h-16 rounded-full flex items-center justify-center text-[#3A3A3A] active:scale-95 transition-all"
          >
            ✕
          </button>
       </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isLocked, setIsLocked] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const savedPin = localStorage.getItem('ourbliss_app_pin');
    if (savedPin) {
      setIsLocked(true);
    }
    setChecking(false);
  }, []);

  if (checking) return null;

  return (
    <CoupleProvider>
      {isLocked ? (
        <LockScreen onUnlock={() => setIsLocked(false)} />
      ) : (
        <Router>
          <AppRoutes />
        </Router>
      )}
    </CoupleProvider>
  );
};

export default App;
