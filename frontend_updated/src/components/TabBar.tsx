interface Tab {
  id: string;
  label: string;
}

interface TabBarProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}

export default function TabBar({ tabs, active, onChange }: TabBarProps) {
  return (
    <div className="flex gap-1 border-b border-gray-200 mb-6">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
            active === t.id
              ? 'text-white'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
          style={active === t.id ? { background: 'linear-gradient(135deg, #12ABDB 0%, #0070AD 100%)' } : {}}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
