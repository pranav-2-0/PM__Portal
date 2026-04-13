import { Bell, Star, User, LogOut, Settings, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { SORTED_PRACTICES } from "../constants/practices";
import { isSuperAdmin } from "../utils/rbac";

// Map practice names to department IDs
const PRACTICE_TO_DEPARTMENT_ID: Record<string, number> = {
  'CCA-FS': 1,
  'Cloud & Infrastructure': 2,
  'Data & AI': 3,
  'DCX-DE': 4,
  'DCX-FS': 5,
  'Digital Engineering': 6,
  'Enterprise Architecture': 7,
  'Insights & Data': 8,
  'SAP': 9,
};

export default function Header() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDepartmentMenu, setShowDepartmentMenu] = useState(false);
  const { user, logout, selectedDepartment, setSelectedDepartment } = useAuth();
  const navigate = useNavigate();

  const showSettings = user?.role?.toLowerCase() === 'admin' || user?.role === 'Super Admin';
  const practiceLabel = user?.department_name || user?.practice || '';
  const isSuperAdminUser = isSuperAdmin(user?.role);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSettings = () => {
    setShowUserMenu(false);
    navigate('/settings');
  };

  const handleSelectDepartment = (practice: string) => {
    const deptId = PRACTICE_TO_DEPARTMENT_ID[practice];
    if (deptId) {
      setSelectedDepartment(deptId);
      setShowDepartmentMenu(false);
    }
  };

  // Get selected department name
  const getSelectedDepartmentName = () => {
    if (!selectedDepartment || !isSuperAdminUser) return null;
    
    for (const [practice, id] of Object.entries(PRACTICE_TO_DEPARTMENT_ID)) {
      if (id === selectedDepartment) {
        return practice;
      }
    }
    return SORTED_PRACTICES[0];
  };

  const selectedDeptName = getSelectedDepartmentName();

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

          {/* Super Admin Department Selector */}
          {isSuperAdminUser && (
            <div className="relative">
              <button
                onClick={() => setShowDepartmentMenu(!showDepartmentMenu)}
                className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 rounded-lg text-sm font-medium"
              >
                <span>{selectedDeptName || 'Select Department'}</span>
                <ChevronDown size={16} />
              </button>

              {showDepartmentMenu && (
                <div className="absolute left-0 mt-2 w-56 bg-white rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                  <div className="p-3 border-b border-gray-200">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Select Department</p>
                  </div>
                  {SORTED_PRACTICES.map((practice) => (
                    <button
                      key={practice}
                      onClick={() => handleSelectDepartment(practice)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        selectedDeptName === practice
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {practice}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 p-2 hover:bg-white/10 rounded-lg"
            >
              {/* Practice name on far left */}
              {practiceLabel && (
                <div className="flex flex-col items-start text-left min-w-fit">
                  <span className="text-[11px] text-white/80 leading-tight font-medium">{practiceLabel}</span>
                </div>
              )}
              {/* Avatar icon */}
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <User size={18} />
              </div>
              {/* User name and role */}
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-medium">{user?.name || "User"}</span>
                {user?.role && <span className="text-[11px] text-white/80 leading-tight">{user.role}</span>}
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