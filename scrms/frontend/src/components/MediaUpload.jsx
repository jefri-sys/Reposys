import React, { useRef, useState } from 'react';
import { Paperclip, Loader2 } from 'lucide-react';
import api from '../services/api';

const MediaUpload = ({ onUploadComplete, disabled = false }) => {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleIconClick = () => {
    if (!disabled && !loading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (onUploadComplete) {
        onUploadComplete({
          url: response.data.url,
          mediaType: response.data.mediaType,
        });
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || 'Error uploading file');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = null;
      }
    }
  };

  return (
    <div className="relative inline-flex flex-col items-center justify-center">
      <button
        type="button"
        onClick={handleIconClick}
        disabled={disabled || loading}
        className="p-2 text-gray-500 hover:text-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-full hover:bg-gray-100"
        title="Attach file (JPEG, PNG, PDF)"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
        ) : (
          <Paperclip className="w-5 h-5" />
        )}
      </button>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,application/pdf"
        className="hidden"
      />
      
      {error && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max max-w-[200px] text-xs text-white bg-red-500 px-2 py-1 rounded shadow-md z-10 text-center">
          {error}
          {/* Small triangle arrow for tooltip effect */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-red-500"></div>
        </div>
      )}
    </div>
  );
};

export default MediaUpload;
