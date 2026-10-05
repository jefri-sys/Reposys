import api from '../services/api';

export const resolveUploadedDocumentUrl = async (document) => {
  if (!document) {
    return '';
  }

  if (!document.documentId) {
    return document.cloudinaryUrl || '';
  }

  const response = await api.get(`/documents/${document.documentId}/url`);
  return response.data?.url || '';
};

export const openUploadedDocumentInNewTab = async (document) => {
  const url = await resolveUploadedDocumentUrl(document);

  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return url;
};
