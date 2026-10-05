import { useEffect, useRef, useState } from 'react';
import DocumentPreview from '../../components/DocumentPreview';
import DocumentUpload from '../../components/DocumentUpload';
import DocumentAnalysisSummary from '../../components/user/DocumentAnalysisSummary';
import { openUploadedDocumentInNewTab } from '../../utils/documentAccess';
import { FileText, Eye, Trash2, Plus, AlertCircle, ExternalLink } from 'lucide-react';

const formatDocumentCountLabel = (count) => `${count} document${count === 1 ? '' : 's'}`;

const MobileWizardStep1Upload = ({
  uploadedDocuments,
  onAnalysisComplete,
  onRemoveDocument,
  onNext,
  uploadKey,
  onResetUploader,
  isGuestMode = false,
  hideNavigation = false,
}) => {
  const remainingSlots = Math.max(0, 10 - uploadedDocuments.length);
  const [selectedPreviewId, setSelectedPreviewId] = useState('');
  const [actionError, setActionError] = useState('');
  const [openingDocumentId, setOpeningDocumentId] = useState('');
  const previousDocumentCountRef = useRef(0);

  useEffect(() => {
    if (!uploadedDocuments.length) {
      setSelectedPreviewId('');
      previousDocumentCountRef.current = 0;
      return;
    }

    const previousCount = previousDocumentCountRef.current;
    const hasSelectedDocument = uploadedDocuments.some((document) => document.documentId === selectedPreviewId);

    if (uploadedDocuments.length > previousCount) {
      setSelectedPreviewId(uploadedDocuments[uploadedDocuments.length - 1].documentId);
    } else if (!hasSelectedDocument) {
      setSelectedPreviewId(uploadedDocuments[0].documentId);
    }

    previousDocumentCountRef.current = uploadedDocuments.length;
  }, [selectedPreviewId, uploadedDocuments]);

  const selectedPreviewDocument = uploadedDocuments.find((document) => document.documentId === selectedPreviewId) || null;

  return (
    <div className="flex flex-col gap-5 w-full max-w-lg mx-auto font-['Inter'] pb-6">
      
      {/* Upload Info Card */}
      <div className="bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,61,155,0.05)] border border-[#e2e8f0]">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-['Hanken_Grotesk'] text-[22px] font-bold text-[#003d9b]">Upload Documents</h2>
            <p className="mt-1.5 text-[14px] text-slate-500 leading-relaxed">
              Add up to 10 files. We'll analyze them for accurate pricing.
            </p>
          </div>
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#e9edff] text-[#003d9b]">
            <FileText size={20} />
          </div>
        </div>
      </div>

      {/* Main Uploader */}
      {remainingSlots > 0 ? (
        <div className="bg-white rounded-[24px] p-2 shadow-[0_4px_20px_rgba(0,61,155,0.05)] border border-[#e2e8f0]">
           <DocumentUpload
            key={uploadKey}
            multiple
            allowOpenUploadedFile={!isGuestMode}
            onAnalysisComplete={onAnalysisComplete}
          />
        </div>
      ) : (
        <div className="bg-[#fffbeb] border border-[#fcd34d] rounded-[20px] p-4 flex gap-3">
          <AlertCircle className="text-[#d97706] shrink-0" size={24} />
          <p className="text-[14px] text-[#92400e] leading-snug">
            You've reached the 10-document limit. Please remove a file to add another.
          </p>
        </div>
      )}

      {/* Uploaded Documents List */}
      <div className="mt-2">
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="font-['Hanken_Grotesk'] text-[18px] font-bold text-[#003d9b]">Current Basket</h3>
          <span className="bg-[#003d9b] text-white text-[12px] font-bold px-3 py-1 rounded-full">
            {uploadedDocuments.length} / 10
          </span>
        </div>

        {uploadedDocuments.length > 0 ? (
          <div className="flex flex-col gap-3">
            {uploadedDocuments.map((document, index) => (
              <div 
                key={document.documentId}
                className="bg-white rounded-[20px] p-4 shadow-sm border border-[#e2e8f0] flex flex-col gap-3"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-3">
                    <p className="font-semibold text-[15px] text-slate-800 line-clamp-1">
                      {index + 1}. {document.originalFilename}
                    </p>
                  </div>
                  <button 
                    onClick={() => onRemoveDocument(document.documentId)}
                    className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="bg-slate-50 rounded-[16px] p-3 text-[13px] border border-slate-100">
                  <DocumentAnalysisSummary compact document={document} />
                </div>

                <div className="flex gap-2 mt-1">
                  <button
                    className="flex-1 h-10 rounded-xl bg-[#e9edff] text-[#003d9b] text-[13px] font-bold flex items-center justify-center gap-2"
                    onClick={() => setSelectedPreviewId(document.documentId)}
                  >
                    <Eye size={16} /> Preview
                  </button>
                  {!isGuestMode && (
                    <button
                      className="flex-1 h-10 rounded-xl bg-slate-100 text-slate-700 text-[13px] font-bold flex items-center justify-center gap-2"
                      onClick={async () => {
                        try {
                          setActionError('');
                          setOpeningDocumentId(document.documentId);
                          await openUploadedDocumentInNewTab(document);
                        } catch (error) {
                          setActionError(error.response?.data?.message || 'Could not open file.');
                        } finally {
                          setOpeningDocumentId('');
                        }
                      }}
                    >
                      <ExternalLink size={16} /> 
                      {openingDocumentId === document.documentId ? 'Opening...' : 'Open File'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 border border-dashed border-slate-300 rounded-[24px] p-8 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-400">
              <FileText size={24} />
            </div>
            <p className="text-[14px] text-slate-500">Your basket is empty. Add a document to begin.</p>
          </div>
        )}
      </div>

      {actionError && (
        <div className="bg-rose-50 border border-rose-200 rounded-[16px] p-4 text-[14px] text-rose-600">
          {actionError}
        </div>
      )}

      {selectedPreviewDocument && (
        <DocumentPreview
          analysisResults={selectedPreviewDocument}
          cloudinaryUrl={selectedPreviewDocument.cloudinaryUrl}
          documentId={selectedPreviewDocument.documentId}
          fileType={selectedPreviewDocument.fileType}
          showProceedButton={false}
          useSignedUrl
        />
      )}
    </div>
  );
};

export default MobileWizardStep1Upload;
