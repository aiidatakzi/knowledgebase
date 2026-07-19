'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileDropZoneProps {
  onFilesDropped: (files: File[]) => void;
  uploading?: boolean;
}

export default function FileDropZone({ onFilesDropped, uploading }: FileDropZoneProps) {
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFilesDropped(acceptedFiles);
    },
    [onFilesDropped],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/markdown': ['.md', '.markdown'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    multiple: true,
  });

  const active = isDragActive || dragActive;

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
        active
          ? 'border-indigo-500 bg-indigo-500/10'
          : 'border-gray-700 hover:border-gray-500 bg-gray-900'
      }`}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <div>
          <div className="text-3xl mb-2 animate-bounce">⏳</div>
          <p className="text-gray-400">Processing files...</p>
        </div>
      ) : active ? (
        <div>
          <div className="text-3xl mb-2">📥</div>
          <p className="text-indigo-300 font-medium">Drop files here</p>
          <p className="text-gray-500 text-sm mt-1">Release to import</p>
        </div>
      ) : (
        <div>
          <div className="text-3xl mb-2">📁</div>
          <p className="text-gray-300 font-medium">
            Drop files here or click to browse
          </p>
          <p className="text-gray-500 text-sm mt-1">
            Supports MD, PDF, DOCX
          </p>
        </div>
      )}
    </div>
  );
}