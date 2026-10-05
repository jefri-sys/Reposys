import { useContext, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DocumentPreview from '../components/DocumentPreview';
import DocumentUpload from '../components/DocumentUpload';
import { AuthContext } from '../context/AuthContextObject';

const getPreviewStateFromUpload = (payload, multiple) => {
  if (!payload) {
    return null;
  }

  if (multiple) {
    return payload.results?.[0] || null;
  }

  return payload;
};

const getReturnPath = (role) => {
  if (role === 'Staff') {
    return '/staff';
  }

  if (role === 'Admin') {
    return '/admin';
  }

  return '/dashboard';
};

const getReturnLabel = (role) => {
  if (role === 'Staff') {
    return 'Back to Staff Dashboard';
  }

  if (role === 'Admin') {
    return 'Back to Admin Dashboard';
  }

  return 'Back to Dashboard';
};

const DocumentLab = () => {
  const { user } = useContext(AuthContext);
  const [multiple, setMultiple] = useState(false);
  const [uploadPayload, setUploadPayload] = useState(null);
  const [stepTwoReady, setStepTwoReady] = useState(false);

  const previewState = useMemo(
    () => getPreviewStateFromUpload(uploadPayload, multiple),
    [multiple, uploadPayload]
  );

  const handleAnalysisComplete = (payload) => {
    setUploadPayload(payload);
    setStepTwoReady(false);
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f8fbff,_#eef4ff_52%,_#f8fafc)] text-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-10">
        <div className="overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_30px_120px_-60px_rgba(15,23,42,0.35)]">
          <div className="grid gap-12 border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_30%),linear-gradient(135deg,_#e0f2fe,_#ffffff_58%)] px-6 py-10 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-700">Temporary Lab</p>
              <Link
                to={getReturnPath(user?.role)}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/90 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-white"
              >
                <span aria-hidden="true">←</span>
                <span>{getReturnLabel(user?.role)}</span>
              </Link>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Phase 2 upload and preview verification surface
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                This page temporarily mounts the new document upload and preview components so we can inspect them
                visually before the full order wizard exists.
              </p>
            </div>

            <div className="grid gap-4 rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-sm backdrop-blur">
              <div className="flex flex-wrap gap-3">
                <button
                  className={[
                    'rounded-full px-4 py-2 text-sm font-medium transition',
                    multiple
                      ? 'border border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                      : 'bg-slate-950 text-white',
                  ].join(' ')}
                  type="button"
                  onClick={() => {
                    setMultiple(false);
                    setUploadPayload(null);
                    setStepTwoReady(false);
                  }}
                >
                  Single Upload
                </button>
                <button
                  className={[
                    'rounded-full px-4 py-2 text-sm font-medium transition',
                    multiple
                      ? 'bg-slate-950 text-white'
                      : 'border border-slate-300 bg-white text-slate-600 hover:border-slate-400',
                  ].join(' ')}
                  type="button"
                  onClick={() => {
                    setMultiple(true);
                    setUploadPayload(null);
                    setStepTwoReady(false);
                  }}
                >
                  Multiple Upload
                </button>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Live Preview</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  The preview stays empty until you upload a real file, then it renders the actual document returned by
                  the protected upload flow.
                </p>
              </div>

              {multiple && uploadPayload?.summedPageCount ? (
                <div className="rounded-3xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-900">
                  Current multi-upload total pages: <span className="font-semibold">{uploadPayload.summedPageCount}</span>
                </div>
              ) : null}

              {stepTwoReady ? (
                <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
                  Preview finished loading. The Step 2 CTA is active.
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:px-10">
            <DocumentUpload multiple={multiple} onAnalysisComplete={handleAnalysisComplete} />
            <DocumentPreview
              analysisResults={previewState}
              cloudinaryUrl={previewState?.cloudinaryUrl}
              documentId={previewState?.documentId}
              fileType={previewState?.fileType}
              onProceed={() => setStepTwoReady(true)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentLab;
