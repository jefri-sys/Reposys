import { useState } from 'react';
import api from '../services/api';

export const useFileConverter = () => {
  const [isConverting, setIsConverting] = useState(false);
  const [conversionError, setConversionError] = useState(null);

  const convertFile = async (file) => {
    setIsConverting(true);
    setConversionError(null);

    try {
      // Step 1 — detect file type:
      const isPdf = file.type === 'application/pdf' ||
                    file.name.toLowerCase().endsWith('.pdf');

      const isDocx = file.type ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        || file.name.toLowerCase().endsWith('.docx');

      if (isPdf) {
        return { file, isConverted: false };
      }

      if (!isDocx) {
        setConversionError('Only PDF and .docx files are supported');
        return null;
      }

      // Step 2 — set converting state (already handled at top of function)

      // Step 3 — send .docx to backend conversion endpoint:
      const formData = new FormData();
      formData.append('file', file, file.name);

      const response = await api.post('/convert/docx', formData, {
        responseType: 'blob',
      });

      // Response is the PDF binary (response.data is a Blob)
      const pdfBlob = response.data;

      // Check converted file size against upload limit
      const uploadLimitBytes = 25 * 1024 * 1024; // 25MB actual limit
      const sizeWarning = pdfBlob.size > uploadLimitBytes;
      const sizeMB = (pdfBlob.size / (1024 * 1024)).toFixed(1);

      return {
        file: pdfBlob,
        isConverted: true,
        originalName: file.name,
        sizeWarning,
        sizeMB
      };

    } catch (err) {
      let message = 'Conversion failed. Please upload a PDF instead.';

      if (err.response && err.response.data) {
        try {
          if (err.response.data instanceof Blob) {
            const errorText = await err.response.data.text();
            const parsed = JSON.parse(errorText);
            message = parsed.message || message;
          } else if (typeof err.response.data === 'object') {
            message = err.response.data.message || message;
          }
        } catch (e) {
          // fallback to default
        }
      } else if (err.message) {
        message = err.message;
      }

      setConversionError(message);
      return null;
    } finally {
      setIsConverting(false);
    }
  };

  const reset = () => {
    setIsConverting(false);
    setConversionError(null);
  };

  return { convertFile, isConverting, conversionError, reset };
};

export default useFileConverter;
