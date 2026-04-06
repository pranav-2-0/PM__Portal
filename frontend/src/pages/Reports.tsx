import TabBar from '../components/TabBar';
import { useState } from 'react';
import AnalyticsContent from './Analytics';
import PracticeReportsContent from './PracticeReports';

type TabId = 'analytics' | 'practice-reports';

const REPORT_TABS = [
  { id: 'analytics', label: 'Analytics' },
  { id: 'practice-reports', label: 'Practice Reports' },
];


export default function Reports() {
  const [activeTab, setActiveTab] = useState<TabId>('analytics');
  const titles: Record<TabId, { title: string; sub: string }> = {
    analytics: { title: 'Analytics', sub: 'Comprehensive insights, trends, and distributions' },
    'practice-reports': { title: 'Practice Reports', sub: 'Generate practice-wise reports with business rules applied' },
  };
  const { title } = titles[activeTab];
  return (
    <div className="space-y-0">
      <div className="mb-6"><h1 className="text-3xl font-bold text-gray-800">{title}</h1></div>
      <TabBar tabs={REPORT_TABS} active={activeTab} onChange={id => setActiveTab(id as TabId)} />
      {activeTab === 'analytics' && <AnalyticsContent />}
      {activeTab === 'practice-reports' && <PracticeReportsContent />}
    </div>
  );
}
