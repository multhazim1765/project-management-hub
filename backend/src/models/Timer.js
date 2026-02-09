const mongoose = require('mongoose');
const { TIMER_STATUS } = require('../config/constants');

const timerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
    },
    status: {
      type: String,
      enum: Object.values(TIMER_STATUS),
      default: TIMER_STATUS.RUNNING,
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    billable: {
      type: Boolean,
      default: true,
    },
    pausedDuration: {
      type: Number,
      default: 0, // Total paused time in milliseconds
    },
    pausedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
timerSchema.index({ userId: 1, status: 1 });
timerSchema.index({ projectId: 1 });
timerSchema.index({ taskId: 1 });

// Virtual for elapsed time in hours
timerSchema.virtual('elapsedHours').get(function () {
  if (!this.startTime) return 0;

  let endTime;
  if (this.status === TIMER_STATUS.STOPPED && this.endTime) {
    endTime = this.endTime;
  } else if (this.status === TIMER_STATUS.PAUSED && this.pausedAt) {
    endTime = this.pausedAt;
  } else {
    endTime = new Date();
  }

  const elapsedMs = endTime - this.startTime - this.pausedDuration;
  return Math.max(0, elapsedMs / (1000 * 60 * 60)); // Convert to hours
});

// Method to pause timer
timerSchema.methods.pause = async function () {
  if (this.status !== TIMER_STATUS.RUNNING) {
    throw new Error('Timer is not running');
  }

  this.status = TIMER_STATUS.PAUSED;
  this.pausedAt = new Date();
  return this.save();
};

// Method to resume timer
timerSchema.methods.resume = async function () {
  if (this.status !== TIMER_STATUS.PAUSED) {
    throw new Error('Timer is not paused');
  }

  // Add paused duration
  const pausedTime = new Date() - this.pausedAt;
  this.pausedDuration += pausedTime;
  this.pausedAt = undefined;
  this.status = TIMER_STATUS.RUNNING;

  return this.save();
};

// Method to stop timer and create time entry
timerSchema.methods.stop = async function () {
  if (this.status === TIMER_STATUS.STOPPED) {
    throw new Error('Timer is already stopped');
  }

  // If paused, add remaining paused time
  if (this.status === TIMER_STATUS.PAUSED && this.pausedAt) {
    const pausedTime = new Date() - this.pausedAt;
    this.pausedDuration += pausedTime;
  }

  this.status = TIMER_STATUS.STOPPED;
  this.endTime = new Date();

  await this.save();

  // Create time entry
  const TimeEntry = mongoose.model('TimeEntry');
  const hours = this.elapsedHours;

  if (hours >= 0.01) {
    // Minimum 0.01 hours (36 seconds)
    const timeEntry = new TimeEntry({
      userId: this.userId,
      taskId: this.taskId,
      projectId: this.projectId,
      date: this.startTime,
      hours: Math.round(hours * 100) / 100, // Round to 2 decimal places
      description: this.description,
      billable: this.billable,
      source: 'timer',
      timerId: this._id,
    });

    await timeEntry.save();
    return { timer: this, timeEntry };
  }

  return { timer: this, timeEntry: null };
};

// Static method to get active timer for user
timerSchema.statics.getActiveTimer = async function (userId) {
  return this.findOne({
    userId,
    status: { $in: [TIMER_STATUS.RUNNING, TIMER_STATUS.PAUSED] },
  })
    .populate('taskId', 'title taskNumber')
    .populate('projectId', 'name key');
};

// Static method to stop all running timers for user
timerSchema.statics.stopAllForUser = async function (userId) {
  const timers = await this.find({
    userId,
    status: { $in: [TIMER_STATUS.RUNNING, TIMER_STATUS.PAUSED] },
  });

  const results = [];
  for (const timer of timers) {
    const result = await timer.stop();
    results.push(result);
  }

  return results;
};

module.exports = mongoose.model('Timer', timerSchema);
