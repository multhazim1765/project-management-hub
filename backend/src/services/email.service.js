const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  /**
   * Initialize email transporter
   */
  initialize() {
    if (this.initialized) return;

    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_PORT === '465',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      this.initialized = true;
      logger.info('Email service initialized');
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
    }
  }

  /**
   * Send email
   */
  async sendEmail(to, subject, html, text = null) {
    if (!this.initialized) {
      this.initialize();
    }

    if (!this.transporter) {
      logger.warn('Email transporter not configured, skipping email');
      return;
    }

    try {
      const mailOptions = {
        from: `"Project Management" <${process.env.EMAIL_FROM}>`,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent: ${info.messageId}`);
      return info;
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(email, token) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 6px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Verify Your Email</h1>
          <p>Thank you for signing up! Please click the button below to verify your email address.</p>
          <p style="margin: 30px 0;">
            <a href="${verificationUrl}" class="button">Verify Email</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <div class="footer">
            <p>If you didn't create an account, you can safely ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(email, 'Verify Your Email - Project Management', html);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email, token) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 6px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Reset Your Password</h1>
          <p>You requested to reset your password. Click the button below to set a new password.</p>
          <p style="margin: 30px 0;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all;">${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <div class="footer">
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(email, 'Reset Your Password - Project Management', html);
  }

  /**
   * Send invitation email
   */
  async sendInvitationEmail(email, token, inviterName, organizationName) {
    const inviteUrl = `${process.env.FRONTEND_URL}/accept-invitation?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 6px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>You're Invited!</h1>
          <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on Project Management.</p>
          <p style="margin: 30px 0;">
            <a href="${inviteUrl}" class="button">Accept Invitation</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all;">${inviteUrl}</p>
          <p>This invitation will expire in 7 days.</p>
          <div class="footer">
            <p>If you don't want to join, you can safely ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(email, `You're invited to join ${organizationName}`, html);
  }

  /**
   * Send task assignment notification
   */
  async sendTaskAssignmentEmail(email, task, assignerName, projectName) {
    const taskUrl = `${process.env.FRONTEND_URL}/projects/${task.projectId}/tasks/${task._id}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .task-card { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 6px; }
          .priority { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
          .priority-high { background: #FEE2E2; color: #DC2626; }
          .priority-medium { background: #FEF3C7; color: #D97706; }
          .priority-low { background: #D1FAE5; color: #059669; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>New Task Assigned</h1>
          <p><strong>${assignerName}</strong> assigned you a task in <strong>${projectName}</strong>.</p>
          <div class="task-card">
            <h2 style="margin-top: 0;">${task.title}</h2>
            ${task.description ? `<p>${task.description.substring(0, 200)}${task.description.length > 200 ? '...' : ''}</p>` : ''}
            <p>
              <span class="priority priority-${task.priority}">${task.priority.toUpperCase()}</span>
              ${task.dueDate ? `<span style="margin-left: 10px;">Due: ${new Date(task.dueDate).toLocaleDateString()}</span>` : ''}
            </p>
          </div>
          <p style="margin: 30px 0;">
            <a href="${taskUrl}" class="button">View Task</a>
          </p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(email, `New Task: ${task.title}`, html);
  }

  /**
   * Send deadline reminder email
   */
  async sendDeadlineReminderEmail(email, task, projectName, daysUntilDue) {
    const taskUrl = `${process.env.FRONTEND_URL}/projects/${task.projectId}/tasks/${task._id}`;
    const urgency = daysUntilDue <= 1 ? 'urgent' : 'upcoming';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .alert { padding: 15px; border-radius: 8px; margin: 20px 0; }
          .alert-urgent { background: #FEE2E2; border-left: 4px solid #DC2626; }
          .alert-upcoming { background: #FEF3C7; border-left: 4px solid #D97706; }
          .button { display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Task Deadline Reminder</h1>
          <div class="alert alert-${urgency}">
            <p style="margin: 0;">
              ${daysUntilDue === 0 ? 'This task is due today!' :
                daysUntilDue === 1 ? 'This task is due tomorrow!' :
                `This task is due in ${daysUntilDue} days.`}
            </p>
          </div>
          <h2>${task.title}</h2>
          <p><strong>Project:</strong> ${projectName}</p>
          <p><strong>Due Date:</strong> ${new Date(task.dueDate).toLocaleDateString()}</p>
          <p style="margin: 30px 0;">
            <a href="${taskUrl}" class="button">View Task</a>
          </p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(email, `Reminder: ${task.title} is due ${daysUntilDue === 0 ? 'today' : 'soon'}`, html);
  }

  /**
   * Send mention notification email
   */
  async sendMentionEmail(email, mentionerName, entityType, entityTitle, content, link) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .quote { background: #f8f9fa; border-left: 4px solid #3B82F6; padding: 15px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>You Were Mentioned</h1>
          <p><strong>${mentionerName}</strong> mentioned you in a ${entityType}:</p>
          <p><strong>${entityTitle}</strong></p>
          <div class="quote">
            ${content.substring(0, 300)}${content.length > 300 ? '...' : ''}
          </div>
          <p style="margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}${link}" class="button">View ${entityType}</a>
          </p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(email, `${mentionerName} mentioned you`, html);
  }
}

module.exports = new EmailService();
