import Analytics from './Analytics';

export default function Reports() {
  return (
    <div className="space-y-0">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Reports & Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Comprehensive insights, trends, and distributions</p>
      </div>
      <Analytics />
    </div>
  );
}
