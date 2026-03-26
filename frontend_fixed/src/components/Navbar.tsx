import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Upload, UserPlus, ClipboardList } from 'lucide-react';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Data Upload', path: '/upload', icon: Upload },
    { label: 'New Joiners', path: '/new-joiners', icon: UserPlus },
    { label: 'Assignments', path: '/assignments', icon: ClipboardList },
  ];

  return (
    <nav className="bg-[#0070AD] text-white sticky top-0 z-50 shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <h1 className="text-xl font-bold tracking-wider">PM Alignment System</h1>
          <div className="flex gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
                    isActive 
                      ? 'bg-white/15' 
                      : 'hover:bg-white/25'
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};
