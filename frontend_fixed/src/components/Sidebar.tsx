import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home, Upload, Users, BarChart3, ChevronLeft, ChevronRight,
  UserCog, Activity, ShieldAlert
} from 'lucide-react';
import { cn } from '../utils/cn';

const menuItems = [
  { path: '/',              label: 'Dashboard',          icon: Home },
  { path: '/upload',        label: 'Data Upload',         icon: Upload },
  { path: '/people',        label: 'People',              icon: Users },
  { path: '/pm-management', label: 'PM Management',       icon: UserCog },
  { path: '/alignment',     label: 'Alignment',           icon: Activity },
  { path: '/reports',       label: 'Reports & Analytics', icon: BarChart3 },
  { path: '/discrepancy',   label: 'Discrepancy',         icon: ShieldAlert },
];

const routeGroups: Record<string, string[]> = {
  '/people':        ['/people', '/employees', '/bench', '/new-joiners', '/separations'],
  '/pm-management': ['/pm-management', '/pm-report', '/gradewise-report'],
  '/alignment':     ['/alignment', '/monitoring', '/gad-analysis'],
  '/reports':       ['/reports', '/analytics'],
};

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const isActive = (itemPath: string) => {
    if (location.pathname === itemPath) return true;
    const group = routeGroups[itemPath];
    return group ? group.includes(location.pathname) : false;
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 transition-all duration-300 z-40',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className="flex flex-col h-full">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-6 text-white rounded-full p-1 transition-colors shadow-lg"
          style={{ backgroundColor: '#12ABDB' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0070AD')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#12ABDB')}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <nav className="flex-1 py-6 px-2 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative',
                  active ? 'text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
                )}
                style={active ? { background: 'linear-gradient(135deg, #12ABDB 0%, #0070AD 100%)' } : {}}
                title={collapsed ? item.label : ''}
              >
                <Icon size={20} className="flex-shrink-0" />
                {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="p-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">PM Alignment System v1.0</p>
          </div>
        )}
      </div>
    </aside>
  );
}
