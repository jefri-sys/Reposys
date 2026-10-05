exports.uploadMedia = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const mediaType = req.file.mimetype === 'application/pdf' ? 'pdf' : 'image';
  
  res.status(200).json({
    url: req.file.path,
    mediaType
  });
};
