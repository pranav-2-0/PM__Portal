import { Upload, File, CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../utils/cn';

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>;
  accept?: string;
  label: string;
  description?: string;
}

export default function FileUpload({ onUpload, accept = '.xlsx,.xls', label, description }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setStatus('idle');
    try {
      await onUpload(file);
      setStatus('success');
      setMessage('File uploaded successfully!');
      setFile(null);
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="glass-card p-6 animate-fade-in">
      <h3 className="text-lg font-semibold text-capgemini-gray-800 mb-2">{label}</h3>
      {description && <p className="text-sm text-capgemini-gray-600 mb-4">{description}</p>}

      <div className="space-y-4">
        {/* File Input */}
        <label className="block">
          <div className="border-2 border-dashed border-capgemini-gray-300 rounded-lg p-8 text-center hover:border-capgemini-blue transition-colors cursor-pointer">
            <Upload className="mx-auto mb-3 text-capgemini-blue" size={32} />
            <p className="text-sm text-capgemini-gray-600 mb-1">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-capgemini-gray-500">Excel files only (.xlsx, .xls)</p>
          </div>
          <input
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {/* Selected File */}
        {file && (
          <div className="flex items-center gap-3 p-3 bg-capgemini-gray-50 rounded-lg">
            <File className="text-capgemini-blue" size={20} />
            <span className="text-sm text-capgemini-gray-700 flex-1">{file.name}</span>
            <button
              onClick={() => setFile(null)}
              className="text-capgemini-gray-500 hover:text-red-500 transition-colors"
            >
              <XCircle size={20} />
            </button>
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className={cn(
            'w-full btn-primary',
            (!file || uploading) && 'opacity-50 cursor-not-allowed'
          )}
        >
          {uploading ? 'Uploading...' : 'Upload File'}
        </button>

        {/* Status Message */}
        {status !== 'idle' && (
          <div
            className={cn(
              'flex items-center gap-2 p-3 rounded-lg animate-slide-in',
              status === 'success' && 'bg-green-50 text-green-700',
              status === 'error' && 'bg-red-50 text-red-700'
            )}
          >
            {status === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
            <span className="text-sm">{message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
