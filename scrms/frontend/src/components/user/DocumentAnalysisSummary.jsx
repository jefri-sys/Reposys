const ISSUE_LABELS = {
  TOO_DARK: 'Too dark',
  TOO_LIGHT: 'Too light',
  LOW_RESOLUTION: 'Low resolution',
};

const formatPageList = (pages) => {
  if (!pages.length) {
    return 'None detected';
  }

  const label = pages.length === 1 ? 'Page' : 'Pages';
  return `${label} ${pages.join(', ')}`;
};

const formatQualityIssues = (issues) => {
  if (!issues.length) {
    return 'No print-quality issues detected';
  }

  return issues
    .map((issue) => `Page ${issue.page}: ${ISSUE_LABELS[issue.issue] || issue.issue}`)
    .join(', ');
};

const DocumentAnalysisSummary = ({ document, compact = false }) => {
  const blankPages = Array.isArray(document?.blankPages) ? document.blankPages : [];
  const qualityIssues = Array.isArray(document?.qualityIssues) ? document.qualityIssues : [];
  const colourHeavyPages = Array.isArray(document?.colourHeavyPages) ? document.colourHeavyPages : [];
  const fileTypeLabel = document?.fileType?.toUpperCase() || 'Unknown';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
          {fileTypeLabel}
        </span>
        <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
          {document?.pageCount || 0} page{document?.pageCount === 1 ? '' : 's'}
        </span>
        {blankPages.length ? (
          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
            {blankPages.length} blank
          </span>
        ) : null}
        {qualityIssues.length ? (
          <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">
            {qualityIssues.length} quality flag{qualityIssues.length === 1 ? '' : 's'}
          </span>
        ) : null}
        {colourHeavyPages.length ? (
          <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
            {colourHeavyPages.length} colour-heavy
          </span>
        ) : null}
      </div>

      <div className={compact ? 'space-y-2 text-sm text-slate-600' : 'grid gap-3 md:grid-cols-3'}>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Blank Pages</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{formatPageList(blankPages)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Quality Issues</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{formatQualityIssues(qualityIssues)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Colour-Heavy Pages</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{formatPageList(colourHeavyPages)}</p>
        </div>
      </div>
    </div>
  );
};

export default DocumentAnalysisSummary;
