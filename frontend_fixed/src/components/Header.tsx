import { Bell, Star, User, LogOut, Settings } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Header() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const showSettings = user?.role?.toLowerCase() === 'admin';
  const practiceLabel = user?.department_name || user?.practice || '';

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSettings = () => {
    setShowUserMenu(false);
    navigate('/settings');
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 h-16 text-white shadow-lg z-50"
      style={{ background: "linear-gradient(135deg, #12ABDB 0%, #0070AD 100%)" }}
    >
      <div className="flex items-center justify-between h-full px-6">

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
            <span className="text-capgemini-blue font-bold text-xl">PM</span>
          </div>
          <div>
            <h1 className="text-xl font-bold">People Manager Alignment</h1>
            <p className="text-xs text-white/80">Capgemini</p>
          </div>
        </div>

        <div className="flex items-center gap-4">

          <button className="relative p-2 hover:bg-white/10 rounded-lg">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          <button className="p-2 hover:bg-white/10 rounded-lg">
            <Star size={20} />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-2 hover:bg-white/10 rounded-lg"
            >
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <User size={18} />
              </div>
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-medium">{user?.name || "User"}</span>
                {practiceLabel && <span className="text-[11px] text-white/80 leading-tight">{practiceLabel}</span>}
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl">
                {showSettings && (
                  <button
                    onClick={handleSettings}
                    className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50"
                  >
                    <Settings size={16} />
                    <span>Settings</span>
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}