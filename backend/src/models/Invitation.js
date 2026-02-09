const mongoose = require('mongoose');
const { ROLES, INVITATION_STATUS } = require('../config/constants');
const { generateToken } = require('../utils/helpers');

const invitationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.TEAM_MEMBER,
    },
    projectIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
      },
    ],
    token: {
      type: String,
      unique: true,
      required: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(INVITATION_STATUS),
      default: INVITATION_STATUS.PENDING,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    acceptedAt: Date,
    message: {
      type: String,
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
invitationSchema.index({ email: 1, organizationId: 1 });
invitationSchema.index({ token: 1 });
invitationSchema.index({ status: 1 });
invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save middleware to generate token
invitationSchema.pre('save', function (next) {
  if (this.isNew) {
    this.token = generateToken(32);
    // Set expiry to 7 days from now
    this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  next();
});

// Method to check if invitation is valid
invitationSchema.methods.isValid = function () {
  return (
    this.status === INVITATION_STATUS.PENDING &&
    this.expiresAt > new Date()
  );
};

// Method to accept invitation
invitationSchema.methods.accept = async function () {
  this.status = INVITATION_STATUS.ACCEPTED;
  this.acceptedAt = new Date();
  return this.save();
};

// Method to revoke invitation
invitationSchema.methods.revoke = async function () {
  this.status = INVITATION_STATUS.REVOKED;
  return this.save();
};

// Static method to find valid invitation by token
invitationSchema.statics.findValidByToken = async function (token) {
  const invitation = await this.findOne({
    token,
    status: INVITATION_STATUS.PENDING,
    expiresAt: { $gt: new Date() },
  }).populate('organizationId invitedBy');

  return invitation;
};

// Static method to find pending invitations for an organization
invitationSchema.statics.findPendingByOrganization = async function (organizationId) {
  return this.find({
    organizationId,
    status: INVITATION_STATUS.PENDING,
    expiresAt: { $gt: new Date() },
  })
    .populate('invitedBy', 'firstName lastName email')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('Invitation', invitationSchema);
