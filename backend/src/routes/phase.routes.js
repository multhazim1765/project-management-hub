const express = require('express');
const router = express.Router();
const phaseController = require('../controllers/phase.controller');
const {
  authenticate,
  authorizeProjectAccess,
  authorizeProjectManage,
  validateObjectId,
} = require('../middleware');

// All routes require authentication
router.use(authenticate);

// ============ Project-level routes ============

// Create phase in project
router.post(
  '/projects/:projectId/phases',
  validateObjectId('projectId'),
  authorizeProjectManage,
  phaseController.createPhase
);

// Get all phases for project
router.get(
  '/projects/:projectId/phases',
  validateObjectId('projectId'),
  authorizeProjectAccess,
  phaseController.getPhases
);

// Reorder phases
router.put(
  '/projects/:projectId/phases/reorder',
  validateObjectId('projectId'),
  authorizeProjectManage,
  phaseController.reorderPhases
);

// ============ Phase-specific routes ============

// Get single phase
router.get(
  '/phases/:id',
  validateObjectId('id'),
  phaseController.getPhase
);

// Update phase
router.put(
  '/phases/:id',
  validateObjectId('id'),
  phaseController.updatePhase
);

// Delete phase
router.delete(
  '/phases/:id',
  validateObjectId('id'),
  phaseController.deletePhase
);

// Get phase progress
router.get(
  '/phases/:id/progress',
  validateObjectId('id'),
  phaseController.getPhaseProgress
);

// Duplicate phase
router.post(
  '/phases/:id/duplicate',
  validateObjectId('id'),
  phaseController.duplicatePhase
);

module.exports = router;
