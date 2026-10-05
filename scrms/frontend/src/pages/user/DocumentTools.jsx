import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useFileConverter } from '../../hooks/useFileConverter';
import DocumentPreview from '../../components/DocumentPreview';
import { useWindowWidth } from '../../hooks/useWindowWidth';
import MobileDocumentTools from '../mobile/MobileDocumentTools';
import { FileText, Image as ImageIcon, Maximize2, Minimize2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Select,
  PageHeader
} from '../../components/ui';

const PDF_PRESETS = [
  { value: 'A4', label: 'A4' },
  { value: 'A3', label: 'A3' },
  { value: 'Legal', label: 'Legal' },
  { value: 'custom', label: 'Custom size' },
];

const parseFilenameFromDisposition = (contentDispositionHeader, fallbackName) => {
  const utfFilenameMatch = contentDispositionHeader?.match(/filename\*=UTF-8''([^;]+)/i);

  if (utfFilenameMatch?.[1]) {
    return decodeURIComponent(utfFilenameMatch[1]);
  }

  const filenameMatch = contentDispositionHeader?.match(/filename="?([^"]+)"?/i);
  return filenameMatch?.[1] || fallbackName;
};

const downloadBlob = (blob, filename) => {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
};

const getErrorMessage = async (error, fallbackMessage) => {
  const responseData = error?.response?.data;

  if (responseData instanceof Blob) {
    const text = await responseData.text();

    try {
      const parsed = JSON.parse(text);
      return parsed.message || fallbackMessage;
    } catch {
      return text || fallbackMessage;
    }
  }

  return error?.response?.data?.message || fallbackMessage;
};

const DocumentTools = () => {
  const {
    convertFile,
    isConverting,
    conversionError,
    reset: resetConverter
  } = useFileConverter();

  const width = useWindowWidth();

  const [docxFile, setDocxFile] = useState(null);
  const [docxFileName, setDocxFileName] = useState('');
  const [docxInputKey, setDocxInputKey] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [previewBlob, setPreviewBlob] = useState(null);
  const [sizeWarning, setSizeWarning] = useState(false);
  const [sizeMB, setSizeMB] = useState('');

  const handleDocxSelect = (event) => {
    const file = event.target.files[0];
    if (!file) {
      setDocxFile(null);
      setDocxFileName('');
      return;
    }
    setDocxFile(file);
    setDocxFileName(file.name);
    setShowPreview(false);
    setPreviewBlob(null);
    resetConverter();
  };

  const handleConvertAndPreview = async () => {
    if (!docxFile) return;

    const result = await convertFile(docxFile);

    if (!result) return;

    setPreviewBlob(result.file);
    setSizeWarning(result.sizeWarning);
    setSizeMB(result.sizeMB);
    setShowPreview(true);
  };

  const handleDownload = () => {
    const url = URL.createObjectURL(previewBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = docxFileName.replace(/\.docx$/i, '.pdf');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    handleReset();
  };

  const handleReset = () => {
    setDocxFile(null);
    setDocxFileName('');
    setShowPreview(false);
    setPreviewBlob(null);
    setSizeWarning(false);
    setSizeMB('');
    setDocxInputKey((prev) => prev + 1);
    resetConverter();
  };

  const [resizeImageForm, setResizeImageForm] = useState({
    file: null,
    width: '',
    height: '',
    error: '',
    inputKey: 0,
    isLoading: false,
  });
  const [compressImageForm, setCompressImageForm] = useState({
    file: null,
    quality: 80,
    error: '',
    inputKey: 0,
    isLoading: false,
  });
  const [resizePdfForm, setResizePdfForm] = useState({
    file: null,
    targetSize: 'A4',
    width: '',
    height: '',
    error: '',
    inputKey: 0,
    isLoading: false,
  });

  const requestDownload = async (endpoint, formData, fallbackFilename) => {
    const response = await api.post(endpoint, formData, {
      responseType: 'blob',
    });
    const blob = response.data instanceof Blob
      ? response.data
      : new Blob([response.data], { type: response.headers['content-type'] });
    const filename = parseFilenameFromDisposition(
      response.headers['content-disposition'],
      fallbackFilename
    );

    downloadBlob(blob, filename);
  };

  const handleResizeImage = async (event) => {
    event.preventDefault();

    if (!resizeImageForm.file || resizeImageForm.isLoading) return;

    setResizeImageForm((currentForm) => ({ ...currentForm, error: '', isLoading: true }));

    const formData = new FormData();
    formData.append('file', resizeImageForm.file);
    formData.append('width', resizeImageForm.width);
    formData.append('height', resizeImageForm.height);

    try {
      await requestDownload('/tools/resize-image', formData, 'resized-image');
      setResizeImageForm((currentForm) => ({
        file: null,
        width: '',
        height: '',
        error: '',
        inputKey: currentForm.inputKey + 1,
        isLoading: false,
      }));
    } catch (error) {
      const errorMessage = await getErrorMessage(error, 'Image resize failed.');
      setResizeImageForm((currentForm) => ({
        ...currentForm,
        error: errorMessage,
        isLoading: false,
      }));
    }
  };

  const handleCompressImage = async (event) => {
    event.preventDefault();

    if (!compressImageForm.file || compressImageForm.isLoading) return;

    setCompressImageForm((currentForm) => ({ ...currentForm, error: '', isLoading: true }));

    const formData = new FormData();
    formData.append('file', compressImageForm.file);
    formData.append('quality', String(compressImageForm.quality));

    try {
      await requestDownload('/tools/compress-image', formData, 'compressed-image');
      setCompressImageForm((currentForm) => ({
        file: null,
        quality: 80,
        error: '',
        inputKey: currentForm.inputKey + 1,
        isLoading: false,
      }));
    } catch (error) {
      const errorMessage = await getErrorMessage(error, 'Image compression failed.');
      setCompressImageForm((currentForm) => ({
        ...currentForm,
        error: errorMessage,
        isLoading: false,
      }));
    }
  };

  const handleResizePdf = async (event) => {
    event.preventDefault();

    if (!resizePdfForm.file || resizePdfForm.isLoading) return;

    setResizePdfForm((currentForm) => ({ ...currentForm, error: '', isLoading: true }));

    const formData = new FormData();
    formData.append('file', resizePdfForm.file);

    if (resizePdfForm.targetSize === 'custom') {
      formData.append('targetSize', 'custom');
      formData.append('width', resizePdfForm.width);
      formData.append('height', resizePdfForm.height);
    } else {
      formData.append('targetSize', resizePdfForm.targetSize);
    }

    try {
      await requestDownload('/tools/resize-pdf-pages', formData, 'resized-document.pdf');
      setResizePdfForm((currentForm) => ({
        file: null,
        targetSize: 'A4',
        width: '',
        height: '',
        error: '',
        inputKey: currentForm.inputKey + 1,
        isLoading: false,
      }));
    } catch (error) {
      const errorMessage = await getErrorMessage(error, 'PDF resize failed.');
      setResizePdfForm((currentForm) => ({
        ...currentForm,
        error: errorMessage,
        isLoading: false,
      }));
    }
  };

  if (width < 768) {
    return <MobileDocumentTools />;
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader 
          title="Document Tools"
          description="Convert PDFs and Word documents, resize or compress images, and normalize PDF page dimensions."
          actions={
            <Button as={Link} to="/dashboard" variant="outline">
              Back to Dashboard
            </Button>
          }
        />

        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
                  <FileText className="w-5 h-5" />
                </div>
                <CardTitle>Convert Word to PDF</CardTitle>
              </div>
              <CardDescription>
                Upload a .docx file, preview the result, and download as PDF. Works best with simple documents, assignments, and reports.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleConvertAndPreview(); }}>
                <div className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Choose DOCX</span>
                  <input
                    key={docxInputKey}
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200 transition-colors cursor-pointer"
                    type="file"
                    onChange={handleDocxSelect}
                  />
                </div>

                {isConverting && (
                  <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
                    <span>Converting your document...</span>
                  </div>
                )}

                {conversionError && (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 leading-6">
                      {conversionError}
                    </div>
                    <Button type="button" variant="outline" onClick={handleReset}>
                      Try again
                    </Button>
                  </div>
                )}

                {!isConverting && !conversionError && (
                  <Button type="submit" disabled={!docxFile} className="w-full sm:w-auto">
                    Convert & Download
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
                  <Maximize2 className="w-5 h-5" />
                </div>
                <CardTitle>Resize Image</CardTitle>
              </div>
              <CardDescription>
                Upload a JPEG or PNG image, set the target width and height, and download the resized file.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleResizeImage}>
                <div className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Choose image</span>
                  <input
                    key={resizeImageForm.inputKey}
                    accept="image/jpeg,image/png"
                    className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200 transition-colors cursor-pointer"
                    type="file"
                    onChange={(event) => {
                      setResizeImageForm((currentForm) => ({
                        ...currentForm,
                        error: '',
                        file: event.target.files?.[0] || null,
                      }));
                    }}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Width (px)"
                    min="1"
                    placeholder="e.g. 1200"
                    type="number"
                    value={resizeImageForm.width}
                    onChange={(event) => {
                      setResizeImageForm((currentForm) => ({
                        ...currentForm,
                        error: '',
                        width: event.target.value,
                      }));
                    }}
                  />
                  <Input
                    label="Height (px)"
                    min="1"
                    placeholder="e.g. 900"
                    type="number"
                    value={resizeImageForm.height}
                    onChange={(event) => {
                      setResizeImageForm((currentForm) => ({
                        ...currentForm,
                        error: '',
                        height: event.target.value,
                      }));
                    }}
                  />
                </div>

                {resizeImageForm.error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {resizeImageForm.error}
                  </div>
                )}

                <Button 
                  type="submit" 
                  disabled={!resizeImageForm.file || !resizeImageForm.width || !resizeImageForm.height || resizeImageForm.isLoading}
                  isLoading={resizeImageForm.isLoading}
                  className="w-full sm:w-auto"
                >
                  Resize Image
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
                  <Minimize2 className="w-5 h-5" />
                </div>
                <CardTitle>Compress Image</CardTitle>
              </div>
              <CardDescription>
                Choose a JPEG or PNG image, adjust the quality slider, and download a lighter file.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleCompressImage}>
                <div className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Choose image</span>
                  <input
                    key={compressImageForm.inputKey}
                    accept="image/jpeg,image/png"
                    className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200 transition-colors cursor-pointer"
                    type="file"
                    onChange={(event) => {
                      setCompressImageForm((currentForm) => ({
                        ...currentForm,
                        error: '',
                        file: event.target.files?.[0] || null,
                      }));
                    }}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">Quality</span>
                    <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
                      {compressImageForm.quality}%
                    </span>
                  </div>
                  <input
                    className="w-full accent-blue-600 cursor-pointer"
                    max="100"
                    min="1"
                    type="range"
                    value={compressImageForm.quality}
                    onChange={(event) => {
                      setCompressImageForm((currentForm) => ({
                        ...currentForm,
                        error: '',
                        quality: Number.parseInt(event.target.value, 10),
                      }));
                    }}
                  />
                </div>

                {compressImageForm.error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {compressImageForm.error}
                  </div>
                )}

                <Button 
                  type="submit" 
                  disabled={!compressImageForm.file || compressImageForm.isLoading}
                  isLoading={compressImageForm.isLoading}
                  className="w-full sm:w-auto"
                >
                  Compress Image
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 rounded-lg text-purple-700">
                  <FileText className="w-5 h-5" />
                </div>
                <CardTitle>Resize PDF Pages</CardTitle>
              </div>
              <CardDescription>
                Pick a standard paper size or provide custom PDF point dimensions to update every page in the document.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleResizePdf}>
                <div className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Choose PDF</span>
                  <input
                    key={resizePdfForm.inputKey}
                    accept=".pdf"
                    className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200 transition-colors cursor-pointer"
                    type="file"
                    onChange={(event) => {
                      setResizePdfForm((currentForm) => ({
                        ...currentForm,
                        error: '',
                        file: event.target.files?.[0] || null,
                      }));
                    }}
                  />
                </div>

                <Select
                  label="Target size"
                  value={resizePdfForm.targetSize}
                  onChange={(event) => {
                    setResizePdfForm((currentForm) => ({
                      ...currentForm,
                      error: '',
                      targetSize: event.target.value,
                    }));
                  }}
                  options={PDF_PRESETS}
                />

                {resizePdfForm.targetSize === 'custom' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Width (pt)"
                      min="1"
                      placeholder="e.g. 595.28"
                      type="number"
                      value={resizePdfForm.width}
                      onChange={(event) => {
                        setResizePdfForm((currentForm) => ({
                          ...currentForm,
                          error: '',
                          width: event.target.value,
                        }));
                      }}
                    />
                    <Input
                      label="Height (pt)"
                      min="1"
                      placeholder="e.g. 841.89"
                      type="number"
                      value={resizePdfForm.height}
                      onChange={(event) => {
                        setResizePdfForm((currentForm) => ({
                          ...currentForm,
                          error: '',
                          height: event.target.value,
                        }));
                      }}
                    />
                    <p className="text-xs text-slate-500 sm:col-span-2">Custom values use PDF points (72 pt = 1 inch).</p>
                  </div>
                )}

                {resizePdfForm.error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {resizePdfForm.error}
                  </div>
                )}

                <Button 
                  type="submit" 
                  disabled={!resizePdfForm.file || resizePdfForm.isLoading || (resizePdfForm.targetSize === 'custom' && (!resizePdfForm.width || !resizePdfForm.height))}
                  isLoading={resizePdfForm.isLoading}
                  className="w-full sm:w-auto"
                >
                  Resize PDF
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {showPreview && previewBlob && (
        <DocumentPreview
          pdfBlob={previewBlob}
          originalFileName={docxFileName}
          sizeWarning={sizeWarning}
          sizeMB={sizeMB}
          onConfirm={handleDownload}
          onManualUpload={handleReset}
          confirmLabel="Download PDF"
          cancelLabel="Start over"
        />
      )}
    </div>
  );
};

export default DocumentTools;
