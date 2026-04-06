import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon, Save, RotateCcw, Play, CheckCircle,
  AlertTriangle, Sliders, Zap, Info
} from 'lucide-react';
import {
  useGetMatchingWeightsQuery,
  useUpdateMatchingWeightsMutation,
  useTriggerNewJoinerWorkflowMutation,
  useTriggerReassignmentWorkflowMutation,
  useTriggerMonthlyEngagementMutation,
} from '../services/pmApi';

const WEIGHT_LABELS: Record<string, { label: string; color: string; description: string }> = {
  cu:        { label: 'CU Alignment',         color: 'bg-indigo-500', description: 'Same Competency Unit — domain knowledge and team context match' },
  region:    { label: 'Region / Location',    color: 'bg-cyan-500',   description: 'Geographic proximity for face-time and timezone alignment' },
  skill:     { label: 'Skill Match',          color: 'bg-green-500',  description: 'PM technical skill cluster alignment with employee skill' },
  grade:     { label: 'Grade Proximity',      color: 'bg-yellow-500', description: 'PM should be exactly 1 grade above employee (ideal: D1 → D2)' },
  account:   { label: 'Account Match',        color: 'bg-teal-500',   description: 'Same client account aids context and relationship continuity' },
  capacity:  { label: 'Capacity Buffer',      color: 'bg-orange-500', description: 'Prefer PMs with more available headroom (lower utilization)' },
};

const DEFAULT_WEIGHTS = { cu: 35, region: 20, skill: 15, grade: 15, account: 10, capacity: 5 };

export default function Settings() {
  const { data: savedWeights, isLoading, refetch } = useGetMatchingWeightsQuery();
  const [updateWeights, { isLoading: isSaving }] = useUpdateMatchingWeightsMutation();
  const [triggerNewJoiner, { isLoading: isRunningNJ }] = useTriggerNewJoinerWorkflowMutation();
  const [triggerReassignment, { isLoading: isRunningRA }] = useTriggerReassignmentWorkflowMutation();
  const [triggerMonthly, { isLoading: isRunningME }] = useTriggerMonthlyEngagementMutation();

  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [workflowMessages, setWorkflowMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    if (savedWeights) setWeights({ ...DEFAULT_WEIGHTS, ...savedWeights });
  }, [savedWeights]);

  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const isValid = total === 100;

  const handleSliderChange = (key: string, value: number) => {
    setWeights(prev => ({ ...prev, [key]: value }));
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    try {
      await updateWeights(weights).unwrap();
      setSaveStatus('saved');
      refetch();
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
    }
  };

  const handleReset = () => {
    setWeights(DEFAULT_WEIGHTS);
    setSaveStatus('idle');
  };

  // Distribute the gap (±) proportionally across all keys except the largest
  const handleAutoBalance = () => {
    const gap = 100 - total;
    if (gap === 0) return;
    const entries = Object.entries(weights) as [keyof typeof weights, number][];
    const largest = entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
    setWeights(prev => ({ ...prev, [largest]: Math.max(0, prev[largest] + gap) }));
    setSaveStatus('idle');
  };

  const runWorkflow = async (name: string, fn: () => Promise<any>) => {
    try {
      setWorkflowMessages(prev => ({ ...prev, [name]: '⏳ Running...' }));
      const result = await fn();
      setWorkflowMessages(prev => ({ ...prev, [name]: `✅ Done — ${JSON.stringify(result?.result || result)}` }));
    } catch (err: any) {
      setWorkflowMessages(prev => ({ ...prev, [name]: `❌ Error: ${err?.data?.error || err.message}` }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <SettingsIcon size={28} className="text-gray-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
          <p className="text-gray-600 mt-0.5">Configure PM matching weights and trigger workflow automation</p>
        </div>
      </div>

      {/* Matching Weights Card */}
      <div className="bg-white rounded-xl shadow-md p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders size={20} className="text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-800">PM Matching Priority Weights</h2>
          </div>
          <div className={`px-4 py-1.5 rounded-full text-sm font-semibold ${
            isValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            Total: {total} / 100 {isValid ? '✓' : `(${total > 100 ? 'over' : 'under'} by ${Math.abs(total - 100)})`}
          </div>
        </div>

        {/* Practice Gate Banner */}
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
          <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-800 mb-0.5">Practice Alignment — 100% Mandatory Gate (not a weight)</p>
            <p className="text-sm text-green-700">
              <strong>Strictly enforced</strong> — employees are matched <em>only</em> to PMs in the exact same practice.
              No cross-practice fallback is allowed. If no same-practice PM has capacity, an exception is raised automatically.
              The weights below rank candidates <em>within</em> that same-practice pool only.
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <Info size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            Adjust the 6 weights below to control how candidates within the same practice are ranked.
            All weights must sum to exactly <strong>100</strong>.
          </p>
        </div>

        {/* Sliders */}
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(WEIGHT_LABELS).map(([key, { label, color, description }]) => (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-gray-700">{label}</span>
                    <p className="text-xs text-gray-500">{description}</p>
                  </div>
                  <span className="text-lg font-bold text-gray-800 w-12 text-right">
                    {weights[key as keyof typeof weights]}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={weights[key as keyof typeof weights]}
                    onChange={e => handleSliderChange(key, parseInt(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                    style={{ accentColor: '#12ABDB' }}
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={weights[key as keyof typeof weights]}
                    onChange={e => handleSliderChange(key, parseInt(e.target.value) || 0)}
                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded text-center"
                  />
                </div>
                {/* Visual bar */}
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`${color} h-1.5 rounded-full transition-all duration-300`}
                    style={{ width: `${weights[key as keyof typeof weights]}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Save / Reset Buttons */}
        <div className="flex items-center gap-4 pt-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #12ABDB 0%, #0070AD 100%)' }}
          >
            <Save size={16} />
            {isSaving ? 'Saving...' : 'Save Weights'}
          </button>
          <button
            onClick={handleAutoBalance}
            disabled={total === 100}
            className="flex items-center gap-2 px-5 py-2.5 border border-indigo-300 rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            title="Adjust the largest weight so all weights sum to exactly 100"
          >
            <Zap size={16} />
            Auto-balance
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-semibold"
          >
            <RotateCcw size={16} />
            Reset to Defaults
          </button>
          {saveStatus === 'saved' && (
            <div className="flex items-center gap-1.5 text-green-600 font-medium text-sm">
              <CheckCircle size={16} />
              Weights saved!
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-1.5 text-red-600 font-medium text-sm">
              <AlertTriangle size={16} />
              Save failed. Try again.
            </div>
          )}
        </div>

        {/* Weight Distribution Visual */}
        <div>
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Weight Distribution</p>
          <div className="flex rounded-full overflow-hidden h-4 w-full">
            {Object.entries(WEIGHT_LABELS).map(([key, { color }]) => {
              const w = weights[key as keyof typeof weights];
              return w > 0 ? (
                <div
                  key={key}
                  className={`${color} h-full transition-all duration-300`}
                  style={{ width: `${w}%` }}
                  title={`${WEIGHT_LABELS[key].label}: ${w}%`}
                />
              ) : null;
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {Object.entries(WEIGHT_LABELS).map(([key, { label, color }]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs text-gray-600">
                <div className={`w-3 h-3 rounded-full ${color}`} />
                {label}: {weights[key as keyof typeof weights]}%
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Business Rules Reference */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Info size={20} className="text-indigo-500" />
          Business Rules Reference
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <p className="font-semibold text-gray-800">PM Eligibility Criteria</p>
            <ul className="space-y-1 list-disc pl-4">
              <li>Grade C1 and above only</li>
              <li>Minimum <strong>6 months</strong> of service</li>
              <li>Must be an active employee <span className="text-gray-500 text-xs">(allocated or unallocated)</span></li>
              <li>PM must be at least 1 grade above reportee</li>
            </ul>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <p className="font-semibold text-gray-800">Capacity Limits</p>
            <ul className="space-y-1 list-disc pl-4">
              <li>Grade C1/C2: max 10 reportees</li>
              <li>Grade D1/D2: max 15 reportees <span className="text-gray-500 text-xs">(D3 does not exist)</span></li>
              <li>System auto-detects capacity breaches</li>
              <li>Overloaded PMs trigger <strong>re-alignment notification</strong></li>
            </ul>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <p className="font-semibold text-gray-800">Matching Logic</p>
            <ul className="space-y-1 list-disc pl-4">
              <li><strong>Step 1 — Practice Gate (100%):</strong> Only same-practice PMs are considered. No fallback.</li>
              <li><strong>Step 2 — Weighted Ranking:</strong> Apply configured weights (CU, Region, Skill, Grade, Account, Capacity)</li>
              <li><strong>Sub-Practice bonus:</strong> +20 fixed pts if sub-practice also matches</li>
              <li>No same-practice PM available → Exception raised</li>
            </ul>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <p className="font-semibold text-gray-800">Reassignment Triggers</p>
            <ul className="space-y-1 list-disc pl-4">
              <li>PM separation (LWD T-60/T-30/T-7)</li>
              <li>Practice/CU/Region drift detected</li>
              <li>PM capacity breach</li>
              <li>Manual override with justification</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Workflow Automation Triggers */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={20} className="text-yellow-500" />
          <h2 className="text-xl font-semibold text-gray-800">Manual Workflow Triggers</h2>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          These workflows run automatically on schedule. Use these buttons to trigger them manually for
          testing or on-demand processing.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* New Joiner Workflow */}
          <div className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Play size={16} className="text-blue-600" />
              </div>
              <p className="font-semibold text-gray-800">New Joiner Workflow</p>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Fetches all unassigned new joiners, runs PM matching, creates pending assignments and sends notifications.
            </p>
            <button
              onClick={() => runWorkflow('newJoiner', () => triggerNewJoiner().unwrap())}
              disabled={isRunningNJ}
              className="w-full px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #12ABDB 0%, #0070AD 100%)' }}
            >
              {isRunningNJ ? 'Running...' : 'Run Now'}
            </button>
            {workflowMessages['newJoiner'] && (
              <p className="text-xs mt-2 text-gray-600 break-words">{workflowMessages['newJoiner']}</p>
            )}
          </div>

          {/* Reassignment Workflow */}
          <div className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                <Play size={16} className="text-orange-600" />
              </div>
              <p className="font-semibold text-gray-800">Reassignment Workflow</p>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Checks LWD alerts (T-60/T-30/T-7), capacity breaches, and practice/CU/region misalignments.
            </p>
            <button
              onClick={() => runWorkflow('reassignment', () => triggerReassignment().unwrap())}
              disabled={isRunningRA}
              className="w-full px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-all disabled:opacity-50"
            >
              {isRunningRA ? 'Running...' : 'Run Now'}
            </button>
            {workflowMessages['reassignment'] && (
              <p className="text-xs mt-2 text-gray-600 break-words">{workflowMessages['reassignment']}</p>
            )}
          </div>

          {/* Monthly Engagement */}
          <div className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <Play size={16} className="text-purple-600" />
              </div>
              <p className="font-semibold text-gray-800">Monthly Engagement</p>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Sends monthly team snapshot emails to all active PMs with their current reportee list.
            </p>
            <button
              onClick={() => runWorkflow('monthly', () => triggerMonthly().unwrap())}
              disabled={isRunningME}
              className="w-full px-4 py-2 text-sm font-semibold text-white bg-purple-500 hover:bg-purple-600 rounded-lg transition-all disabled:opacity-50"
            >
              {isRunningME ? 'Running...' : 'Run Now'}
            </button>
            {workflowMessages['monthly'] && (
              <p className="text-xs mt-2 text-gray-600 break-words">{workflowMessages['monthly']}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
