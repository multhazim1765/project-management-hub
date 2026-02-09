const mongoose = require('mongoose');

const billingInfoSchema = new mongoose.Schema(
  {
    plan: {
      type: String,
      enum: ['free', 'starter', 'professional', 'enterprise'],
      default: 'free',
    },
    billingEmail: String,
    billingAddress: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String,
    },
    paymentMethod: {
      type: String,
      last4: String,
      expiryMonth: Number,
      expiryYear: Number,
    },
    subscriptionId: String,
    subscriptionStatus: {
      type: String,
      enum: ['active', 'canceled', 'past_due', 'trialing'],
      default: 'active',
    },
    currentPeriodEnd: Date,
    maxUsers: {
      type: Number,
      default: 5,
    },
    maxProjects: {
      type: Number,
      default: 3,
    },
    maxStorage: {
      type: Number,
      default: 1024 * 1024 * 1024, // 1GB in bytes
    },
  },
  { _id: false }
);

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      maxlength: [100, 'Organization name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    logo: {
      type: String,
      default: null,
    },
    website: {
      type: String,
      trim: true,
    },
    industry: {
      type: String,
      trim: true,
    },
    size: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-500', '500+'],
    },
    billingInfo: {
      type: billingInfoSchema,
      default: () => ({}),
    },
    settings: {
      defaultTimezone: {
        type: String,
        default: 'UTC',
      },
      dateFormat: {
        type: String,
        default: 'YYYY-MM-DD',
      },
      timeFormat: {
        type: String,
        enum: ['12h', '24h'],
        default: '24h',
      },
      weekStartsOn: {
        type: Number,
        min: 0,
        max: 6,
        default: 1, // Monday
      },
      defaultProjectStatus: {
        type: String,
        default: 'active',
      },
      allowClientAccess: {
        type: Boolean,
        default: true,
      },
    },
    storageUsed: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
organizationSchema.index({ slug: 1 });
organizationSchema.index({ owner: 1 });
organizationSchema.index({ isActive: 1 });

// Virtual for member count
organizationSchema.virtual('memberCount', {
  ref: 'User',
  localField: '_id',
  foreignField: 'organizationId',
  count: true,
});

// Virtual for project count
organizationSchema.virtual('projectCount', {
  ref: 'Project',
  localField: '_id',
  foreignField: 'organizationId',
  count: true,
});

// Pre-save middleware to generate slug
organizationSchema.pre('save', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

// Method to check if storage limit is reached
organizationSchema.methods.hasStorageSpace = function (fileSize) {
  return this.storageUsed + fileSize <= this.billingInfo.maxStorage;
};

// Method to check if user limit is reached
organizationSchema.methods.canAddUser = async function () {
  const User = mongoose.model('User');
  const userCount = await User.countDocuments({ organizationId: this._id });
  return userCount < this.billingInfo.maxUsers;
};

// Method to check if project limit is reached
organizationSchema.methods.canAddProject = async function () {
  const Project = mongoose.model('Project');
  const projectCount = await Project.countDocuments({
    organizationId: this._id,
    status: { $ne: 'archived' },
  });
  return projectCount < this.billingInfo.maxProjects;
};

module.exports = mongoose.model('Organization', organizationSchema);
