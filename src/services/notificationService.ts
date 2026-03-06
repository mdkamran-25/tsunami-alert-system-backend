import nodemailer from 'nodemailer';
import { childLogger } from '../utils/logger.js';
import prisma from '../lib/prisma.js';

const log = childLogger('notifications');

interface EmailConfig {
  service?: string;
  host?: string;
  port?: number;
  secure?: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// Email transporter configuration
let transporter: nodemailer.Transporter | null = null;

/**
 * Initialize email transporter
 */
export function initializeEmailService(): boolean {
  try {
    const emailConfig: EmailConfig = {
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASSWORD || '',
      },
    };

    // Use Gmail as default
    if (process.env.EMAIL_SERVICE === 'gmail' || !process.env.EMAIL_HOST) {
      emailConfig.service = 'gmail';
      log.info('📧 Email service configured with Gmail');
    } else {
      // Custom SMTP server
      emailConfig.host = process.env.EMAIL_HOST;
      emailConfig.port = parseInt(process.env.EMAIL_PORT || '587', 10);
      emailConfig.secure = process.env.EMAIL_SECURE === 'true';
      log.info(`📧 Email service configured with ${emailConfig.host}`);
    }

    // Validate credentials
    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      log.warn('⚠️ Email credentials not configured - notifications disabled');
      return false;
    }

    transporter = nodemailer.createTransport(emailConfig);

    // Test connection
    transporter.verify((error: Error | null, success: boolean) => {
      if (error) {
        log.error('❌ Email service verification failed:', error);
      } else {
        log.info('✅ Email service verified and ready');
      }
    });

    return true;
  } catch (error) {
    log.error('Failed to initialize email service:', error);
    return false;
  }
}

/**
 * Send alert email
 */
export async function sendAlertEmail(
  email: string,
  alert: {
    id: string;
    status: string;
    level: string;
    message: string;
    region: string;
    createdAt: Date;
  },
): Promise<boolean> {
  try {
    if (!transporter) {
      log.warn('Email transporter not initialized');
      return false;
    }

    const severity = getSeverityColor(alert.level);
    const dashboardUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: `🚨 TSUNAMI ALERT [${alert.level}] - ${alert.region}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                border: 1px solid #ddd;
                border-radius: 8px;
                overflow: hidden;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                text-align: center;
              }
              .header h1 {
                margin: 0;
                font-size: 24px;
              }
              .severity {
                display: inline-block;
                padding: 8px 16px;
                border-radius: 4px;
                font-weight: bold;
                margin-top: 10px;
              }
              .severity.critical {
                background-color: #ff4757;
              }
              .severity.medium {
                background-color: #ffa502;
              }
              .severity.low {
                background-color: #ffb347;
              }
              .content {
                padding: 30px;
              }
              .alert-details {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 6px;
                margin: 20px 0;
              }
              .detail-row {
                display: flex;
                justify-content: space-between;
                padding: 10px 0;
                border-bottom: 1px solid #e0e0e0;
              }
              .detail-row:last-child {
                border-bottom: none;
              }
              .detail-label {
                font-weight: bold;
                color: #666;
              }
              .detail-value {
                color: #333;
              }
              .action-button {
                display: inline-block;
                background-color: #667eea;
                color: white;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 4px;
                margin-top: 20px;
                font-weight: bold;
              }
              .action-button:hover {
                background-color: #5568d3;
              }
              .footer {
                background-color: #f8f9fa;
                padding: 20px;
                text-align: center;
                font-size: 12px;
                color: #999;
                border-top: 1px solid #ddd;
              }
              .warning-box {
                background-color: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🌊 TSUNAMI ALERT SYSTEM</h1>
                <div class="severity ${alert.level.toLowerCase()}">
                  ${alert.level} ALERT
                </div>
              </div>

              <div class="content">
                <p>A new tsunami alert has been generated by our monitoring system.</p>

                <div class="alert-details">
                  <div class="detail-row">
                    <span class="detail-label">Region:</span>
                    <span class="detail-value">${alert.region}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Alert Level:</span>
                    <span class="detail-value">${alert.level}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value">${alert.status}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Time:</span>
                    <span class="detail-value">${alert.createdAt.toLocaleString()}</span>
                  </div>
                </div>

                <div class="warning-box">
                  <strong>Alert Message:</strong>
                  <p>${alert.message}</p>
                </div>

                <p><strong>Recommended Actions:</strong></p>
                <ul>
                  <li>Check the alert dashboard for detailed information</li>
                  <li>Monitor the situation closely</li>
                  <li>Follow local emergency services guidance</li>
                  <li>Prepare evacuation plans if in affected areas</li>
                </ul>

                <center>
                  <a href="${dashboardUrl}/alert-management" class="action-button">
                    View Full Alert Details
                  </a>
                </center>
              </div>

              <div class="footer">
                <p>This is an automated alert from the Tsunami Alert System.</p>
                <p>Do not reply to this email. Visit the dashboard for more information.</p>
                <p>&copy; 2025 Tsunami Alert System. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
TSUNAMI ALERT [${alert.level}]
Region: ${alert.region}
Status: ${alert.status}
Time: ${alert.createdAt.toLocaleString()}

Message: ${alert.message}

View full alert details at: ${dashboardUrl}/alert-management

---
This is an automated alert from the Tsunami Alert System.
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    log.info(`✅ Alert email sent to ${email} (Message ID: ${info.messageId})`);
    return true;
  } catch (error) {
    log.error(`❌ Failed to send alert email to ${email}:`, error);
    return false;
  }
}

/**
 * Send emails to all subscribed users for a region
 */
export async function notifySubscribedUsers(alert: {
  id: string;
  status: string;
  level: string;
  message: string;
  region: string;
  createdAt: Date;
}): Promise<number> {
  try {
    if (!transporter) {
      log.warn('Email transporter not initialized - skipping notifications');
      return 0;
    }

    // Get users monitoring this region
    const users = await prisma.userPreferences.findMany({
      where: {
        monitoredRegions: {
          hasSome: [alert.region],
        },
        user: {
          isActive: true,
        },
      },
      include: {
        user: true,
      },
    });

    if (users.length === 0) {
      log.info(`No users subscribed to ${alert.region}`);
      return 0;
    }

    let successCount = 0;

    // Send emails to subscribed users
    for (const userPref of users) {
      const emailNotificationsEnabled = userPref.emailNotifications !== false;

      if (emailNotificationsEnabled && userPref.user.email) {
        const sent = await sendAlertEmail(userPref.user.email, alert);
        if (sent) {
          successCount++;
        }
      }
    }

    log.info(`📧 Sent alert notifications to ${successCount} users for region: ${alert.region}`);
    return successCount;
  } catch (error) {
    log.error('Failed to notify users:', error);
    return 0;
  }
}

/**
 * Get color/severity for email formatting
 */
function getSeverityColor(level: string): string {
  switch (level.toUpperCase()) {
    case 'CRITICAL':
      return 'critical';
    case 'MEDIUM':
      return 'medium';
    case 'LOW':
      return 'low';
    default:
      return 'low';
  }
}

/**
 * Send test email to verify configuration
 */
export async function sendTestEmail(email: string): Promise<boolean> {
  try {
    if (!transporter) {
      log.warn('Email transporter not initialized');
      return false;
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: '✅ Tsunami Alert System - Test Email',
      html: `
        <h2>✅ Email Configuration Successful</h2>
        <p>This is a test email from the Tsunami Alert System.</p>
        <p>Email notifications are properly configured and ready to send alerts.</p>
        <p>You will receive emails when alerts are generated for your monitored regions.</p>
      `,
      text: 'This is a test email from the Tsunami Alert System. Email notifications are working correctly.',
    };

    const info = await transporter.sendMail(mailOptions);
    log.info(`✅ Test email sent (Message ID: ${info.messageId})`);
    return true;
  } catch (error) {
    log.error('Failed to send test email:', error);
    return false;
  }
}
