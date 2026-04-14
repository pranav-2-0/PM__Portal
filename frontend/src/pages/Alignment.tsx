import TabBar from '../components/TabBar';
import { useSearchParams } from 'react-router-dom';
import MonitoringContent from './Monitoring';
import GADAnalysisContent from './GADAnalysis';

type TabId = 'monitoring' | 'gad-analysis';

const ALIGN_TABS = [
  { id: 'monitoring', label: 'Monitoring & Misalignments' },
  { id: 'gad-analysis', label: 'GAD Analysis' },
];

const VALID_TABS: TabId[] = ['monitoring', 'gad-analysis'];

export default function Alignment() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as TabId | null;
  const activeTab: TabId = tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'monitoring';

  const setActiveTab = (id: TabId) => {
    setSearchParams({ tab: id }, { replace: true });
  };

  const titles: Record<TabId, { title: string; sub: string }> = {
    monitoring: { title: 'Alignment Monitoring', sub: 'Detect and fix PM misalignments across employees' },
    'gad-analysis': { title: 'GAD Analysis', sub: 'Analyse GAD report data and proposed PM changes' },
  };
  const { title } = titles[activeTab];
  return (
    <div className="space-y-0">
      <div className="mb-6"><h1 className="text-3xl font-bold text-gray-800">{title}</h1></div>
      <TabBar tabs={ALIGN_TABS} active={activeTab} onChange={id => setActiveTab(id as TabId)} />
      {activeTab === 'monitoring' && <MonitoringContent />}
      {activeTab === 'gad-analysis' && <GADAnalysisContent />}
    </div>
  );
}
