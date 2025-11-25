
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CoupleProvider, useCouple } from './context/CoupleContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Pairing from './pages/Pairing';
import Memories from './pages/Memories';
import MemoryDetail from './pages/MemoryDetail';
import Chat from './pages/Chat';
import More from './pages/More';
import AIStory from './pages/AIStory';
import CalendarPage from './pages/Calendar';
import EventAdd from './pages/EventAdd';
import EventEdit from './pages/EventEdit'; // New Import
import AnniversaryList from './pages/AnniversaryList';
import AIMonthlyStory from './pages/AIMonthlyStory';
import AIYearlyStory from './pages/AIYearlyStory';
import Goals from './pages/Goals';
import GoalDetail from './pages/GoalDetail';

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
  );
};

const App: React.FC = () => {
  return (
    <CoupleProvider>
      <Router>
        <AppRoutes />
      </Router>
    </CoupleProvider>
  );
};

export default App;
