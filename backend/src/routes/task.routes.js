const express = require('express');
const router = express.Router();
const { taskController } = require('../controllers');
const { authenticate, validateObjectId } = require('../middleware');

// All routes require authentication
router.use(authenticate);

// My tasks & overdue
router.get('/my-tasks', taskController.getMyTasks);
router.get('/overdue', taskController.getOverdueTasks);

// Single task operations
router.get('/:id', validateObjectId('id'), taskController.getTask);
router.put('/:id', validateObjectId('id'), taskController.updateTask);
router.delete('/:id', validateObjectId('id'), taskController.deleteTask);

// Task actions
router.post('/:id/assign', validateObjectId('id'), taskController.assignTask);
router.put('/:id/status', validateObjectId('id'), taskController.updateStatus);
router.put('/:id/labels', validateObjectId('id'), taskController.updateLabels);
router.post('/:id/watch', validateObjectId('id'), taskController.watchTask);
router.delete('/:id/watch', validateObjectId('id'), taskController.unwatchTask);

// Dependencies
router.post('/:id/dependencies', validateObjectId('id'), taskController.addDependency);
router.delete('/:id/dependencies/:dependsOnTaskId', validateObjectId('id'), taskController.removeDependency);

// Subtasks
router.get('/:id/subtasks', validateObjectId('id'), taskController.getSubtasks);
router.post('/:id/subtasks', validateObjectId('id'), taskController.createSubtask);
router.put('/:id/subtasks/reorder', validateObjectId('id'), taskController.reorderSubtasks);

module.exports = router;
