const nodemailer = require('nodemailer');

/**
 * Escapes HTML characters to prevent XSS / HTML injection in email templates
 */
function escapeHtml(string) {
  if (!string) return '';
  return String(string)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

class MailService {
  constructor() {
    this.transporter = null;
  }

  /**
   * Check if any email service credentials are configured (Brevo, Resend, or Gmail SMTP)
   */
  isConfigured() {
    if (process.env.BREVO_API_KEY && process.env.BREVO_API_KEY.trim().length > 0) return true;
    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length > 0) return true;
    return this.isSmtpConfigured();
  }

  /**
   * Check if classic SMTP credentials are configured
   */
  isSmtpConfigured() {
    const user = process.env.MAIL_USER || 'hemmanthguna@gmail.com';
    const rawPass = process.env.MAIL_APP_PASSWORD;
    const pass = (rawPass || '').replace(/\s+/g, '');
    return Boolean(user && pass && pass.length > 0);
  }

  /**
   * Get the name of the currently active mail provider
   */
  getActiveProvider() {
    if (process.env.BREVO_API_KEY && process.env.BREVO_API_KEY.trim().length > 0) return 'Brevo (HTTPS API)';
    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length > 0) return 'Resend (HTTPS API)';
    if (this.isSmtpConfigured()) return 'Gmail SMTP';
    return 'None (Unconfigured)';
  }

  /**
   * Universal email dispatcher supporting:
   * 1. Brevo REST API (HTTPS port 443 — works on Render Free Tier!)
   * 2. Resend REST API (HTTPS port 443 — works on Render Free Tier!)
   * 3. Nodemailer SMTP (port 465/587 — works on Localhost & Paid cloud servers)
   */
  async dispatchEmail({ to, subject, html, text, fromName = 'FlowForge', replyTo }) {
    const cleanTo = (to || '').trim();
    if (!cleanTo) return { success: false, error: 'Recipient email required' };

    const senderEmail = process.env.MAIL_USER || 'hemmanthguna@gmail.com';

    // 1. Brevo REST API (HTTPS Port 443 - 300 free emails/day, works on Render Free Tier!)
    const brevoKey = (process.env.BREVO_API_KEY || '').trim();
    if (brevoKey) {
      try {
        const payload = {
          sender: { name: fromName, email: senderEmail },
          to: [{ email: cleanTo }],
          subject,
          htmlContent: html,
          textContent: text,
        };
        if (replyTo) {
          payload.replyTo = { email: replyTo };
        }

        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'api-key': brevoKey,
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          console.warn('[MailService] Brevo API error response:', data);
          throw new Error(data.message || `Brevo returned status ${res.status}`);
        }

        console.log(`[MailService] Sent via Brevo HTTPS API to ${cleanTo} (MessageId: ${data.messageId})`);
        return { success: true, messageId: data.messageId, provider: 'brevo' };
      } catch (err) {
        console.error('[MailService] Brevo HTTPS dispatch failed:', err.message);
        // Fall through to next provider
      }
    }

    // 2. Resend REST API (HTTPS Port 443 — works on Render Free Tier!)
    const resendKey = (process.env.RESEND_API_KEY || '').trim();
    if (resendKey) {
      try {
        const fromHeader = process.env.RESEND_FROM || `${fromName} <onboarding@resend.dev>`;
        const payload = {
          from: fromHeader,
          to: [cleanTo],
          subject,
          html,
          text,
        };
        if (replyTo) {
          payload.reply_to = replyTo;
        }

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          console.warn('[MailService] Resend API error response:', data);
          throw new Error(data.message || `Resend returned status ${res.status}`);
        }

        console.log(`[MailService] Sent via Resend HTTPS API to ${cleanTo} (ID: ${data.id})`);
        return { success: true, messageId: data.id, provider: 'resend' };
      } catch (err) {
        console.error('[MailService] Resend HTTPS dispatch failed:', err.message);
        // Fall through to SMTP
      }
    }

    // 3. Fallback to Nodemailer SMTP (for localhost & paid servers)
    if (this.isSmtpConfigured()) {
      try {
        const transporter = this.getTransporter();
        const fromHeader = `"${fromName}" <${senderEmail}>`;

        const info = await transporter.sendMail({
          from: fromHeader,
          to: cleanTo,
          replyTo: replyTo || senderEmail,
          subject,
          text,
          html,
        });

        console.log(`[MailService] Sent via SMTP to ${cleanTo} (Message ID: ${info.messageId})`);
        return { success: true, messageId: info.messageId, provider: 'smtp' };
      } catch (err) {
        console.error(`[MailService] SMTP send failed to ${cleanTo}:`, err.message);
        return { success: false, error: err.message, provider: 'smtp' };
      }
    }

    return {
      success: false,
      reason: 'unconfigured',
      message: 'No email service credentials configured. Set BREVO_API_KEY, RESEND_API_KEY, or MAIL_APP_PASSWORD.',
    };
  }

  /**
   * Lazily initialize or retrieve the Nodemailer transporter
   */
  getTransporter() {
    if (this.transporter) return this.transporter;

    const host = process.env.MAIL_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.MAIL_PORT || '465', 10);
    // Port 465 uses SSL/TLS directly; Port 587 uses STARTTLS
    const isSecure = process.env.MAIL_SECURE !== undefined
      ? process.env.MAIL_SECURE === 'true'
      : port === 465;

    const user = process.env.MAIL_USER || 'hemmanthguna@gmail.com';
    // Remove all whitespace/spaces that Google displays in 16-character App Passwords
    const pass = (process.env.MAIL_APP_PASSWORD || '').replace(/\s+/g, '');

    const commonTimeouts = {
      connectionTimeout: 5000, // 5s max to establish TCP connection
      greetingTimeout: 5000,   // 5s max to receive SMTP banner
      socketTimeout: 8000,     // 8s max socket inactivity
      dnsTimeout: 5000,
    };

    if (host === 'smtp.gmail.com' && !process.env.MAIL_PORT) {
      // Use Nodemailer's built-in Gmail service optimization
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user,
          pass,
        },
        ...commonTimeouts,
        tls: {
          rejectUnauthorized: false,
        },
      });
    } else {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: isSecure,
        auth: {
          user,
          pass,
        },
        ...commonTimeouts,
        tls: {
          rejectUnauthorized: false,
        },
      });
    }

    return this.transporter;
  }

  /**
   * Verify SMTP connection status without exposing secrets
   */
  async verifyConnection() {
    if (!this.isConfigured()) {
      return {
        configured: false,
        message: 'MAIL_APP_PASSWORD is not configured in environment variables.',
      };
    }

    try {
      const transporter = this.getTransporter();
      await transporter.verify();
      return { configured: true, connected: true, message: 'SMTP connection verified successfully.' };
    } catch (err) {
      console.error('[MailService] SMTP Verification failed:', err.message);
      return {
        configured: true,
        connected: false,
        error: err.message,
      };
    }
  }

  /**
   * Send a team invitation email to an invited team member
   * @param {Object} options
   * @param {string} options.to - Recipient email
   * @param {string} options.inviterName - Name of the user sending the invite
   * @param {string} options.teamName - Target team/workspace name
   * @param {string} options.role - Assigned team role (e.g. TEAM_MEMBER, TEAM_MANAGER)
   * @param {string} options.invitationUrl - Full URL to accept the invitation
   * @param {string} [options.expiresAt] - Expiration timestamp
   */
  async sendTeamInvitationEmail({ to, inviterName, teamName, role, invitationUrl, expiresAt }) {
    const cleanTo = (to || '').trim();
    if (!cleanTo) {
      return { success: false, error: 'Recipient email address is required.' };
    }

    if (!this.isConfigured()) {
      console.warn(`[MailService] Invitation created for ${cleanTo}, but MAIL_APP_PASSWORD is not set. Real email was not sent.`);
      return {
        success: false,
        reason: 'unconfigured',
        message: 'Mail server credentials are not configured on the backend (MAIL_APP_PASSWORD is empty). The invitation link was created successfully.',
      };
    }

    const safeTeamName = escapeHtml(teamName || 'Your Team');
    const safeInviterName = escapeHtml(inviterName || 'A Team Administrator');
    const safeRole = escapeHtml((role || 'TEAM_MEMBER').replace(/^TEAM_/, ''));
    const safeUrl = invitationUrl || 'https://flow-ferge.vercel.app';
    const formattedExpiry = expiresAt
      ? new Date(expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '7 days';

    const senderEmail = process.env.MAIL_USER || 'hemmanthguna@gmail.com';
    const subject = `You're invited to join ${teamName} on FlowForge`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #030712;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #f3f4f6;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #030712;
      padding: 40px 16px;
    }
    .card {
      max-width: 580px;
      margin: 0 auto;
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 20px;
      padding: 36px 32px;
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.7);
    }
    .brand-header {
      text-align: center;
      margin-bottom: 28px;
    }
    .brand-badge {
      display: inline-block;
      padding: 8px 18px;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2));
      border: 1px solid rgba(139, 92, 246, 0.4);
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 700;
      color: #c084fc;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    h1 {
      color: #ffffff;
      font-size: 24px;
      font-weight: 700;
      line-height: 1.3;
      margin: 20px 0 12px 0;
      text-align: center;
    }
    p {
      color: #94a3b8;
      font-size: 15px;
      line-height: 1.6;
      margin: 0 0 16px 0;
    }
    .highlight-box {
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 16px 20px;
      margin: 24px 0;
    }
    .highlight-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 13px;
    }
    .highlight-label {
      color: #64748b;
    }
    .highlight-value {
      color: #e2e8f0;
      font-weight: 600;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0 28px 0;
    }
    .btn {
      display: inline-block;
      padding: 14px 36px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-size: 15px;
      font-weight: 600;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
    }
    .fallback-url {
      word-break: break-all;
      font-family: monospace;
      font-size: 12px;
      color: #818cf8;
      background: #1e293b;
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid #334155;
      display: block;
      margin-top: 8px;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #1e293b;
      font-size: 12px;
      color: #475569;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="brand-header">
        <span class="brand-badge">&bull; FLOWFORGE WORKFLOW PLATFORM &bull;</span>
        <h1>You're Invited to Join ${safeTeamName}</h1>
      </div>

      <p>Hello,</p>
      <p>
        <strong>${safeInviterName}</strong> has invited you to join the team
        <strong>${safeTeamName}</strong> on FlowForge as a <strong>${safeRole}</strong>.
      </p>

      <div class="highlight-box">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="color: #64748b; padding: 4px 0;">Team Workspace:</td>
            <td style="color: #f1f5f9; font-weight: 600; text-align: right;">${safeTeamName}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding: 4px 0;">Assigned Role:</td>
            <td style="color: #c084fc; font-weight: 600; text-align: right;">${safeRole}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding: 4px 0;">Invited By:</td>
            <td style="color: #f1f5f9; font-weight: 600; text-align: right;">${safeInviterName}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding: 4px 0;">Expires On:</td>
            <td style="color: #f1f5f9; font-weight: 600; text-align: right;">${formattedExpiry}</td>
          </tr>
        </table>
      </div>

      <div class="btn-container">
        <a href="${safeUrl}" class="btn" target="_blank" rel="noopener noreferrer">Accept Invitation</a>
      </div>

      <p style="font-size: 13px; color: #64748b; margin-bottom: 6px;">
        Button not working? Copy and paste this URL directly into your browser:
      </p>
      <a href="${safeUrl}" class="fallback-url">${safeUrl}</a>

      <div class="footer">
        <p style="margin-bottom: 8px; font-size: 11px;">
          This invitation was sent to <strong>${escapeHtml(cleanTo)}</strong>. If you were not expecting this invitation, you can safely disregard this email.
        </p>
        <p style="margin: 0; font-size: 11px;">
          &copy; ${new Date().getFullYear()} FlowForge Inc. High-throughput collaborative workflows.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`;

    const plainTextContent = `
You're invited to join ${teamName} on FlowForge!

${inviterName || 'A Team Administrator'} has invited you to join the team "${teamName}" as a ${safeRole}.

To accept this invitation and join your workspace team, visit the link below:
${safeUrl}

Invitation Details:
- Team: ${teamName}
- Assigned Role: ${safeRole}
- Invited By: ${inviterName || 'Team Administrator'}
- Link Expiration: ${formattedExpiry}

If you weren't expecting this invitation, you can safely ignore this email.

---
FlowForge Workflow Management Platform
${process.env.APP_BASE_URL || 'https://flow-ferge.vercel.app'}
`;

    return await this.dispatchEmail({
      to: cleanTo,
      subject,
      html: htmlContent,
      text: plainTextContent,
      fromName: 'FlowForge',
      replyTo: senderEmail,
    });
  }

  /**
   * Send a workflow collaboration invitation email
   */
  async sendWorkflowInvitationEmail({ to, inviterName, workflowTitle, role, invitationUrl, expiresAt }) {
    const cleanTo = (to || '').trim();
    if (!cleanTo || !this.isConfigured()) {
      return {
        success: false,
        reason: 'unconfigured',
        message: 'Mail server credentials are not configured on the backend.',
      };
    }

    const safeWf = escapeHtml(workflowTitle || 'Workflow');
    const safeInviter = escapeHtml(inviterName || 'A Colleague');
    const safeRole = escapeHtml(role || 'MEMBER');
    const safeUrl = invitationUrl || 'https://flow-ferge.vercel.app';
    const senderEmail = process.env.MAIL_USER || 'hemmanthguna@gmail.com';
    const subject = `Collaborate on "${workflowTitle}" on FlowForge`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { background-color: #030712; font-family: sans-serif; color: #f3f4f6; margin: 0; padding: 24px; }
    .card { max-width: 540px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; }
    .btn { display: inline-block; padding: 12px 28px; background: #6366f1; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="card">
    <h2 style="color: #ffffff; margin-top: 0;">Workflow Collaboration Invitation</h2>
    <p><strong>${safeInviter}</strong> invited you to collaborate on the workflow <strong>${safeWf}</strong> as a <strong>${safeRole}</strong>.</p>
    <div style="text-align: center;">
      <a href="${safeUrl}" class="btn">View & Accept Workflow Invite</a>
    </div>
    <p style="font-size: 12px; color: #64748b;">Or visit: <br><a href="${safeUrl}" style="color: #818cf8;">${safeUrl}</a></p>
  </div>
</body>
</html>
`;

    return await this.dispatchEmail({
      to: cleanTo,
      subject,
      html: htmlContent,
      text: `${inviterName} invited you to collaborate on ${workflowTitle} on FlowForge: ${safeUrl}`,
      fromName: 'FlowForge',
      replyTo: senderEmail,
    });
  }

  /**
   * Send notification email when someone accepts or declines an invitation
   */
  async sendInvitationResponseEmail({ to, inviterName, respondentName, resourceTitle, action, resourceType = 'Workflow' }) {
    if (!to || !to.includes('@')) {
      return { success: false, error: 'Valid recipient email required' };
    }

    const cleanTo = to.trim().toLowerCase();
    const isAccepted = action === 'ACCEPTED';
    const actionText = isAccepted ? 'accepted' : 'declined';
    const actionColor = isAccepted ? '#10b981' : '#f43f5e';
    const safeInviter = escapeHtml(inviterName || 'Team Manager');
    const safeRespondent = escapeHtml(respondentName || 'A collaborator');
    const safeTitle = escapeHtml(resourceTitle || 'FlowForge Resource');

    const subject = `[FlowForge] ${safeRespondent} ${actionText} your invitation to ${safeTitle}`;
    const senderEmail = process.env.MAIL_USER || 'hemmanthguna@gmail.com';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f17; color: #f1f5f9; margin: 0; padding: 24px; }
    .card { background-color: #111827; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; max-width: 540px; margin: 0 auto; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 700; color: #ffffff; background-color: ${actionColor}; margin-bottom: 16px; }
    h2 { margin: 0 0 12px; font-size: 20px; color: #ffffff; }
    p { margin: 8px 0; font-size: 14px; line-height: 1.6; color: #cbd5e1; }
    .highlight { color: #ffffff; font-weight: 600; }
    .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 12px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Invitation ${isAccepted ? 'Accepted' : 'Declined'}</div>
    <h2>Hello ${safeInviter},</h2>
    <p><span class="highlight">${safeRespondent}</span> has <strong>${actionText}</strong> your invitation to join <span class="highlight">${safeTitle}</span> (${resourceType}).</p>
    ${isAccepted ? '<p>They now have access to collaborate on tasks and workflows with your team.</p>' : '<p>They will not have access to this workspace unless invited again.</p>'}
    <div class="footer">
      <p>© ${new Date().getFullYear()} FlowForge. Intelligent Workflow Orchestration.</p>
    </div>
  </div>
</body>
</html>
`;

    return await this.dispatchEmail({
      to: cleanTo,
      subject,
      html: htmlContent,
      text: `${safeRespondent} has ${actionText} your invitation to ${safeTitle} on FlowForge.`,
      fromName: 'FlowForge',
      replyTo: senderEmail,
    });
  }

  /**
   * Send a private document notification email to a single recipient
   */
  async sendPrivateDocumentEmail({ to, recipientName, senderName, senderRole, documentName, workflowName, teamName, documentUrl }) {
    const cleanTo = (to || '').trim();
    if (!cleanTo) return { success: false, error: 'Recipient email required' };

    if (!this.isConfigured()) {
      return { success: false, reason: 'unconfigured' };
    }

    const safeRecipient = escapeHtml(recipientName || 'Team Member');
    const safeSender = escapeHtml(senderName || 'Manager');
    const safeSenderRole = escapeHtml(senderRole || 'Workflow Manager');
    const safeDoc = escapeHtml(documentName || 'Document');
    const safeWorkflow = escapeHtml(workflowName || 'Workflow');
    const safeTeam = escapeHtml(teamName || 'Workspace Team');
    const safeUrl = documentUrl || 'https://flow-ferge.vercel.app/documents';
    const senderEmail = process.env.MAIL_USER || 'hemmanthguna@gmail.com';
    const subject = `Private Document Shared: ${documentName} (${workflowName} • ${safeTeam})`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #080B12; color: #F8FAFC; margin: 0; padding: 24px; }
    .card { background-color: #0D1220; border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; max-width: 540px; margin: 0 auto; padding: 32px; box-shadow: 0 10px 40px rgba(0,0,0,0.6); }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 700; color: #C084FC; background-color: rgba(192, 132, 252, 0.15); border: 1px solid rgba(192, 132, 252, 0.3); text-transform: uppercase; margin-bottom: 16px; letter-spacing: 0.05em; }
    h2 { margin: 0 0 12px; font-size: 20px; color: #ffffff; }
    p { margin: 8px 0; font-size: 14px; line-height: 1.6; color: #94A3B8; }
    .highlight { color: #ffffff; font-weight: 600; }
    .doc-box { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 18px; margin: 20px 0; }
    .meta-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .meta-row:last-child { border-bottom: none; }
    .meta-label { color: #64748b; }
    .meta-val { color: #e2e8f0; font-weight: 600; }
    .btn { display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #8B5CF6, #6366F1); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4); margin-top: 12px; }
    .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 12px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">🔒 Confidential Document Delivery</div>
    <h2>Hello ${safeRecipient},</h2>
    <p><span class="highlight">${safeSender}</span> (<span class="highlight">${safeSenderRole}</span>) has shared a private document with you in the workflow <span class="highlight">${safeWorkflow}</span> (Team: <span class="highlight">${safeTeam}</span>).</p>
    
    <div class="doc-box">
      <div style="font-size: 16px; font-weight: 700; color: #ffffff; margin-bottom: 10px;">📄 ${safeDoc}</div>
      <div class="meta-row"><span class="meta-label">Sender:</span><span class="meta-val">${safeSender} (${safeSenderRole})</span></div>
      <div class="meta-row"><span class="meta-label">Team:</span><span class="meta-val">${safeTeam}</span></div>
      <div class="meta-row"><span class="meta-label">Workflow:</span><span class="meta-val">${safeWorkflow}</span></div>
      <div style="font-size: 11px; color: #cbd5e1; margin-top: 10px;">This document was sent privately to your account. Only you, the sender, and authorized administrators can access it.</div>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${safeUrl}" class="btn">View & Download Document</a>
    </div>

    <div class="footer">
      <p>© ${new Date().getFullYear()} FlowForge. Smart Workflow Management Platform.</p>
    </div>
  </div>
</body>
</html>
`;

    const fromName = safeSenderRole
      ? `${safeSender} (${safeSenderRole}) via FlowForge`
      : `${safeSender} via FlowForge`;

    return await this.dispatchEmail({
      to: cleanTo,
      subject,
      html: htmlContent,
      text: `${safeSender} (${safeSenderRole}) sent you a private document "${safeDoc}" in team "${safeTeam}" for workflow "${safeWorkflow}". Log in to FlowForge to view: ${safeUrl}`,
      fromName,
      replyTo: senderEmail,
    });
  }
}

module.exports = new MailService();
