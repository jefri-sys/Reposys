const Inquiry = require('../models/Inquiry');

const VALID_INQUIRY_STATUSES = new Set(['Pending', 'Read', 'Responded', 'Ignored']);

/**
 * Submit a new contact inquiry from the homepage
 */
exports.submitInquiry = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const inquiry = await Inquiry.create({
      name,
      email,
      subject,
      message
    });

    res.status(201).json({
      message: 'Inquiry submitted successfully. We will get back to you soon.',
      inquiry
    });
  } catch (error) {
    console.error('Submit inquiry error:', error);
    res.status(500).json({ message: 'Failed to submit inquiry. Please try again later.' });
  }
};

/**
 * Get all inquiries (Admin only)
 */
exports.getInquiries = async (req, res) => {
  try {
    const inquiries = await Inquiry.find()
      .sort({ createdAt: -1 })
      .populate('respondedBy', 'name email');

    res.status(200).json({ success: true, inquiries });
  } catch (error) {
    console.error('Get inquiries error:', error);
    res.status(500).json({ message: 'Failed to fetch inquiries.' });
  }
};

/**
 * Update inquiry status (Admin only)
 */
exports.updateInquiryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!VALID_INQUIRY_STATUSES.has(status)) {
      return res.status(400).json({ message: 'Invalid inquiry status.' });
    }

    const inquiry = await Inquiry.findById(id);
    if (!inquiry) {
      return res.status(404).json({ message: 'Inquiry not found.' });
    }

    inquiry.status = status;
    await inquiry.save();

    res.status(200).json({
      success: true,
      message: 'Inquiry status updated successfully.',
      inquiry
    });
  } catch (error) {
    console.error('Update inquiry status error:', error);
    res.status(500).json({ message: 'Failed to update inquiry status.' });
  }
};

/**
 * Respond to an inquiry (Admin only)
 */
exports.respondToInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const { response } = req.body;

    if (!response) {
      return res.status(400).json({ message: 'Response text is required.' });
    }

    const inquiry = await Inquiry.findById(id);
    if (!inquiry) {
      return res.status(404).json({ message: 'Inquiry not found.' });
    }

    inquiry.response = response;
    inquiry.status = 'Responded';
    inquiry.respondedAt = new Date();
    inquiry.respondedBy = req.user._id;

    await inquiry.save();

    res.status(200).json({
      message: 'Response saved successfully.',
      inquiry
    });
  } catch (error) {
    console.error('Respond to inquiry error:', error);
    res.status(500).json({ message: 'Failed to save response.' });
  }
};

/**
 * Delete an inquiry (Admin only)
 */
exports.deleteInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    await Inquiry.findByIdAndDelete(id);
    res.status(200).json({ message: 'Inquiry deleted successfully.' });
  } catch (error) {
    console.error('Delete inquiry error:', error);
    res.status(500).json({ message: 'Failed to delete inquiry.' });
  }
};
