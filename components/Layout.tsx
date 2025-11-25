
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Heart, Calendar, MoreHorizontal, CheckSquare } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: '首頁', icon: Home, path: '/' },
    { label: '日曆', icon: Calendar, path: '/calendar' },
    { label: '回憶', icon: Heart, path: '/memories', isCenter: true },
    { label: '目標', icon: CheckSquare, path: '/goals' },
    { label: '更多', icon: MoreHorizontal, path: '/more' },
  ];

  return (
    <div className="min-h-screen bg-[#F7F3ED] flex flex-col max-w-md mx-auto relative shadow-2xl overflow-hidden font-sans text-[#3A3A3A]">
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-24 hide-scrollbar">
        {children}
      </main>

      {/* Persistent Bottom Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#EAEAEA] py-2 px-4 pb-6 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.02)] z-50">
        <ul className="flex justify-between items-end">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            if (item.isCenter) {
              return (
                <li key={item.path} className="relative -top-5">
                  <button
                    onClick={() => navigate(item.path)}
                    className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                      isActive ? 'bg-[#D9B26D] text-white' : 'bg-white text-[#D9B26D] border border-[#F7F3ED]'
                    }`}
                  >
                    <Icon size={28} fill={isActive ? "currentColor" : "none"} strokeWidth={2} />
                  </button>
                </li>
              );
            }

            return (
              <li key={item.path}>
                <button
                  onClick={() => navigate(item.path)}
                  className={`flex flex-col items-center space-y-1 transition-all duration-300 w-14 ${
                    isActive ? 'text-[#D9B26D]' : 'text-[#C1C1C1] hover:text-[#D9B26D]/70'
                  }`}
                >
                  <Icon 
                    size={24} 
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};

export default Layout;
