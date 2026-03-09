'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface BulkFile {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  scanId?: string;
  error?: string;
}

interface BulkUploadProps {
  disabled?: boolean;
  maxFiles?: number;
}

const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function BulkUpload({
  disabled = false,
  maxFiles = 10,
}: BulkUploadProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<BulkFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);
      const validFiles: BulkFile[] = [];

      for (const file of fileArray) {
        if (files.length + validFiles.length >= maxFiles) break;

        if (!ACCEPTED_TYPES.includes(file.type)) {
          continue; // Skip invalid types silently
        }
        if (file.size > MAX_FILE_SIZE) {
          continue; // Skip oversized files
        }

        // Check for duplicate file names
        const isDupe = files.some((f) => f.file.name === file.name);
        if (isDupe) continue;

        validFiles.push({ file, status: 'pending' });
      }

      if (validFiles.length > 0) {
        setFiles((prev) => [...prev, ...validFiles]);
      }
    },
    [files, maxFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled || isProcessing) return;
      addFiles(e.dataTransfer.files);
    },
    [addFiles, disabled, isProcessing]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(e.target.files);
        // Reset input so the same file can be added again after removal
        e.target.value = '';
      }
    },
    [addFiles]
  );

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setFiles([]);
    setCompletedCount(0);
  };

  const processFiles = async () => {
    if (files.length === 0 || isProcessing) return;

    setIsProcessing(true);
    setCompletedCount(0);
    let completed = 0;

    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'success') {
        completed++;
        continue;
      }

      // Update status to uploading
      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === i ? { ...f, status: 'uploading' as const } : f
        )
      );

      try {
        const formData = new FormData();
        formData.append('file', files[i].file);

        const response = await fetch('/api/analyze', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `Failed (${response.status})`);
        }

        const data = await response.json();
        const scanId = data.scan_id || data.scanId || data.id;

        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? { ...f, status: 'success' as const, scanId: scanId || undefined }
              : f
          )
        );
        completed++;
        setCompletedCount(completed);
      } catch (err) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? {
                  ...f,
                  status: 'error' as const,
                  error:
                    err instanceof Error
                      ? err.message
                      : 'Analysis failed',
                }
              : f
          )
        );
      }
    }

    setIsProcessing(false);
  };

  const successCount = files.filter((f) => f.status === 'success').length;
  const errorCount = files.filter((f) => f.status === 'error').length;
  const allDone =
    files.length > 0 && files.every((f) => f.status === 'success' || f.status === 'error');

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={`relative rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          disabled || isProcessing
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : 'border-gray-300 bg-white hover:border-teal hover:bg-teal/5 cursor-pointer'
        }`}
        onClick={() => !disabled && !isProcessing && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(',')}
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled || isProcessing}
        />

        <svg
          className="mx-auto h-10 w-10 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9.75m0 0l2.25-2.25M9.75 15l2.25 2.25M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
        <p className="mt-2 text-sm font-medium text-gray-600">
          Drop up to {maxFiles} invoices here, or click to browse
        </p>
        <p className="mt-1 text-xs text-gray-400">
          JPG, PNG, PDF, WebP (max 10MB each)
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-navy">
              {files.length} file{files.length !== 1 ? 's' : ''} selected
            </p>
            <div className="flex items-center gap-2">
              {allDone && (
                <span className="text-xs text-gray-500">
                  {successCount} succeeded, {errorCount} failed
                </span>
              )}
              <button
                onClick={clearAll}
                disabled={isProcessing}
                className="text-xs text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>

          <ul className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
            {files.map((item, index) => (
              <li
                key={`${item.file.name}-${index}`}
                className="flex items-center gap-3 px-4 py-3"
              >
                {/* Status Icon */}
                <div className="shrink-0">
                  {item.status === 'pending' && (
                    <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                  )}
                  {item.status === 'uploading' && (
                    <svg
                      className="h-5 w-5 animate-spin text-teal"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  )}
                  {item.status === 'success' && (
                    <svg
                      className="h-5 w-5 text-green-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2.5"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  )}
                  {item.status === 'error' && (
                    <svg
                      className="h-5 w-5 text-red-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2.5"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                      />
                    </svg>
                  )}
                </div>

                {/* File Info */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-navy truncate">
                    {item.file.name}
                  </p>
                  {item.status === 'error' && item.error && (
                    <p className="text-xs text-red-600 mt-0.5">{item.error}</p>
                  )}
                  {item.status === 'uploading' && (
                    <p className="text-xs text-teal mt-0.5">Analyzing...</p>
                  )}
                </div>

                {/* Actions */}
                {item.status === 'success' && item.scanId && (
                  <button
                    onClick={() => router.push(`/dashboard/scan/${item.scanId}`)}
                    className="shrink-0 rounded-md bg-navy/5 px-3 py-1 text-xs font-semibold text-navy hover:bg-navy/10 transition-colors cursor-pointer"
                  >
                    View
                  </button>
                )}
                {(item.status === 'pending' || item.status === 'error') &&
                  !isProcessing && (
                    <button
                      onClick={() => removeFile(index)}
                      className="shrink-0 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
              </li>
            ))}
          </ul>

          {/* Progress Bar */}
          {isProcessing && (
            <div className="px-4 py-2 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Processing...</span>
                <span>
                  {completedCount} / {files.length}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-200">
                <div
                  className="h-1.5 rounded-full bg-teal transition-all duration-300"
                  style={{
                    width: `${(completedCount / files.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!allDone && (
            <div className="border-t border-gray-100 px-4 py-3">
              <button
                onClick={processFiles}
                disabled={isProcessing || files.length === 0 || disabled}
                className="w-full rounded-lg bg-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isProcessing
                  ? `Analyzing ${completedCount + 1} of ${files.length}...`
                  : `Analyze ${files.length} Invoice${files.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          )}

          {allDone && (
            <div className="border-t border-gray-100 px-4 py-3 flex gap-3">
              <button
                onClick={() => router.push('/dashboard/history')}
                className="flex-1 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy/90 transition-colors cursor-pointer"
              >
                View All Results
              </button>
              <button
                onClick={clearAll}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                New Batch
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
