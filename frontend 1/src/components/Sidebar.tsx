import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, Upload, Users,
  BarChart3, ChevronLeft, ChevronRight, UserCog, UserX, Database, Briefcase, FileText,
  Settings, Activity, TrendingUp, PieChart, ShieldAlert
} from 'lucide-react';
import { cn } from '../utils/cn';

const menuItems = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/upload', label: 'Data Upload', icon: Upload },
  { path: '/gad-analysis', label: 'GAD Analysis', icon: PieChart },
  { path: '/monitoring', label: 'Monitoring', icon: Activity },
  { path: '/discrepancy', label: 'Discrepancy Report', icon: ShieldAlert },
  { path: '/reports', label: 'Practice Reports', icon: FileText },
  { path: '/gradewise-report', label: 'Gradewise PM Capacity', icon: TrendingUp },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/employees', label: 'All Employees', icon: Database, section: 'Data Management' },
  { path: '/bench', label: 'Bench Resources', icon: Briefcase, section: 'Data Management' },
  { path: '/new-joiners', label: 'New Joiners', icon: Users, section: 'Data Management' },
  { path: '/pm-report', label: 'People Managers', icon: UserCog, section: 'Data Management' },
  { path: '/separations', label: 'Separations', icon: UserX, section: 'Data Management' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={cn(
        'fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 transition-all duration-300 z-40',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className="flex flex-col h-full">
        {/* Toggle Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-6 text-white rounded-full p-1 transition-colors shadow-lg"
          style={{ backgroundColor: '#12ABDB' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0070AD'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#12ABDB'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* Menu Items */}
        <nav className="flex-1 py-6 px-2 space-y-1 overflow-y-auto">
          {/* Main Menu */}
          {menuItems.filter(item => !item.section).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative',
                  isActive
                    ? 'text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
                style={isActive ? { background: 'linear-gradient(135deg, #12ABDB 0%, #0070AD 100%)' } : {}}
                title={collapsed ? item.label : ''}
              >
                <Icon size={20} className="flex-shrink-0" />
                {!collapsed && (
                  <span className="font-medium text-sm">{item.label}</span>
                )}
                
                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}

          {/* Data Management Section */}
          {!collapsed && (
            <div className="pt-4 pb-2">
              <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Data Management
              </p>
            </div>
          )}
          {collapsed && <div className="border-t border-gray-200 my-2" />}
          
          {menuItems.filter(item => item.section === 'Data Management').map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative',
                  isActive
                    ? 'text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
                style={isActive ? { background: 'linear-gradient(135deg, #12ABDB 0%, #0070AD 100%)' } : {}}
                title={collapsed ? item.label : ''}
              >
                <Icon size={20} className="flex-shrink-0" />
                {!collapsed && (
                  <span className="font-medium text-sm">{item.label}</span>
                )}
                
                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="p-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              PM Alignment System v1.0
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
