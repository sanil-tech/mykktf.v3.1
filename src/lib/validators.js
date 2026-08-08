export const validateAttachment = (file) => {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'File size exceeds 5MB limit.' };
  }

  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (!allowedMimeTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: 'Invalid file type. Allowed: JPEG, PNG, WebP, PDF, DOC, DOCX.' 
    };
  }

  return { valid: true };
};
