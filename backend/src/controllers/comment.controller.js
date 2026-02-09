const { Comment, Discussion, Task, Issue, Project } = require('../models');
const { notificationService, fileService } = require('../services');
const ApiResponse = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware');
const { getPagination } = require('../utils/helpers');

/**
 * @desc    Create comment
 * @route   POST /api/comments
 * @access  Private (Project Member)
 */
const createComment = asyncHandler(async (req, res) => {
  const { content, entityType, entityId, projectId, parentCommentId } = req.body;

  const comment = new Comment({
    content,
    entityType,
    entityId,
    projectId,
    userId: req.userId,
    parentCommentId,
  });

  await comment.save();

  await comment.populate([
    { path: 'userId', select: 'firstName lastName email avatar' },
    { path: 'attachments' },
  ]);

  // Get entity for notifications
  let entity;
  if (entityType === 'task') {
    entity = await Task.findById(entityId);
  } else if (entityType === 'discussion') {
    entity = await Discussion.findById(entityId);
    // Update discussion last activity
    await entity.updateActivity(req.userId);
  } else if (entityType === 'issue') {
    entity = await Issue.findById(entityId);
  }

  // Update comment count on entity
  if (entityType === 'task') {
    await Task.findByIdAndUpdate(entityId, { $inc: { commentCount: 1 } });
  }

  // Send notifications
  if (entity) {
    const project = await Project.findById(projectId);
    await notificationService.notifyComment(comment, req.user, entityType, entity, project);
  }

  ApiResponse.created(res, { comment }, 'Comment added');
});

/**
 * @desc    Get comments for entity
 * @route   GET /api/comments
 * @access  Private (Project Member)
 */
const getComments = asyncHandler(async (req, res) => {
  const { entityType, entityId, page = 1, limit = 20 } = req.query;

  const comments = await Comment.getWithReplies(entityType, entityId, {
    page: parseInt(page),
    limit: parseInt(limit),
  });

  const total = await Comment.countDocuments({
    entityType,
    entityId,
    parentCommentId: { $exists: false },
    isDeleted: false,
  });

  const pagination = getPagination(page, limit, total);

  ApiResponse.paginated(res, { comments }, pagination);
});

/**
 * @desc    Update comment
 * @route   PUT /api/comments/:id
 * @access  Private (Comment Owner)
 */
const updateComment = asyncHandler(async (req, res) => {
  const { content } = req.body;

  const comment = await Comment.findOne({
    _id: req.params.id,
    userId: req.userId,
    isDeleted: false,
  });

  if (!comment) {
    return ApiResponse.notFound(res, 'Comment not found');
  }

  comment.content = content;
  await comment.save();

  await comment.populate([
    { path: 'userId', select: 'firstName lastName email avatar' },
    { path: 'attachments' },
  ]);

  ApiResponse.success(res, { comment }, 'Comment updated');
});

/**
 * @desc    Delete comment
 * @route   DELETE /api/comments/:id
 * @access  Private (Comment Owner)
 */
const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findOne({
    _id: req.params.id,
    userId: req.userId,
    isDeleted: false,
  });

  if (!comment) {
    return ApiResponse.notFound(res, 'Comment not found');
  }

  await comment.softDelete();

  // Update comment count on entity
  if (comment.entityType === 'task') {
    await Task.findByIdAndUpdate(comment.entityId, { $inc: { commentCount: -1 } });
  }

  ApiResponse.success(res, null, 'Comment deleted');
});

/**
 * @desc    Add reaction to comment
 * @route   POST /api/comments/:id/reactions
 * @access  Private (Project Member)
 */
const addReaction = asyncHandler(async (req, res) => {
  const { emoji } = req.body;

  const comment = await Comment.findById(req.params.id);
  if (!comment || comment.isDeleted) {
    return ApiResponse.notFound(res, 'Comment not found');
  }

  await comment.addReaction(req.userId, emoji);

  ApiResponse.success(res, { reactions: comment.reactions }, 'Reaction added');
});

/**
 * @desc    Remove reaction from comment
 * @route   DELETE /api/comments/:id/reactions/:emoji
 * @access  Private (Project Member)
 */
const removeReaction = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment || comment.isDeleted) {
    return ApiResponse.notFound(res, 'Comment not found');
  }

  await comment.removeReaction(req.userId, req.params.emoji);

  ApiResponse.success(res, { reactions: comment.reactions }, 'Reaction removed');
});

/**
 * @desc    Create discussion
 * @route   POST /api/projects/:projectId/discussions
 * @access  Private (Project Member)
 */
const createDiscussion = asyncHandler(async (req, res) => {
  const { title, content, category, tags } = req.body;

  const discussion = new Discussion({
    title,
    content,
    category,
    tags,
    projectId: req.params.projectId,
    createdBy: req.userId,
  });

  await discussion.save();

  await discussion.populate('createdBy', 'firstName lastName email avatar');

  ApiResponse.created(res, { discussion }, 'Discussion created');
});

/**
 * @desc    Get discussions for project
 * @route   GET /api/projects/:projectId/discussions
 * @access  Private (Project Member)
 */
const getDiscussions = asyncHandler(async (req, res) => {
  const { category, search, page = 1, limit = 20 } = req.query;

  const discussions = await Discussion.getForProject(req.params.projectId, {
    category,
    search,
    page: parseInt(page),
    limit: parseInt(limit),
  });

  const total = await Discussion.countDocuments({ projectId: req.params.projectId });
  const pagination = getPagination(page, limit, total);

  ApiResponse.paginated(res, { discussions }, pagination);
});

/**
 * @desc    Get single discussion
 * @route   GET /api/discussions/:id
 * @access  Private (Project Member)
 */
const getDiscussion = asyncHandler(async (req, res) => {
  const discussion = await Discussion.findById(req.params.id)
    .populate('createdBy', 'firstName lastName email avatar')
    .populate('lastActivityBy', 'firstName lastName')
    .populate('participants', 'firstName lastName avatar')
    .populate('attachments');

  if (!discussion) {
    return ApiResponse.notFound(res, 'Discussion not found');
  }

  // Increment view count
  await discussion.incrementViews();

  ApiResponse.success(res, { discussion });
});

/**
 * @desc    Update discussion
 * @route   PUT /api/discussions/:id
 * @access  Private (Discussion Owner or Admin)
 */
const updateDiscussion = asyncHandler(async (req, res) => {
  const { title, content, category, isPinned, isLocked, tags } = req.body;

  const discussion = await Discussion.findById(req.params.id);
  if (!discussion) {
    return ApiResponse.notFound(res, 'Discussion not found');
  }

  if (title) discussion.title = title;
  if (content) discussion.content = content;
  if (category) discussion.category = category;
  if (isPinned !== undefined) discussion.isPinned = isPinned;
  if (isLocked !== undefined) discussion.isLocked = isLocked;
  if (tags) discussion.tags = tags;

  await discussion.save();

  await discussion.populate('createdBy', 'firstName lastName email avatar');

  ApiResponse.success(res, { discussion }, 'Discussion updated');
});

/**
 * @desc    Delete discussion
 * @route   DELETE /api/discussions/:id
 * @access  Private (Discussion Owner or Admin)
 */
const deleteDiscussion = asyncHandler(async (req, res) => {
  const discussion = await Discussion.findById(req.params.id);
  if (!discussion) {
    return ApiResponse.notFound(res, 'Discussion not found');
  }

  // Delete all comments for this discussion
  await Comment.updateMany(
    { entityType: 'discussion', entityId: discussion._id },
    { isDeleted: true, deletedAt: new Date() }
  );

  await discussion.deleteOne();

  ApiResponse.success(res, null, 'Discussion deleted');
});

module.exports = {
  createComment,
  getComments,
  updateComment,
  deleteComment,
  addReaction,
  removeReaction,
  createDiscussion,
  getDiscussions,
  getDiscussion,
  updateDiscussion,
  deleteDiscussion,
};
