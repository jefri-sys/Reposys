import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useFileConverter } from '../../hooks/useFileConverter';
import { FileText, Maximize2, Minimize2, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui';

const PDF_PRESETS = [
  { value: 'A4', label: 'A4' },
  { value: 'A3', label: 'A3' },
  { value: 'Legal', label: 'Legal' },
  { value: 'custom', label: 'Custom size' },
];

const parseFilenameFromDisposition = (contentDispositionHeader, fallbackName) => {
  const utfFilenameMatch = contentDispositionHeader?.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfFilenameMatch?.[1]) return decodeURIComponent(utfFilenameMatch[1]);
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
      return JSON.parse(text).message || fallbackMessage;
    } catch {
      return text || fallbackMessage;
    }
  }
  return error?.response?.data?.message || fallbackMessage;
};

const MobileDocumentTools = () => {
  const navigate = useNavigate();
  const { convertFile, isConverting, conversionError, reset: resetConverter } = useFileConverter();

  const [docxFile, setDocxFile] = useState(null);
  const [docxFileName, setDocxFileName] = useState('');
  const [docxInputKey, setDocxInputKey] = useState(0);

  const [resizeImageForm, setResizeImageForm] = useState({ file: null, width: '', height: '', error: '', inputKey: 0, isLoading: false });
  const [compressImageForm, setCompressImageForm] = useState({ file: null, quality: 80, error: '', inputKey: 0, isLoading: false });
  const [resizePdfForm, setResizePdfForm] = useState({ file: null, targetSize: 'A4', width: '', height: '', error: '', inputKey: 0, isLoading: false });

  const handleDocxSelect = (event) => {
    const file = event.target.files[0];
    if (!file) {
      setDocxFile(null);
      setDocxFileName('');
      return;
    }
    setDocxFile(file);
    setDocxFileName(file.name);
    resetConverter();
  };

  const handleConvert = async () => {
    if (!docxFile) return;
    const result = await convertFile(docxFile);
    if (!result) return;
    
    // Automatically download it for mobile
    const url = URL.createObjectURL(result.file);
    const a = document.createElement('a');
    a.href = url;
    a.download = docxFileName.replace(/\.docx$/i, '.pdf');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setDocxFile(null);
    setDocxFileName('');
    setDocxInputKey(prev => prev + 1);
    resetConverter();
  };

  const requestDownload = async (endpoint, formData, fallbackFilename) => {
    const response = await api.post(endpoint, formData, { responseType: 'blob' });
    const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: response.headers['content-type'] });
    const filename = parseFilenameFromDisposition(response.headers['content-disposition'], fallbackFilename);
    downloadBlob(blob, filename);
  };

  const handleResizeImage = async (event) => {
    event.preventDefault();
    if (!resizeImageForm.file || resizeImageForm.isLoading) return;
    setResizeImageForm(curr => ({ ...curr, error: '', isLoading: true }));
    const formData = new FormData();
    formData.append('file', resizeImageForm.file);
    formData.append('width', resizeImageForm.width);
    formData.append('height', resizeImageForm.height);
    try {
      await requestDownload('/tools/resize-image', formData, 'resized-image');
      setResizeImageForm(curr => ({ file: null, width: '', height: '', error: '', inputKey: curr.inputKey + 1, isLoading: false }));
    } catch (error) {
      const errorMessage = await getErrorMessage(error, 'Image resize failed.');
      setResizeImageForm(curr => ({ ...curr, error: errorMessage, isLoading: false }));
    }
  };

  const handleCompressImage = async (event) => {
    event.preventDefault();
    if (!compressImageForm.file || compressImageForm.isLoading) return;
    setCompressImageForm(curr => ({ ...curr, error: '', isLoading: true }));
    const formData = new FormData();
    formData.append('file', compressImageForm.file);
    formData.append('quality', String(compressImageForm.quality));
    try {
      await requestDownload('/tools/compress-image', formData, 'compressed-image');
      setCompressImageForm(curr => ({ file: null, quality: 80, error: '', inputKey: curr.inputKey + 1, isLoading: false }));
    } catch (error) {
      const errorMessage = await getErrorMessage(error, 'Image compression failed.');
      setCompressImageForm(curr => ({ ...curr, error: errorMessage, isLoading: false }));
    }
  };

  const handleResizePdf = async (event) => {
    event.preventDefault();
    if (!resizePdfForm.file || resizePdfForm.isLoading) return;
    setResizePdfForm(curr => ({ ...curr, error: '', isLoading: true }));
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
      setResizePdfForm(curr => ({ file: null, targetSize: 'A4', width: '', height: '', error: '', inputKey: curr.inputKey + 1, isLoading: false }));
    } catch (error) {
      const errorMessage = await getErrorMessage(error, 'PDF resize failed.');
      setResizePdfForm(curr => ({ ...curr, error: errorMessage, isLoading: false }));
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-slate-600">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-[18px] font-bold text-[#0F172A]">Document Tools</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        
        {/* Word to PDF */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-[#0F172A]">Word to PDF</h2>
              <p className="text-[12px] text-slate-500">Convert .docx to standard PDF</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <input
              key={docxInputKey}
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              type="file"
              onChange={handleDocxSelect}
            />
            
            {conversionError && (
              <div className="p-3 text-[13px] text-red-600 bg-red-50 rounded-xl border border-red-100">
                {conversionError}
              </div>
            )}
            
            <button 
              onClick={handleConvert}
              disabled={!docxFile || isConverting}
              className="w-full bg-[#0047AB] text-white font-bold py-3.5 rounded-xl text-[15px] disabled:opacity-50 active:scale-[0.98] transition-transform"
            >
              {isConverting ? 'Converting...' : 'Convert & Download'}
            </button>
          </div>
        </div>

        {/* Resize Image */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Maximize2 size={20} />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-[#0F172A]">Resize Image</h2>
              <p className="text-[12px] text-slate-500">Change image dimensions (px)</p>
            </div>
          </div>
          
          <form onSubmit={handleResizeImage} className="space-y-4">
            <input
              key={resizeImageForm.inputKey}
              accept="image/jpeg,image/png"
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
              type="file"
              onChange={(e) => setResizeImageForm(curr => ({ ...curr, error: '', file: e.target.files?.[0] || null }))}
            />
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Width (px)</label>
                <input 
                  type="number" 
                  value={resizeImageForm.width}
                  onChange={(e) => setResizeImageForm(curr => ({ ...curr, error: '', width: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[14px] font-medium focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. 1200"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Height (px)</label>
                <input 
                  type="number" 
                  value={resizeImageForm.height}
                  onChange={(e) => setResizeImageForm(curr => ({ ...curr, error: '', height: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[14px] font-medium focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. 900"
                />
              </div>
            </div>

            {resizeImageForm.error && (
              <div className="p-3 text-[13px] text-red-600 bg-red-50 rounded-xl border border-red-100">
                {resizeImageForm.error}
              </div>
            )}
            
            <button 
              type="submit"
              disabled={!resizeImageForm.file || !resizeImageForm.width || !resizeImageForm.height || resizeImageForm.isLoading}
              className="w-full bg-[#0F172A] text-white font-bold py-3.5 rounded-xl text-[15px] disabled:opacity-50 active:scale-[0.98] transition-transform"
            >
              {resizeImageForm.isLoading ? 'Resizing...' : 'Resize & Download'}
            </button>
          </form>
        </div>

        {/* Compress Image */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
              <Minimize2 size={20} />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-[#0F172A]">Compress Image</h2>
              <p className="text-[12px] text-slate-500">Reduce image file size</p>
            </div>
          </div>
          
          <form onSubmit={handleCompressImage} className="space-y-4">
            <input
              key={compressImageForm.inputKey}
              accept="image/jpeg,image/png"
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
              type="file"
              onChange={(e) => setCompressImageForm(curr => ({ ...curr, error: '', file: e.target.files?.[0] || null }))}
            />
            
            <div className="px-1">
              <div className="flex justify-between items-center mb-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Quality</label>
                <span className="text-[12px] font-bold text-[#0F172A]">{compressImageForm.quality}%</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="100" 
                value={compressImageForm.quality}
                onChange={(e) => setCompressImageForm(curr => ({ ...curr, error: '', quality: Number(e.target.value) }))}
                className="w-full accent-amber-500"
              />
            </div>

            {compressImageForm.error && (
              <div className="p-3 text-[13px] text-red-600 bg-red-50 rounded-xl border border-red-100">
                {compressImageForm.error}
              </div>
            )}
            
            <button 
              type="submit"
              disabled={!compressImageForm.file || compressImageForm.isLoading}
              className="w-full bg-[#0F172A] text-white font-bold py-3.5 rounded-xl text-[15px] disabled:opacity-50 active:scale-[0.98] transition-transform"
            >
              {compressImageForm.isLoading ? 'Compressing...' : 'Compress & Download'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default MobileDocumentTools;
