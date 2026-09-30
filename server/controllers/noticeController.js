const Notice = require('../models/Notice');

// @desc    Get all active notices (sorted by pinned first, then newest)
// @route   GET /api/notices
// @access  Public
exports.getNotices = async (req, res) => {
  try {
    const { category, search, limit = 50, includeInactive } = req.query;

    const query = {};

    // Only admins can request inactive notices
    if (includeInactive !== 'true' || !req.user || req.user.role !== 'admin') {
      query.isActive = true;
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (search && search.trim()) {
      const sanitized = search.trim();
      query.$or = [
        { title: { $regex: sanitized, $options: 'i' } },
        { content: { $regex: sanitized, $options: 'i' } },
        { tags: { $in: [new RegExp(sanitized, 'i')] } },
      ];
    }

    const notices = await Notice.find(query)
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(parseInt(limit, 10))
      .populate('author', 'name email avatar role');

    // Count pinned and total active
    const totalActive = await Notice.countDocuments({ isActive: true });
    const pinnedCount = await Notice.countDocuments({ isActive: true, isPinned: true });

    res.json({
      success: true,
      count: notices.length,
      totalActive,
      pinnedCount,
      notices,
    });
  } catch (error) {
    console.error('getNotices error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error loading notices' });
  }
};

// @desc    Get single notice by ID
// @route   GET /api/notices/:id
// @access  Public
exports.getNoticeById = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id).populate('author', 'name email avatar role');

    if (!notice) {
      return res.status(404).json({ success: false, message: 'Notice not found' });
    }

    res.json({
      success: true,
      notice,
    });
  } catch (error) {
    console.error('getNoticeById error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error loading notice' });
  }
};

// @desc    Publish a new notice, routine, or instruction
// @route   POST /api/notices
// @access  Private/Admin
exports.createNotice = async (req, res) => {
  try {
    const {
      title,
      content,
      category = 'announcement',
      priority = 'normal',
      eventDate,
      targetAudience = 'all',
      isPinned = false,
      tags = [],
      link = '',
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Please provide both title and content for the notice' });
    }

    const notice = await Notice.create({
      title: title.trim(),
      content: content.trim(),
      category,
      priority,
      eventDate: eventDate ? new Date(eventDate) : null,
      targetAudience,
      author: req.user._id,
      authorName: req.user.name || 'Administrator',
      isPinned: Boolean(isPinned),
      isActive: true,
      tags: Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      link: link ? link.trim() : '',
    });

    res.status(201).json({
      success: true,
      message: 'Notice published successfully to the Notice Board',
      notice,
    });
  } catch (error) {
    console.error('createNotice error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create notice' });
  }
};

// @desc    Update an existing notice
// @route   PUT /api/notices/:id
// @access  Private/Admin
exports.updateNotice = async (req, res) => {
  try {
    const {
      title,
      content,
      category,
      priority,
      eventDate,
      targetAudience,
      isPinned,
      isActive,
      tags,
      link,
    } = req.body;

    const notice = await Notice.findById(req.params.id);
    if (!notice) {
      return res.status(404).json({ success: false, message: 'Notice not found' });
    }

    if (title !== undefined) notice.title = title.trim();
    if (content !== undefined) notice.content = content.trim();
    if (category !== undefined) notice.category = category;
    if (priority !== undefined) notice.priority = priority;
    if (eventDate !== undefined) notice.eventDate = eventDate ? new Date(eventDate) : null;
    if (targetAudience !== undefined) notice.targetAudience = targetAudience;
    if (isPinned !== undefined) notice.isPinned = Boolean(isPinned);
    if (isActive !== undefined) notice.isActive = Boolean(isActive);
    if (tags !== undefined) {
      notice.tags = Array.isArray(tags)
        ? tags
        : typeof tags === 'string'
        ? tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];
    }
    if (link !== undefined) notice.link = link.trim();

    await notice.save();

    res.json({
      success: true,
      message: 'Notice updated successfully',
      notice,
    });
  } catch (error) {
    console.error('updateNotice error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update notice' });
  }
};

// @desc    Delete a notice
// @route   DELETE /api/notices/:id
// @access  Private/Admin
exports.deleteNotice = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) {
      return res.status(404).json({ success: false, message: 'Notice not found' });
    }

    await notice.deleteOne();

    res.json({
      success: true,
      message: 'Notice deleted successfully',
      id: req.params.id,
    });
  } catch (error) {
    console.error('deleteNotice error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete notice' });
  }
};

// @desc    Toggle pin status of a notice
// @route   PATCH /api/notices/:id/pin
// @access  Private/Admin
exports.togglePinNotice = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) {
      return res.status(404).json({ success: false, message: 'Notice not found' });
    }

    notice.isPinned = !notice.isPinned;
    await notice.save();

    res.json({
      success: true,
      message: `Notice ${notice.isPinned ? 'pinned to top' : 'unpinned'}`,
      isPinned: notice.isPinned,
      notice,
    });
  } catch (error) {
    console.error('togglePinNotice error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to toggle pin' });
  }
};
