import FileUpload from '../components/FileUpload';
import { useUploadEmployeesMutation, useUploadNewJoinersMutation, useUploadSeparationsMutation, useUploadSkillReportMutation } from '../services/pmApi';

export default function Upload() {
  const [uploadEmployees] = useUploadEmployeesMutation();
  const [uploadNewJoiners] = useUploadNewJoinersMutation();
  const [uploadSeparations] = useUploadSeparationsMutation();
  const [uploadSkillReport] = useUploadSkillReportMutation();

  const handleEmployeeUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    await uploadEmployees(formData).unwrap();
  };

  const handleSeparationUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    await uploadSeparations(formData).unwrap();
  };

  const handleNewJoinerUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    await uploadNewJoiners(formData).unwrap();
  };

  const handleSkillReportUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    await uploadSkillReport(formData).unwrap();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Data Upload</h1>
        <p className="text-gray-600 mt-1">Upload Excel files to update system data</p>
      </div>

      {/* Upload Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <FileUpload
          label="Bench Report"
          description="Upload bench report with employee details"
          onUpload={handleEmployeeUpload}
        />
        <FileUpload
          label="New Joiner Feed"
          description="Upload new joiners only (auto-flagged)"
          onUpload={handleNewJoinerUpload}
        />
        <FileUpload
          label="Separation Reports"
          description="Upload PM resignations with LWD"
          onUpload={handleSeparationUpload}
        />
        <FileUpload
          label="Skill Report"
          description="Upload practice-wise skill repository"
          onUpload={handleSkillReportUpload}
        />
      </div>

      {/* Info Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Upload Guidelines</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="font-bold" style={{ color: '#12ABDB' }}>•</span>
            <span>Ensure Excel files follow the required template format</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold" style={{ color: '#12ABDB' }}>•</span>
            <span>All mandatory fields must be filled</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold" style={{ color: '#12ABDB' }}>•</span>
            <span>Duplicate records will be skipped automatically</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold" style={{ color: '#12ABDB' }}>•</span>
            <span>Upload will fail if data validation errors are found</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
