import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useGetUploadStatsQuery, useLazyPreviewAutoGeneratePMsQuery, useConfirmAutoGeneratePMsMutation, useLazyPreviewAutoAssignQuery, useConfirmAutoAssignMutation,
  useUploadEmployeesMutation, useUploadPMsMutation, useUploadNewJoinersMutation, useUploadSeparationsMutation, useUploadSkillReportMutation, useUploadGADMutation, useUploadBenchReportMutation } from '../services/pmApi';
import { SORTED_PRACTICES, DEPARTMENT_ID_TO_PRACTICE } from '../constants/practices';
import { CloudUpload, Loader2, X, Users, UserCog, UserX, ExternalLink, BarChart3, FileSpreadsheet, Clock, BookOpen, Sparkles, Eye, CheckCircle2, ArrowRight, ChevronRight, AlertTriangle } from 'lucide-react';

export const DataUpload: React.FC = () => {
  const { user, selectedDepartment } = useAuth();
  const isSuperAdmin = user?.role === 'Super Admin';
  const uploadStatsParams = isSuperAdmin && selectedDepartment ? { department_id: selectedDepartment } : undefined;
  const selectedDepartmentPractice = isSuperAdmin && selectedDepartment ? (DEPARTMENT_ID_TO_PRACTICE[selectedDepartment] || '') : '';
  const { data: uploadStats, refetch: refetchStats } = useGetUploadStatsQuery(uploadStatsParams);
  const [uploadEmployees] = useUploadEmployeesMutation();
  const [uploadPMs] = useUploadPMsMutation();
  const [uploadNewJoiners] = useUploadNewJoinersMutation();
  const [uploadSeparations] = useUploadSeparationsMutation();
  const [uploadSkillReport] = useUploadSkillReportMutation();
  const [uploadGAD] = useUploadGADMutation();
  const [uploadBenchReport] = useUploadBenchReportMutation();
  const departmentPractice = isSuperAdmin ? selectedDepartmentPractice : (user?.department_name || user?.department || '').trim();

  // Block unauthorized roles explicitly in component
  if (user?.role === 'Employee' || user?.role === 'Staff') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-12">
        <div className="bg-white p-8 rounded-xl shadow-md text-center max-w-lg">
          <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
          <p className="text-gray-600">Data upload is only available for Admin and Super Admin users.</p>
        </div>
      </div>
    );
  }

  // Tracks which upload type is in-flight (replaces per-mutation isLoading flags)
  const [uploadingType, setUploadingType] = React.useState<string | null>(null);
  const [triggerPreview, { data: previewData, isLoading: previewLoading, isFetching: previewFetching }] = useLazyPreviewAutoGeneratePMsQuery();
  const [confirmGenerate, { isLoading: generateLoading }] = useConfirmAutoGeneratePMsMutation();
  const [triggerAssignPreview, { data: assignPreviewData, isLoading: assignPreviewLoading, isFetching: assignPreviewFetching }] = useLazyPreviewAutoAssignQuery();
  const [confirmAssign, { isLoading: assignLoading }] = useConfirmAutoAssignMutation();
  const [message, setMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [discrepancySummary, setDiscrepancySummary] = React.useState<any | null>(null);
  const [datasetScopeWarning, setDatasetScopeWarning] = React.useState<any | null>(null);

  // Practice selections for scoped uploads — list comes from the PRACTICES constant
  // (available even on empty DB so practice-scoped initial loads are possible)
  const practiceList = SORTED_PRACTICES;
  const [practiceSelections, setPracticeSelections] = React.useState<Record<string, string>>({
    gad: departmentPractice,
  });
  
  // State for file selection
  const [selectedFiles, setSelectedFiles] = React.useState<{
    employees?: File;
    pms?: File;
    newJoiners?: File;
    separations?: File;
    skills?: File;
    gad?: File;
    bench?: File;
  }>({});

  React.useEffect(() => {
    if (departmentPractice) {
      setPracticeSelections(prev => ({
        ...prev,
        gad: departmentPractice,
      }));
    }
  }, [departmentPractice]);

  const handleFileSelect = (file: File, type: 'employees' | 'pms' | 'newJoiners' | 'separations' | 'skills' | 'gad' | 'bench') => {
    // Check file size (100MB = 104857600 bytes)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      setMessage({ 
        type: 'error', 
        text: `File too large! Maximum size is 100MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB` 
      });
      return;
    }
    
    setSelectedFiles(prev => ({ ...prev, [type]: file }));
    setMessage(null); // Clear previous messages
  };

  const handleUpload = async (type: 'employees' | 'pms' | 'newJoiners' | 'separations' | 'skills' | 'gad' | 'bench') => {
    const file = selectedFiles[type];
    if (!file) return;

    const mutationMap = {
      employees: uploadEmployees,
      pms: uploadPMs,
      newJoiners: uploadNewJoiners,
      separations: uploadSeparations,
      skills: uploadSkillReport,
      gad: uploadGAD,
      bench: uploadBenchReport,
    } as const;

    const uploadMutation = mutationMap[type];
    if (!uploadMutation) {
      setMessage({ type: 'error', text: 'Upload type not supported.' });
      return;
    }

    console.log('Uploading:', file.name, 'type:', type, 'size:', file.size);

    setUploadingType(type);
    const formData = new FormData();
    formData.append('file', file);
    const practice = (type === 'gad')
      ? (departmentPractice || (practiceSelections as Record<string, string>)[type] || '')
      : (practiceSelections as Record<string, string>)[type] || '';
    if (practice) formData.append('practice', practice);

    try {
      const result = await uploadMutation(formData).unwrap() as any;
      console.log('Upload successful:', result);
      const count = result.count ?? result.employees ?? result.inserted ?? '';
      
      // ✅ Simplified message - just show the message as is
      setMessage({ type: 'success', text: result.message });
      
      setSelectedFiles(prev => ({ ...prev, [type]: undefined }));
      if (result.discrepancy_summary) setDiscrepancySummary(result.discrepancy_summary);
      if (result.dataset_scope && !result.dataset_scope.is_scoped) {
        setDatasetScopeWarning(result.dataset_scope);
      }
      refetchStats();
    } catch (error: any) {
      console.error('Upload failed:', error);
      const errorMessage = error?.data?.error || error?.data?.message || error?.message || 'Upload failed. Please try again.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setUploadingType(null);
    }
  };

  const handleAutoGenerate = async () => {
    try {
      const result = await confirmGenerate().unwrap();
      setMessage({ type: 'success', text: result.message });
      refetchStats();
    } catch (error: any) {
      const errorMessage = error.data?.error || error.message || 'Auto-generation failed.';
      setMessage({ type: 'error', text: errorMessage });
    }
  };

  const handleAutoAssign = async () => {
    try {
      const result = await confirmAssign().unwrap();
      setMessage({ type: 'success', text: result.message });
      refetchStats();
    } catch (error: any) {
      const errorMessage = error.data?.error || error.message || 'Auto-assign failed.';
      setMessage({ type: 'error', text: errorMessage });
    }
  };

  const UploadCard = ({ title, type, loading, description, badge, requiresPractice = false, lockedPractice = '', practiceList: cardPracticeList = [], selectedPractice = '', onPracticeChange = (_: string) => {} }: any) => {
    const selectedFile = (selectedFiles as Record<string, File | undefined>)[type];
    // canProceed: true when no practice required, OR a practice is selected/locked
    const canProceed = !requiresPractice || !!selectedPractice || !!lockedPractice;
    const handlePracticeSelect = (val: string) => {
      onPracticeChange(val);
      // Clear any selected file when practice changes to avoid uploading wrong data
      setSelectedFiles(prev => ({ ...prev, [type]: undefined }));
    };
    
    return (
      <div className="bg-white rounded-lg shadow-md p-8 hover:shadow-lg transition-shadow">
        <CloudUpload className="w-16 h-16 mx-auto mb-4 text-[#0070AD]" />
        <h3 className="text-xl font-semibold mb-1">{title}</h3>
        {badge && (
          <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 mb-2">{badge}</span>
        )}
        <p className="text-sm text-gray-600 mb-4">{description}</p>

        {/* ── Practice selector (mandatory when requiresPractice=true) ── */}
        {requiresPractice && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Practice <span className="text-red-500">*</span>
            </label>
            {lockedPractice ? (
              <select
                value={lockedPractice}
                disabled
                className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-100 text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 cursor-not-allowed"
              >
                <option value={lockedPractice}>{lockedPractice}</option>
              </select>
            ) : (
              <select
                value={selectedPractice}
                onChange={e => handlePracticeSelect(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 transition-colors ${
                  selectedPractice
                    ? 'border-green-400 text-gray-800 focus:ring-green-300'
                    : 'border-amber-400 text-gray-500 focus:ring-amber-300'
                }`}
              >
                <option value="">— Select Practice —</option>
                {cardPracticeList.map((p: string) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            )}
            {lockedPractice ? (
              <p className="text-xs text-blue-600 mt-1">
                Practice locked to your department.
              </p>
            ) : !selectedPractice ? (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 flex-shrink-0" /> Select a practice to enable upload
              </p>
            ) : (
              <p className="text-xs text-green-600 mt-1">
                ✓ Only <strong>{selectedPractice}</strong> rows will be imported
              </p>
            )}
          </div>
        )}

        {/* File name display */}
        {selectedFile && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileSpreadsheet className="w-4 h-4 text-[#0070AD] flex-shrink-0" />
                <span className="text-sm text-gray-700 truncate" title={selectedFile.name}>
                  {selectedFile.name}
                </span>
              </div>
              <button
                onClick={() => setSelectedFiles(prev => ({ ...prev, [type]: undefined }))}
                className="p-1 hover:bg-blue-100 rounded"
                disabled={loading}
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {selectedFile.size > 1024 * 1024 
                ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                : `${(selectedFile.size / 1024).toFixed(2)} KB`
              }
            </p>
          </div>
        )}
        
        {/* File select button */}
        <div className="flex flex-col gap-3">
          <label className={`inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 rounded-lg transition-all border-2 shadow-sm font-medium ${
            canProceed
              ? 'hover:bg-gray-50 cursor-pointer border-gray-300 hover:border-gray-400 hover:shadow'
              : 'cursor-not-allowed border-gray-200 opacity-40'
          }`}>
            <FileSpreadsheet className="w-5 h-5 text-gray-600" />
            {selectedFile ? 'Change File' : 'Choose File'}
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.xls,.csv"
              disabled={loading || !canProceed}
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], type)}
            />
          </label>
          
          {/* Upload button - only shown when file is selected */}
          {selectedFile && (
            <button
              onClick={() => handleUpload(type)}
              disabled={loading || !canProceed}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0070AD] text-white rounded-lg hover:bg-[#005a8a] cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg font-semibold text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <CloudUpload className="w-5 h-5" />
                  Upload File
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  const StatCard = ({ icon: Icon, label, value, subtext, link }: any) => (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg" style={{ backgroundColor: '#12ABDB20' }}>
            <Icon className="w-6 h-6 text-[#0070AD]" />
          </div>
          <div>
            <p className="text-sm text-gray-600">{label}</p>
            <p className="text-3xl font-bold text-gray-800">{value || 0}</p>
            {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
          </div>
        </div>
      </div>
      {link && (
        <a href={link} className="text-xs text-[#0070AD] hover:underline flex items-center gap-1 mt-2">
          View Details <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">PM Allocation Setup</h1>
        <p className="text-gray-600">Follow the 3-step workflow below to build your PM allocation report from scratch</p>
      </div>

      {/* ── 3-Step Workflow Banner ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-8">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Workflow — No PM file? Follow these steps</p>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Step 1 */}
          <div className={`flex-1 rounded-lg p-4 border-2 ${ (uploadStats?.totalEmployees ?? 0) > 0 ? 'border-green-500 bg-green-50' : 'border-blue-400 bg-blue-50' }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${ (uploadStats?.totalEmployees ?? 0) > 0 ? 'bg-green-500 text-white' : 'bg-blue-500 text-white' }`}>
                {(uploadStats?.totalEmployees ?? 0) > 0 ? '✓' : '1'}
              </span>
              <span className="font-semibold text-gray-800 text-sm">Upload GAD Report</span>
            </div>
            <p className="text-xs text-gray-500 pl-8">
              {(uploadStats?.totalEmployees ?? 0) > 0
                ? <span className="text-green-700 font-medium">{uploadStats?.totalEmployees?.toLocaleString()} employees loaded ✓</span>
                : 'Upload your GAD (.xlsx) — auto-promotes eligible PMs'}
            </p>
          </div>

          <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0 hidden sm:block" />

          {/* Step 2 */}
          <div className={`flex-1 rounded-lg p-4 border-2 ${ (uploadStats?.activePMs ?? 0) > 0 ? 'border-green-500 bg-green-50' : 'border-purple-400 bg-purple-50' }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${ (uploadStats?.activePMs ?? 0) > 0 ? 'bg-green-500 text-white' : 'bg-purple-500 text-white' }`}>
                {(uploadStats?.activePMs ?? 0) > 0 ? '✓' : '2'}
              </span>
              <span className="font-semibold text-gray-800 text-sm">Generate PM List</span>
            </div>
            <p className="text-xs text-gray-500 pl-8">
              {(uploadStats?.activePMs ?? 0) > 0
                ? <span className="text-green-700 font-medium">{uploadStats?.activePMs} PMs created ✓</span>
                : 'Auto-promote Grade ≥ C1 + tenure ≥ 2y as PMs'}
            </p>
          </div>

          <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0 hidden sm:block" />

          {/* Step 3 */}
          <div className="flex-1 rounded-lg p-4 border-2 border-teal-400 bg-teal-50">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-teal-500 text-white">3</span>
              <span className="font-semibold text-gray-800 text-sm">Auto-Assign Employees</span>
            </div>
            <p className="text-xs text-gray-500 pl-8">Run matching engine — assign every employee to best PM</p>
          </div>

          <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0 hidden sm:block" />

          {/* Result */}
          <a href="/pm-report" className="flex-1 rounded-lg p-4 border-2 border-dashed border-gray-300 bg-gray-50 hover:border-[#0070AD] hover:bg-blue-50 transition-colors group">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-gray-300 group-hover:bg-[#0070AD] group-hover:text-white text-gray-600">→</span>
              <span className="font-semibold text-gray-700 text-sm group-hover:text-[#0070AD]">View Allocation Report</span>
            </div>
            <p className="text-xs text-gray-400 pl-8">PM Report page — full allocation view</p>
          </a>
        </div>
      </div>

      {/* Upload Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard 
          icon={Users} 
          label="Total Active Employees" 
          value={uploadStats?.totalEmployees} 
          subtext={`${uploadStats?.newJoiners || 0} new joiners needing PM`}
          link="/new-joiners"
        />
        <StatCard 
          icon={UserCog} 
          label="Active People Managers" 
          value={uploadStats?.activePMs} 
          subtext="Uploaded via PM Feed"
          link="/pm-report"
        />
        <StatCard 
          icon={UserX} 
          label="Pending Separations" 
          value={uploadStats?.pendingSeparations} 
          subtext={`${uploadStats?.pendingAssignments || 0} pending assignments`}
          link="/separations"
        />
        <StatCard 
          icon={BookOpen} 
          label="Skill Repository" 
          value={uploadStats?.skillCount} 
          subtext="Skills for matching engine"
        />
      </div>

      {/* Quick Links */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-6 mb-8 border border-blue-100">
        <div className="flex items-start gap-3 mb-4">
          <BarChart3 className="w-5 h-5 text-[#0070AD] mt-0.5" />
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Where to View Uploaded Data</h3>
            <p className="text-sm text-gray-600 mb-3">After uploading, view your data in these pages:</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <a href="/new-joiners" className="flex items-center gap-2 text-sm text-[#0070AD] hover:text-[#005a8a] font-medium">
            <ExternalLink className="w-4 h-4" />
            New Joiners → Employees needing PM assignment
          </a>
          <a href="/pm-report" className="flex items-center gap-2 text-sm text-[#0070AD] hover:text-[#005a8a] font-medium">
            <ExternalLink className="w-4 h-4" />
            People Managers → View uploaded PM data
          </a>
          <a href="/separations" className="flex items-center gap-2 text-sm text-[#0070AD] hover:text-[#005a8a] font-medium">
            <ExternalLink className="w-4 h-4" />
            Separations → PMs leaving with LWD
          </a>
          <a href="/assignments" className="flex items-center gap-2 text-sm text-[#0070AD] hover:text-[#005a8a] font-medium">
            <ExternalLink className="w-4 h-4" />
            Assignments → Pending PM assignments
          </a>
          <a href="/dashboard" className="flex items-center gap-2 text-sm text-[#0070AD] hover:text-[#005a8a] font-medium">
            <ExternalLink className="w-4 h-4" />
            Dashboard → Overall statistics & charts
          </a>
          <a href="/exceptions" className="flex items-center gap-2 text-sm text-[#0070AD] hover:text-[#005a8a] font-medium">
            <ExternalLink className="w-4 h-4" />
            Exceptions → Issues requiring attention
          </a>
        </div>
      </div>
      
      {message && (
        <div className={`flex items-center justify-between p-4 rounded-md mb-4 ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="p-1 hover:bg-black/5 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Step 0: Dataset scope warning banner */}
      {datasetScopeWarning && (
        <div className="flex items-start justify-between gap-4 p-4 mb-4 bg-red-50 border border-red-300 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-red-500 font-bold text-xs mt-1">CRITICAL</span>
            <div>
              <p className="text-sm font-semibold text-red-800">Dataset is not practice-scoped (Step 0 flag)</p>
              <p className="text-xs text-red-600 mt-1">
                {datasetScopeWarning.practices_found?.length} distinct practices found in this file: <strong>{(datasetScopeWarning.practices_found || []).join(', ')}</strong>.
                For best results, upload one practice at a time using the Practice filter.
                Rows where PM practice does not match employee practice are marked Unmappable during auto-assignment.
              </p>
            </div>
          </div>
          <button onClick={() => setDatasetScopeWarning(null)} className="p-1 hover:bg-red-100 rounded text-red-400 flex-shrink-0">&#x2715;</button>
        </div>
      )}

      {/* Discrepancy Report Banner */}
      {discrepancySummary && (
        <div className="flex items-start justify-between gap-4 p-4 mb-6 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-orange-800 text-sm">
                {discrepancySummary.total_issues > 0
                  ? `⚠ ${discrepancySummary.total_issues} mapping issue${discrepancySummary.total_issues !== 1 ? 's' : ''} detected`
                  : '✓ No mapping issues detected'}
              </p>
              {/* Priority-ordered issue breakdown */}
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                {discrepancySummary.wrong_practice       > 0 && <span className="text-xs text-red-700 font-semibold">🔴 Wrong Practice: {discrepancySummary.wrong_practice}</span>}
                {discrepancySummary.wrong_sub_practice   > 0 && <span className="text-xs text-orange-700">🟠 Wrong Sub-Practice: {discrepancySummary.wrong_sub_practice}</span>}
                {discrepancySummary.wrong_cu              > 0 && <span className="text-xs text-amber-700">🟡 Wrong CU: {discrepancySummary.wrong_cu}</span>}
                {discrepancySummary.wrong_region          > 0 && <span className="text-xs text-amber-700">🟡 Wrong Region: {discrepancySummary.wrong_region}</span>}
                {discrepancySummary.wrong_grade           > 0 && <span className="text-xs text-rose-700">🔴 Wrong Grade: {discrepancySummary.wrong_grade} (same: {discrepancySummary.same_grade_violation ?? 0})</span>}
                {discrepancySummary.pm_separated         > 0 && <span className="text-xs text-orange-700">PM Separated: {discrepancySummary.pm_separated}</span>}
                {discrepancySummary.pm_on_leave          > 0 && <span className="text-xs text-orange-700">PM On Leave: {discrepancySummary.pm_on_leave}</span>}
                {discrepancySummary.pm_not_active        > 0 && <span className="text-xs text-orange-700">PM Inactive: {discrepancySummary.pm_not_active}</span>}
                {discrepancySummary.pm_overloaded        > 0 && <span className="text-xs text-gray-600">PM Overloaded: {discrepancySummary.pm_overloaded}</span>}
                {discrepancySummary.no_pm_assigned       > 0 && <span className="text-xs text-gray-500">ℹ Not yet assigned: {discrepancySummary.no_pm_assigned}</span>}
                {discrepancySummary.total_issues === 0 && (discrepancySummary.no_pm_assigned ?? 0) === 0 && <span className="text-xs text-green-700">All assignments healthy ✓</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setDiscrepancySummary(null)} className="p-1 hover:bg-orange-100 rounded">
              <X className="w-4 h-4 text-orange-500" />
            </button>
          </div>
        </div>
      )}

      {/* ── Upload Cards — 4-card layout ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <UploadCard 
          title="GAD Report" 
          description="Master source — auto-identifies employees and promotes eligible PMs (Grade ≥ C1, tenure ≥ 1 yr)"
          type="gad" 
          loading={uploadingType === 'gad'}
          badge="Step 1 — Upload First"
          requiresPractice={true}
          lockedPractice={departmentPractice}
          practiceList={practiceList}
          selectedPractice={practiceSelections.gad}
          onPracticeChange={(v: string) => setPracticeSelections(prev => ({ ...prev, gad: v }))}
        />
        <UploadCard 
          title="Leave Report"
          description="Leave data — captures Leave Type, Leave Dates, Bench Status for active resources"
          type="bench"
          loading={uploadingType === 'bench'}
        />
        <UploadCard 
          title="Skill Report" 
          description="Practice-wise skill data — fills skill placeholder in GAD records for matching scores"
          type="skills" 
          loading={uploadingType === 'skills'} 
        />
        <UploadCard 
          title="Separation Report" 
          description="Resignation/Retirement records — only these trigger PM reassignment workflow"
          type="separations" 
          loading={uploadingType === 'separations'} 
        />
      </div>

      {/* ── Auto-Generate PM List ── */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-6 mb-8 border border-purple-200">
        <div className="flex items-start gap-3 mb-4">
          <Sparkles className="w-6 h-6 text-purple-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-800 text-lg mb-1">Auto-Generate PM List from Employee Data</h3>
            <p className="text-sm text-gray-600 mb-2">
              No PM feed file? Automatically promote eligible employees from your uploaded Leave Report as People Managers.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-purple-100 text-purple-700 font-medium">
                <CheckCircle2 className="w-3 h-3" /> Grade ≥ C1
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-indigo-100 text-indigo-700 font-medium">
                <CheckCircle2 className="w-3 h-3" /> Tenure ≥ 1 year
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-green-100 text-green-700 font-medium">
                <CheckCircle2 className="w-3 h-3" /> Safe re-run (upsert)
              </span>
            </div>
          </div>
        </div>

        {/* Preview results */}
        {previewData && (
          <div className="mb-5 p-4 bg-white rounded-lg border border-purple-200">
            <div className="grid grid-cols-3 divide-x divide-gray-100 mb-4">
              <div className="text-center pr-4">
                <p className="text-2xl font-bold text-purple-700">{previewData.eligible}</p>
                <p className="text-xs text-gray-500 mt-0.5">Total Eligible</p>
              </div>
              <div className="text-center px-4">
                <p className="text-2xl font-bold text-green-600">{previewData.new}</p>
                <p className="text-xs text-gray-500 mt-0.5">New PMs to Create</p>
              </div>
              <div className="text-center pl-4">
                <p className="text-2xl font-bold text-gray-400">{previewData.alreadyPM}</p>
                <p className="text-xs text-gray-500 mt-0.5">Already PMs</p>
              </div>
            </div>

            {previewData.eligible === 0 ? (
              <p className="text-sm text-gray-500 text-center py-2">
                No eligible employees found. Upload the Leave Report first, then try again.
              </p>
            ) : (
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Preview (first {Math.min(previewData.preview.length, 8)})</p>
                {previewData.preview.slice(0, 8).map((emp: any) => (
                  <div key={emp.employee_id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-purple-50">
                    <span className="text-sm text-gray-800 font-medium">{emp.name || `ID: ${emp.employee_id}`}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">{emp.grade}</span>
                      <span className="text-xs text-gray-500">{emp.tenure_years}y tenure</span>
                      {emp.practice && <span className="text-xs text-gray-400 hidden sm:inline">{emp.practice}</span>}
                      {emp.already_pm && (
                        <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded">Already PM</span>
                      )}
                    </div>
                  </div>
                ))}
                {previewData.eligible > 8 && (
                  <p className="text-xs text-gray-400 text-center pt-1">+{previewData.eligible - 8} more eligible employees</p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => triggerPreview()}
            disabled={previewLoading || previewFetching}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-purple-700 border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors text-sm font-medium disabled:opacity-50 shadow-sm"
          >
            {(previewLoading || previewFetching) ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            {(previewLoading || previewFetching) ? 'Scanning employees...' : 'Preview Eligible Employees'}
          </button>

          {previewData && previewData.eligible > 0 && (
            <button
              onClick={handleAutoGenerate}
              disabled={generateLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold disabled:opacity-50 shadow-md"
            >
              {generateLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {generateLoading ? 'Generating...' : `Generate ${previewData.new > 0 ? previewData.new + ' New' : ''} PMs`}
            </button>
          )}
        </div>
      </div>

      {/* ── STEP 3 — Auto-Assign Employees to PMs ── */}
      <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg p-6 mb-8 border border-teal-200">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-800 text-lg mb-1">Auto-Assign Employees to People Managers</h3>
            <p className="text-sm text-gray-600 mb-2">
              Runs the matching engine across all unassigned employees and assigns each one to the best matching PM.
              Requires Steps 1 &amp; 2 to be completed first.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-teal-100 text-teal-700 font-medium">
                <CheckCircle2 className="w-3 h-3" /> Same Practice (40pts)
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-cyan-100 text-cyan-700 font-medium">
                <CheckCircle2 className="w-3 h-3" /> Same CU (25pts)
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-blue-100 text-blue-700 font-medium">
                <CheckCircle2 className="w-3 h-3" /> Same Region (15pts)
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-green-100 text-green-700 font-medium">
                <CheckCircle2 className="w-3 h-3" /> Safe re-run (upsert)
              </span>
            </div>
          </div>
        </div>

        {/* Preview results */}
        {assignPreviewData && (
          <div className="mb-5 p-4 bg-white rounded-lg border border-teal-200">
            <div className="grid grid-cols-3 divide-x divide-gray-100 mb-4">
              <div className="text-center pr-4">
                <p className="text-2xl font-bold text-gray-700">{assignPreviewData.totalUnassigned}</p>
                <p className="text-xs text-gray-500 mt-0.5">Unassigned Employees</p>
              </div>
              <div className="text-center px-4">
                <p className="text-2xl font-bold text-teal-600">{assignPreviewData.canBeAssigned}</p>
                <p className="text-xs text-gray-500 mt-0.5">Will Be Assigned</p>
              </div>
              <div className="text-center pl-4">
                <p className="text-2xl font-bold text-orange-500">{assignPreviewData.cannotBeAssigned}</p>
                <p className="text-xs text-gray-500 mt-0.5">No Match Found</p>
              </div>
            </div>

            {assignPreviewData.totalUnassigned === 0 ? (
              <p className="text-sm text-green-700 font-medium text-center py-2">✓ All employees already assigned to a PM!</p>
            ) : assignPreviewData.canBeAssigned === 0 ? (
              <p className="text-sm text-orange-600 text-center py-2">
                No matches found. Complete Steps 1 &amp; 2 first.
              </p>
            ) : (
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Sample assignments (first {Math.min(assignPreviewData.preview.length, 8)})</p>
                {assignPreviewData.preview.slice(0, 8).map((row: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-teal-50">
                    <span className="text-sm text-gray-800 font-medium truncate max-w-[160px]" title={row.emp_name}>{row.emp_name}</span>
                    <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{row.emp_grade}</span>
                    <ArrowRight className="w-3 h-3 text-teal-400 flex-shrink-0" />
                    <span className="text-sm text-teal-700 font-medium truncate max-w-[160px]" title={row.pm_name}>{row.pm_name}</span>
                    <span className="text-xs px-1.5 py-0.5 bg-teal-100 text-teal-600 rounded">{row.pm_grade}</span>
                    <span className="ml-auto text-xs text-gray-400">{row.score}pts</span>
                  </div>
                ))}
                {assignPreviewData.canBeAssigned > 8 && (
                  <p className="text-xs text-gray-400 text-center pt-1">+{assignPreviewData.canBeAssigned - 8} more assignments queued</p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => triggerAssignPreview()}
            disabled={assignPreviewLoading || assignPreviewFetching || (uploadStats?.activePMs ?? 0) === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-teal-700 border border-teal-300 rounded-lg hover:bg-teal-50 transition-colors text-sm font-medium disabled:opacity-50 shadow-sm"
            title={(uploadStats?.activePMs ?? 0) === 0 ? 'Complete Step 2 first' : ''}
          >
            {(assignPreviewLoading || assignPreviewFetching) ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            {(assignPreviewLoading || assignPreviewFetching) ? 'Scanning...' : 'Preview Assignments'}
          </button>

          {assignPreviewData && assignPreviewData.canBeAssigned > 0 && (
            <button
              onClick={handleAutoAssign}
              disabled={assignLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-semibold disabled:opacity-50 shadow-md"
            >
              {assignLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {assignLoading ? 'Assigning...' : `Assign ${assignPreviewData.canBeAssigned} Employees to PMs`}
            </button>
          )}

          {assignPreviewData && assignPreviewData.totalUnassigned === 0 && (
            <a
              href="/pm-report"
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0070AD] text-white rounded-lg hover:bg-[#005a8a] transition-colors text-sm font-semibold shadow-md"
            >
              <ArrowRight className="w-4 h-4" />
              View PM Allocation Report
            </a>
          )}
        </div>
      </div>

      {/* Automation Info */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-start gap-3 mb-4">
          <Clock className="w-5 h-5 text-[#12ABDB] mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-800 mb-2">Automated Workflows</h3>
            <p className="text-sm text-gray-600 mb-4">
              After uploading, the system automatically processes data based on these schedules:
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border-l-4 border-blue-500 pl-4 py-2">
            <p className="font-medium text-gray-800 flex items-center gap-2">
              <span className="text-lg">🕘</span> Daily @ 9:00 AM
            </p>
            <p className="text-sm text-gray-600 mt-1">New Joiner PM Assignment Workflow</p>
            <p className="text-xs text-gray-500 mt-1">Automatically matches new joiners with suitable PMs</p>
          </div>
          <div className="border-l-4 border-orange-500 pl-4 py-2">
            <p className="font-medium text-gray-800 flex items-center gap-2">
              <span className="text-lg">🕙</span> Daily @ 10:00 AM
            </p>
            <p className="text-sm text-gray-600 mt-1">Separation & Reassignment Check</p>
            <p className="text-xs text-gray-500 mt-1">Identifies PMs leaving and reassigns reportees</p>
          </div>
          <div className="border-l-4 border-green-500 pl-4 py-2">
            <p className="font-medium text-gray-800 flex items-center gap-2">
              <span className="text-lg">⏰</span> Every 6 Hours
            </p>
            <p className="text-sm text-gray-600 mt-1">Approval Reminders</p>
            <p className="text-xs text-gray-500 mt-1">Sends reminders for pending approval requests</p>
          </div>
          <div className="border-l-4 border-purple-500 pl-4 py-2">
            <p className="font-medium text-gray-800 flex items-center gap-2">
              <span className="text-lg">📅</span> Monthly (1st @ 8 AM)
            </p>
            <p className="text-sm text-gray-600 mt-1">PM Engagement & Capacity Review</p>
            <p className="text-xs text-gray-500 mt-1">Analyzes PM workload and suggests optimizations</p>
          </div>
        </div>
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-sm text-gray-700">
            <strong className="text-gray-800">💡 Tip:</strong> You can also manually trigger PM matching for individual employees from the{' '}
            <a href="/new-joiners" className="text-[#0070AD] hover:underline font-medium">New Joiners</a> page. 
            Click "Find PM" next to any employee to see matching scores and assign immediately.
          </p>
        </div>
      </div>

      {/* Help Section */}
      <div className="mt-6 bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h4 className="font-semibold text-gray-800 mb-3">📄 Excel File Requirements</h4>
        <p className="text-sm text-gray-600 mb-3">
          Ensure your Excel files meet these requirements for successful uploads:
        </p>
        
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm font-medium text-gray-800 mb-1">📊 File Size Limit</p>
          <p className="text-sm text-gray-700">Maximum file size: <strong>100 MB</strong></p>
          <p className="text-xs text-gray-600 mt-1">Supports large enterprise Excel files with thousands of records</p>
        </div>
        
        <p className="text-sm font-medium text-gray-800 mb-2">Required Column Headers:</p>
        <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
          <li><strong>Leave Report:</strong> Employee ID / GGID / Global Id, Email ID, Practice, CU, Region, Grade, Skill, Joining Date</li>
          <li><strong>People Manager Feed:</strong> GGID / Global Id / PM GGID, Email ID / PM Email ID, Practice, CU, Region, Grade, Skill, Reportee Count</li>
          <li><strong>New Joiner Feed:</strong> Same as Bench Report — flagged automatically as new joiners</li>
          <li><strong>Separation Reports:</strong> Global Id / GGID (PM's ID), LWD / Updated Last Working Date, Reason / Separation Type</li>
          <li><strong>Skill Report:</strong> Primary Skill / Skill Group / R2D2 Primary Skill, Skill Cluster (optional), Practice (optional)</li>
        </ul>
        <p className="text-xs text-gray-500 mt-2">💡 Column names are case-insensitive. Upload order: <strong>PM Feed → Separations</strong> (separations require PMs to already exist).</p>
      </div>
    </div>
  );
};
