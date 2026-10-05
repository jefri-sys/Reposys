import { startTransition, useMemo, useRef, useState } from 'react';
import api from '../services/api';

const ACCEPTED_FILE_TYPES = '.pdf,.doc,.docx,.jpg,.jpeg,.png';

const ISSUE_LABELS = {
  TOO_DARK: 'looks too dark for reliable printing',
  TOO_LIGHT: 'looks too light and may lose text contrast',
  LOW_RESOLUTION: 'may be too low resolution for a clean print',
};

const formatBytes = (bytes) => {
  if (!bytes) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / (1024 ** exponent);

  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[exponent]}`;
};

const getFileTypeLabel = (file) => {
  const typeStr = file.type || '';
  if (typeStr.includes('pdf')) return 'PDF';
  if (typeStr.includes('word') || typeStr.includes('document')) return 'Word';
  if (typeStr.includes('image/jpeg') || typeStr.includes('image/jpg')) return 'JPG';
  if (typeStr.includes('image/png')) return 'PNG';

  const parts = file.name.split('.');
  if (parts.length > 1) {
    const ext = parts[parts.length - 1].toLowerCase();
    if (ext === 'pdf') return 'PDF';
    if (ext === 'doc' || ext === 'docx') return 'Word';
    if (ext === 'jpg' || ext === 'jpeg') return 'JPG';
    if (ext === 'png') return 'PNG';
    return ext.toUpperCase();
  }

  return 'Unknown';
};

const formatPageLabel = (pages) => {
  if (!pages.length) {
    return '';
  }

  const prefix = pages.length === 1 ? 'Page' : 'Pages';
  return `${prefix} ${pages.join(', ')}`;
};

const describeQualityIssue = (issue) => {
  const description = ISSUE_LABELS[issue.issue] || issue.issue.replaceAll('_', ' ').toLowerCase();
  return `Page ${issue.page} ${description}.`;
};

const getNormalizedResults = (payload, multiple) => {
  if (multiple) {
    return {
      files: Array.isArray(payload?.results) ? payload.results : [],
      totalPages: payload?.summedPageCount || 0,
    };
  }

  return {
    files: payload ? [payload] : [],
    totalPages: payload?.pageCount || 0,
  };
};

const getUploadErrorMessage = (uploadError) => {
  const responseData = uploadError.response?.data;

  if (typeof responseData === 'string') {
    if (responseData.toLowerCase().includes('application failed to respond')) {
      return 'The server took too long to finish processing this upload. Please try again, or compress the file and upload it again.';
    }

    return responseData;
  }

  if (responseData?.message) {
    return responseData.message;
  }

  if (uploadError.code === 'ECONNABORTED') {
    return 'The upload request timed out while the server was processing the file. Please try again with a compressed PDF.';
  }

  return 'The server encountered an error processing your file. Please try again or use a different file.';
};

const openResultInNewTab = async (result) => {
  if (!result?.documentId) {
    if (result?.cloudinaryUrl) {
      window.open(result.cloudinaryUrl, '_blank', 'noopener,noreferrer');
    }

    return;
  }

  const accessUrl = (await api.get(`/documents/${result.documentId}/url`)).data?.url;

  if (accessUrl) {
    window.open(accessUrl, '_blank', 'noopener,noreferrer');
  }
};

const resetFileInput = (inputRef) => {
  if (inputRef.current) {
    inputRef.current.value = '';
  }
};

const DocumentUpload = ({ multiple = false, onAnalysisComplete, allowOpenUploadedFile = true }) => {
  const inputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [openingDocumentId, setOpeningDocumentId] = useState('');
  const [error, setError] = useState('');
  const [analysisPayload, setAnalysisPayload] = useState(null);

  const normalizedResults = useMemo(
    () => getNormalizedResults(analysisPayload, multiple),
    [analysisPayload, multiple]
  );

  const clearUploadState = () => {
    setSelectedFiles([]);
    setUploadProgress(0);
    setAnalysisPayload(null);
    resetFileInput(inputRef);
    onAnalysisComplete?.(null);
  };

  const handleReplaceFile = () => {
    setError('');
    clearUploadState();
  };

  const handleFilesSelected = (fileList) => {
    const files = Array.from(fileList || []);

    if (!files.length) {
      return;
    }

    setError('');
    setUploadProgress(0);
    setAnalysisPayload(null);
    setSelectedFiles(multiple ? files : [files[0]]);
  };

  const handleInputChange = (event) => {
    handleFilesSelected(event.target.files);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    handleFilesSelected(event.dataTransfer.files);
  };

  const handleUpload = async () => {
    if (!selectedFiles.length || isUploading) {
      return;
    }

    const formData = new FormData();
    const endpoint = multiple ? '/documents/upload-multiple' : '/documents/upload';

    selectedFiles.forEach((file) => {
      formData.append(multiple ? 'files' : 'file', file);
    });

    setError('');
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const response = await api.post(endpoint, formData, {
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) {
            return;
          }

          setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
        },
      });

      if (response.data?.isPasswordProtected) {
        clearUploadState();
        setError('This PDF is password-protected and cannot be processed.');
        return;
      }

      startTransition(() => {
        setAnalysisPayload(response.data);
      });

      onAnalysisComplete?.(response.data);
      setUploadProgress(100);
    } catch (uploadError) {
      const responseData = uploadError.response?.data;
      const message = getUploadErrorMessage(uploadError);
      
      if (message.toLowerCase().includes('password-protected')) {
        clearUploadState();
      }

      setError(message);
      console.error('Upload Error Details:', {
        status: uploadError.response?.status,
        data: responseData,
        error: uploadError.message,
        stack: responseData?.stack
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)]">
      <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_42%),linear-gradient(135deg,_#eff6ff,_#ffffff_62%)] px-6 py-6 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">Step 1</p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-950">
          Upload the document for automatic analysis
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Drop in a PDF, Word file, or image. We will inspect page count, blank pages, quality flags, and colour-heavy
          pages before the next step.
        </p>
      </div>

      <div className="space-y-6 px-6 py-6 sm:px-8">
        <div
          className={[
            'relative rounded-[28px] border-2 border-dashed px-6 py-10 text-center transition',
            isDragging
              ? 'border-sky-500 bg-sky-50'
              : 'border-slate-300 bg-slate-50/80 hover:border-sky-400 hover:bg-sky-50/60',
          ].join(' ')}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            accept={ACCEPTED_FILE_TYPES}
            className="hidden"
            multiple={multiple}
            type="file"
            onChange={handleInputChange}
          />

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-300/40">
            <svg fill="none" viewBox="0 0 24 24" className="h-8 w-8" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16.5v.75A2.75 2.75 0 0 0 6.75 20h10.5A2.75 2.75 0 0 0 20 17.25v-.75" />
            </svg>
          </div>
          <h3 className="mt-5 text-lg font-semibold text-slate-950">
            {multiple ? 'Drop one or more files here' : 'Drop your file here'}
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Drag and drop, or use the browse button for PDF, DOC, DOCX, JPG, or PNG files.
          </p>
          <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            Maximum upload size: 25 MB per file
          </p>
          <button
            className="mt-6 inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            type="button"
            onClick={() => inputRef.current?.click()}
          >
            Click to browse
          </button>
        </div>

        {selectedFiles.length ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  {multiple ? `${selectedFiles.length} files ready` : 'Selected file'}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Review the details below, then start the upload when you are ready.
                </p>
              </div>
              <button
                className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                type="button"
                onClick={handleReplaceFile}
              >
                Replace File
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {selectedFiles.map((file) => (
                <div
                  key={`${file.name}-${file.lastModified}`}
                  className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 md:grid-cols-[minmax(0,1fr)_100px_140px]"
                >
                  <div className="col-span-2 md:col-span-1 min-w-0">
                    <p className="truncate font-medium text-slate-950">{file.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">Document name</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-950">{formatBytes(file.size)}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">File size</p>
                  </div>
                  <div>
                    <p className="break-all font-medium text-slate-950">{getFileTypeLabel(file)}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">Detected type</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
              <button
                className="inline-flex items-center justify-center rounded-full bg-sky-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={!selectedFiles.length || isUploading}
                type="button"
                onClick={handleUpload}
              >
                {isUploading ? 'Uploading...' : multiple ? 'Upload Files' : 'Upload File'}
              </button>

              {isUploading || uploadProgress > 0 ? (
                <div className="w-full max-w-sm">
                  <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                    <span>Upload progress</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-600 transition-[width] duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {normalizedResults.files.length ? (
          <div className="rounded-[28px] border border-slate-200 bg-slate-950 px-5 py-5 text-white sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">Analysis complete</p>
                <h3 className="mt-2 text-xl font-semibold">
                  {multiple ? 'Your files are ready for the next step' : 'Your document is ready for the next step'}
                </h3>
              </div>
              <div className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-200">
                Total pages: <span className="font-semibold text-white">{normalizedResults.totalPages}</span>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {normalizedResults.files.map((result) => (
                <div key={result.documentId || result.originalFilename} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-white">{result.originalFilename}</p>
                      <p className="mt-1 text-sm text-slate-300">
                        {result.fileType?.toUpperCase()} file with {result.pageCount} page{result.pageCount === 1 ? '' : 's'}.
                      </p>
                    </div>
                    {allowOpenUploadedFile ? (
                      <button
                        className="inline-flex items-center text-sm font-medium text-sky-300 hover:text-sky-200"
                        type="button"
                        onClick={async () => {
                          try {
                            setError('');
                            setOpeningDocumentId(String(result.documentId || ''));
                            await openResultInNewTab(result);
                          } catch (openError) {
                            setError(openError.response?.data?.message || 'Could not open the uploaded file.');
                          } finally {
                            setOpeningDocumentId('');
                          }
                        }}
                      >
                        {openingDocumentId === String(result.documentId || '') ? 'Opening...' : 'Open uploaded file'}
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-3">
                    <div className="rounded-2xl bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Blank pages</p>
                      <p className="mt-2 text-sm leading-6 text-slate-100">
                        {result.blankPages?.length
                          ? `${formatPageLabel(result.blankPages)} appear blank. Include or exclude?`
                          : 'No blank pages detected.'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Quality issues</p>
                      {result.qualityIssues?.length ? (
                        <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-100">
                          {result.qualityIssues.map((issue) => (
                            <li key={`${result.documentId || result.originalFilename}-${issue.page}-${issue.issue}`}>
                              {describeQualityIssue(issue)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm leading-6 text-slate-100">No print-quality issues detected.</p>
                      )}
                    </div>

                    <div className="rounded-2xl bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Colour-heavy pages</p>
                      <p className="mt-2 text-sm leading-6 text-slate-100">
                        {result.colourHeavyPages?.length
                          ? `${formatPageLabel(result.colourHeavyPages)} may use more colour ink.`
                          : 'No colour-heavy pages detected.'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default DocumentUpload;
