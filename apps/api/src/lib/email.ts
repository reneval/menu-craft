import { Resend } from 'resend';
import { db, emailLogs, type NewEmailLog, eq } from '@menucraft/database';
import { env } from '../config/env.js';

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (!env.RESEND_API_KEY) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  return resendClient;
}

export function isEmailConfigured(): boolean {
  return !!env.RESEND_API_KEY;
}

export type EmailType = NewEmailLog['type'];

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  type: EmailType;
  userId?: string;
  organizationId?: string;
  templateData?: Record<string, unknown>;
}

/**
 * Send an email and log it to the database
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  const resend = getResendClient();

  // Create email log
  const [log] = await db
    .insert(emailLogs)
    .values({
      to: options.to,
      subject: options.subject,
      type: options.type,
      userId: options.userId,
      organizationId: options.organizationId,
      templateData: options.templateData,
      status: 'pending',
    })
    .returning();

  if (!log) {
    return { success: false, error: 'Failed to create email log' };
  }

  if (!resend) {
    // Log only mode - useful for development
    console.log(`[Email] Would send "${options.subject}" to ${options.to}`);
    console.log(`[Email] HTML: ${options.html.substring(0, 200)}...`);

    await db
      .update(emailLogs)
      .set({ status: 'sent', sentAt: new Date() })
      .where(eq(emailLogs.id, log.id));

    return { success: true, id: log.id };
  }

  try {
    const result = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (result.error) {
      await db
        .update(emailLogs)
        .set({
          status: 'failed',
          errorMessage: result.error.message,
        })
        .where(eq(emailLogs.id, log.id));

      return { success: false, error: result.error.message };
    }

    await db
      .update(emailLogs)
      .set({
        status: 'sent',
        sentAt: new Date(),
        resendId: result.data?.id,
      })
      .where(eq(emailLogs.id, log.id));

    return { success: true, id: log.id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await db
      .update(emailLogs)
      .set({
        status: 'failed',
        errorMessage,
      })
      .where(eq(emailLogs.id, log.id));

    return { success: false, error: errorMessage };
  }
}

// ============================================================================
// Email Templates
// ============================================================================

const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: white; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .logo { text-align: center; margin-bottom: 24px; }
    .logo h1 { color: #16a34a; margin: 0; font-size: 24px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; }
    .button:hover { background-color: #15803d; }
    .footer { text-align: center; margin-top: 32px; color: #6b7280; font-size: 14px; }
    .footer a { color: #16a34a; text-decoration: none; }
    h2 { color: #111827; margin-top: 0; }
    p { margin: 16px 0; }
    .highlight { background: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px 16px; margin: 16px 0; border-radius: 0 4px 4px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <h1>MenuCraft</h1>
      </div>
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} MenuCraft. All rights reserved.</p>
      <p><a href="${env.WEB_URL}">Visit MenuCraft</a></p>
    </div>
  </div>
</body>
</html>
`;

export const emailTemplates = {
  welcome: (data: { name: string; loginUrl?: string }) => ({
    subject: 'Welcome to MenuCraft!',
    html: baseTemplate(`
      <h2>Welcome to MenuCraft, ${data.name}!</h2>
      <p>We're excited to have you on board. MenuCraft helps you create beautiful digital menus for your restaurant or venue.</p>
      <p>Here's what you can do:</p>
      <ul>
        <li>Create stunning digital menus</li>
        <li>Generate QR codes for table-side ordering</li>
        <li>Track menu views and analytics</li>
        <li>Support multiple languages</li>
      </ul>
      <p style="text-align: center; margin-top: 24px;">
        <a href="${data.loginUrl || env.WEB_URL}" class="button">Get Started</a>
      </p>
    `),
    text: `Welcome to MenuCraft, ${data.name}!\n\nWe're excited to have you on board. Visit ${data.loginUrl || env.WEB_URL} to get started.`,
  }),

  passwordReset: (data: { name: string; resetUrl: string; expiresIn?: string }) => ({
    subject: 'Reset Your Password',
    html: baseTemplate(`
      <h2>Password Reset Request</h2>
      <p>Hi ${data.name},</p>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      <p style="text-align: center; margin-top: 24px;">
        <a href="${data.resetUrl}" class="button">Reset Password</a>
      </p>
      <p class="highlight">This link will expire in ${data.expiresIn || '1 hour'}. If you didn't request this, you can safely ignore this email.</p>
    `),
    text: `Hi ${data.name},\n\nWe received a request to reset your password. Visit ${data.resetUrl} to create a new password. This link expires in ${data.expiresIn || '1 hour'}.`,
  }),

  subscriptionCreated: (data: { name: string; planName: string; billingUrl?: string }) => ({
    subject: `Welcome to MenuCraft ${data.planName}!`,
    html: baseTemplate(`
      <h2>Subscription Confirmed!</h2>
      <p>Hi ${data.name},</p>
      <p>Thank you for subscribing to <strong>MenuCraft ${data.planName}</strong>! Your account has been upgraded and you now have access to all the features included in your plan.</p>
      <div class="highlight">
        <strong>Your Plan:</strong> ${data.planName}
      </div>
      <p style="text-align: center; margin-top: 24px;">
        <a href="${data.billingUrl || env.WEB_URL + '/dashboard/settings'}" class="button">Manage Subscription</a>
      </p>
    `),
    text: `Hi ${data.name},\n\nThank you for subscribing to MenuCraft ${data.planName}! Your account has been upgraded.`,
  }),

  subscriptionCanceled: (data: { name: string; endDate: string }) => ({
    subject: 'Your MenuCraft Subscription Has Been Canceled',
    html: baseTemplate(`
      <h2>Subscription Canceled</h2>
      <p>Hi ${data.name},</p>
      <p>We're sorry to see you go. Your MenuCraft subscription has been canceled.</p>
      <div class="highlight">
        <strong>Access Until:</strong> ${data.endDate}<br>
        You'll continue to have access to your current plan until this date.
      </div>
      <p>If you change your mind, you can resubscribe at any time from your account settings.</p>
      <p>We'd love to hear your feedback on how we can improve. Feel free to reply to this email.</p>
    `),
    text: `Hi ${data.name},\n\nYour MenuCraft subscription has been canceled. You'll have access until ${data.endDate}.`,
  }),

  subscriptionPastDue: (data: { name: string; updatePaymentUrl: string }) => ({
    subject: 'Action Required: Payment Failed',
    html: baseTemplate(`
      <h2>Payment Issue</h2>
      <p>Hi ${data.name},</p>
      <p>We weren't able to process your latest payment. Please update your payment method to continue enjoying MenuCraft.</p>
      <p style="text-align: center; margin-top: 24px;">
        <a href="${data.updatePaymentUrl}" class="button">Update Payment Method</a>
      </p>
      <p class="highlight">If you don't update your payment method within 7 days, your account may be downgraded.</p>
    `),
    text: `Hi ${data.name},\n\nWe weren't able to process your latest payment. Please visit ${data.updatePaymentUrl} to update your payment method.`,
  }),

  menuPublished: (data: { name: string; menuName: string; menuUrl: string }) => ({
    subject: `Your Menu "${data.menuName}" is Now Live!`,
    html: baseTemplate(`
      <h2>Menu Published!</h2>
      <p>Hi ${data.name},</p>
      <p>Great news! Your menu <strong>"${data.menuName}"</strong> has been published and is now live.</p>
      <p style="text-align: center; margin-top: 24px;">
        <a href="${data.menuUrl}" class="button">View Your Menu</a>
      </p>
      <p>Share this link with your customers or generate a QR code from your dashboard.</p>
    `),
    text: `Hi ${data.name},\n\nYour menu "${data.menuName}" has been published! View it at: ${data.menuUrl}`,
  }),

  usageAlert: (data: { name: string; resource: string; current: number; limit: number; upgradeUrl: string }) => ({
    subject: `Usage Alert: ${data.resource} Limit Approaching`,
    html: baseTemplate(`
      <h2>Usage Alert</h2>
      <p>Hi ${data.name},</p>
      <p>You're approaching your <strong>${data.resource}</strong> limit.</p>
      <div class="highlight">
        <strong>Current Usage:</strong> ${data.current} / ${data.limit}
      </div>
      <p>Consider upgrading your plan to get more capacity.</p>
      <p style="text-align: center; margin-top: 24px;">
        <a href="${data.upgradeUrl}" class="button">Upgrade Plan</a>
      </p>
    `),
    text: `Hi ${data.name},\n\nYou're approaching your ${data.resource} limit (${data.current}/${data.limit}). Upgrade at: ${data.upgradeUrl}`,
  }),

  teamInvitation: (data: { inviterName: string; organizationName: string; role: string; inviteUrl: string }) => ({
    subject: `You've been invited to join ${data.organizationName} on MenuCraft`,
    html: baseTemplate(`
      <h2>Team Invitation</h2>
      <p><strong>${data.inviterName}</strong> has invited you to join <strong>${data.organizationName}</strong> on MenuCraft as a <strong>${data.role}</strong>.</p>
      <p style="text-align: center; margin-top: 24px;">
        <a href="${data.inviteUrl}" class="button">Accept Invitation</a>
      </p>
      <p class="highlight">This invitation will expire in 7 days.</p>
    `),
    text: `${data.inviterName} has invited you to join ${data.organizationName} on MenuCraft as a ${data.role}. Accept at: ${data.inviteUrl}`,
  }),

  // Trial Lifecycle Emails
  trialStarted: (data: { name: string; daysRemaining: number; dashboardUrl: string }) => ({
    subject: 'Your 30-Day Free Trial Has Started!',
    html: baseTemplate(`
      <h2>Welcome to Your Free Trial!</h2>
      <p>Hi ${data.name},</p>
      <p>Your 30-day free trial of MenuCraft has started! You have full access to all features.</p>
      <div class="highlight">
        <strong>Trial Period:</strong> ${data.daysRemaining} days remaining
      </div>
      <p>Here's what you can do:</p>
      <ul>
        <li>Create unlimited digital menus</li>
        <li>Generate QR codes for your venue</li>
        <li>Add multiple languages</li>
        <li>Track analytics and views</li>
      </ul>
      <p style="text-align: center; margin-top: 24px;">
        <a href="${data.dashboardUrl}" class="button">Go to Dashboard</a>
      </p>
    `),
    text: `Hi ${data.name},\n\nYour 30-day free trial of MenuCraft has started! You have ${data.daysRemaining} days to explore all features.\n\nGet started: ${data.dashboardUrl}`,
  }),

  trialEnding: (data: { name: string; daysRemaining: number; upgradeUrl: string }) => ({
    subject: `Your Trial Ends in ${data.daysRemaining} Days`,
    html: baseTemplate(`
      <h2>Your Trial is Ending Soon</h2>
      <p>Hi ${data.name},</p>
      <p>Your MenuCraft trial will expire in <strong>${data.daysRemaining} days</strong>.</p>
      <div class="highlight">
        <strong>Don't lose your menus!</strong> Upgrade now to keep all your menus, QR codes, and analytics.
      </div>
      <p>Our paid plans start at just €9/month and include:</p>
      <ul>
        <li>Unlimited menus and items</li>
        <li>Multiple venues</li>
        <li>Custom domains</li>
        <li>Priority support</li>
      </ul>
      <p style="text-align: center; margin-top: 24px;">
        <a href="${data.upgradeUrl}" class="button">Upgrade Now</a>
      </p>
    `),
    text: `Hi ${data.name},\n\nYour MenuCraft trial expires in ${data.daysRemaining} days. Upgrade now to keep your menus: ${data.upgradeUrl}`,
  }),

  trialExpired: (data: { name: string; reactivateUrl: string }) => ({
    subject: 'Your MenuCraft Trial Has Ended',
    html: baseTemplate(`
      <h2>Your Trial Has Ended</h2>
      <p>Hi ${data.name},</p>
      <p>Your MenuCraft free trial has ended. Your menus are still saved, but they're no longer publicly accessible.</p>
      <div class="highlight">
        <strong>Good news:</strong> All your work is preserved! Upgrade now to restore access instantly.
      </div>
      <p style="text-align: center; margin-top: 24px;">
        <a href="${data.reactivateUrl}" class="button">Reactivate My Account</a>
      </p>
      <p>Questions? Reply to this email - we're happy to help!</p>
    `),
    text: `Hi ${data.name},\n\nYour MenuCraft trial has ended. Your menus are saved but not publicly accessible. Reactivate: ${data.reactivateUrl}`,
  }),

  // Inactivity Reminders
  inactivityReminder: (data: { name: string; daysSinceLogin: number; loginUrl: string }) => ({
    subject: "We miss you! Your menus are waiting",
    html: baseTemplate(`
      <h2>Your Menus Miss You!</h2>
      <p>Hi ${data.name},</p>
      <p>We noticed you haven't logged in for ${data.daysSinceLogin} days. Your digital menus are still running, but you might be missing out on valuable insights.</p>
      <p>Here's what's been happening:</p>
      <ul>
        <li>Check your menu analytics</li>
        <li>See which items are popular</li>
        <li>Update seasonal specials</li>
      </ul>
      <p style="text-align: center; margin-top: 24px;">
        <a href="${data.loginUrl}" class="button">View My Dashboard</a>
      </p>
    `),
    text: `Hi ${data.name},\n\nWe noticed you haven't logged in for ${data.daysSinceLogin} days. Your menus are still live! Check your dashboard: ${data.loginUrl}`,
  }),

  // Referral Emails
  referralSignup: (data: { name: string; referredName: string; dashboardUrl: string }) => ({
    subject: `${data.referredName} just signed up using your referral!`,
    html: baseTemplate(`
      <h2>You've Got a Referral!</h2>
      <p>Hi ${data.name},</p>
      <p>Great news! <strong>${data.referredName}</strong> just signed up for MenuCraft using your referral code.</p>
      <div class="highlight">
        <strong>What happens next?</strong> Once they subscribe to a paid plan, you'll receive €9 in credit!
      </div>
      <p>Keep sharing your referral code to earn more credits. Each successful referral gives you €9 off your next bill.</p>
      <p style="text-align: center; margin-top: 24px;">
        <a href="${data.dashboardUrl}" class="button">View Referral Stats</a>
      </p>
    `),
    text: `Hi ${data.name},\n\n${data.referredName} just signed up using your referral code! Once they subscribe, you'll earn €9 in credit.`,
  }),

  referralReward: (data: { name: string; creditAmount: string; referredName: string; balanceUrl: string }) => ({
    subject: `You earned ${data.creditAmount} in referral credit!`,
    html: baseTemplate(`
      <h2>Referral Reward Earned!</h2>
      <p>Hi ${data.name},</p>
      <p>Congratulations! <strong>${data.referredName}</strong> subscribed to a paid plan, and you've earned <strong>${data.creditAmount}</strong> in credit!</p>
      <div class="highlight">
        <strong>Your credit balance has been updated.</strong> This credit will be automatically applied to your next invoice.
      </div>
      <p>Keep sharing your referral code to earn even more credits!</p>
      <p style="text-align: center; margin-top: 24px;">
        <a href="${data.balanceUrl}" class="button">View Credit Balance</a>
      </p>
    `),
    text: `Hi ${data.name},\n\nYou earned ${data.creditAmount} in credit because ${data.referredName} subscribed! View your balance: ${data.balanceUrl}`,
  }),
};

// ============================================================================
// Helper Functions
// ============================================================================

export async function sendWelcomeEmail(to: string, name: string, userId?: string) {
  const template = emailTemplates.welcome({ name, loginUrl: env.WEB_URL });
  return sendEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    type: 'welcome',
    userId,
    templateData: { name },
  });
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string, userId?: string) {
  const template = emailTemplates.passwordReset({ name, resetUrl });
  return sendEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    type: 'password_reset',
    userId,
    templateData: { name, resetUrl },
  });
}

export async function sendSubscriptionCreatedEmail(
  to: string,
  name: string,
  planName: string,
  userId?: string,
  organizationId?: string
) {
  const template = emailTemplates.subscriptionCreated({ name, planName });
  return sendEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    type: 'subscription_created',
    userId,
    organizationId,
    templateData: { name, planName },
  });
}

export async function sendSubscriptionCanceledEmail(
  to: string,
  name: string,
  endDate: string,
  userId?: string,
  organizationId?: string
) {
  const template = emailTemplates.subscriptionCanceled({ name, endDate });
  return sendEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    type: 'subscription_canceled',
    userId,
    organizationId,
    templateData: { name, endDate },
  });
}

export async function sendMenuPublishedEmail(
  to: string,
  name: string,
  menuName: string,
  menuUrl: string,
  userId?: string,
  organizationId?: string
) {
  const template = emailTemplates.menuPublished({ name, menuName, menuUrl });
  return sendEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    type: 'menu_published',
    userId,
    organizationId,
    templateData: { name, menuName, menuUrl },
  });
}

export async function sendUsageAlertEmail(
  to: string,
  name: string,
  resource: string,
  current: number,
  limit: number,
  userId?: string,
  organizationId?: string
) {
  const template = emailTemplates.usageAlert({
    name,
    resource,
    current,
    limit,
    upgradeUrl: `${env.WEB_URL}/dashboard/settings`,
  });
  return sendEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    type: 'usage_alert',
    userId,
    organizationId,
    templateData: { name, resource, current, limit },
  });
}

export async function sendTeamInvitationEmail(
  to: string,
  inviterName: string,
  organizationName: string,
  role: string,
  inviteUrl: string
) {
  const template = emailTemplates.teamInvitation({ inviterName, organizationName, role, inviteUrl });
  return sendEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    type: 'team_invitation',
    templateData: { inviterName, organizationName, role, inviteUrl },
  });
}

// ============================================================================
// Trial Lifecycle Emails
// ============================================================================

export async function sendTrialStartedEmail(
  to: string,
  name: string,
  daysRemaining: number,
  userId?: string,
  organizationId?: string
) {
  const template = emailTemplates.trialStarted({
    name,
    daysRemaining,
    dashboardUrl: env.WEB_URL,
  });
  return sendEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    type: 'trial_started',
    userId,
    organizationId,
    templateData: { name, daysRemaining },
  });
}

export async function sendTrialEndingEmail(
  to: string,
  name: string,
  daysRemaining: number,
  userId?: string,
  organizationId?: string
) {
  const template = emailTemplates.trialEnding({
    name,
    daysRemaining,
    upgradeUrl: `${env.WEB_URL}/settings`,
  });

  // Map days to email type
  let emailType: EmailType;
  if (daysRemaining === 7) {
    emailType = 'trial_ending_7d';
  } else if (daysRemaining === 3) {
    emailType = 'trial_ending_3d';
  } else {
    emailType = 'trial_ending_1d';
  }

  return sendEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    type: emailType,
    userId,
    organizationId,
    templateData: { name, daysRemaining },
  });
}

export async function sendTrialExpiredEmail(
  to: string,
  name: string,
  userId?: string,
  organizationId?: string
) {
  const template = emailTemplates.trialExpired({
    name,
    reactivateUrl: `${env.WEB_URL}/settings`,
  });
  return sendEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    type: 'trial_expired',
    userId,
    organizationId,
    templateData: { name },
  });
}

export async function sendInactivityReminderEmail(
  to: string,
  name: string,
  daysSinceLogin: number,
  userId?: string,
  organizationId?: string
) {
  const template = emailTemplates.inactivityReminder({
    name,
    daysSinceLogin,
    loginUrl: env.WEB_URL,
  });

  const emailType: EmailType = daysSinceLogin >= 14 ? 'inactivity_14d' : 'inactivity_7d';

  return sendEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    type: emailType,
    userId,
    organizationId,
    templateData: { name, daysSinceLogin },
  });
}

// ============================================================================
// Referral Emails
// ============================================================================

export async function sendReferralSignupEmail(
  to: string,
  name: string,
  referredName: string,
  userId?: string,
  organizationId?: string
) {
  const template = emailTemplates.referralSignup({
    name,
    referredName,
    dashboardUrl: `${env.WEB_URL}/settings/referrals`,
  });
  return sendEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    type: 'referral_signup',
    userId,
    organizationId,
    templateData: { name, referredName },
  });
}

export async function sendReferralRewardEmail(
  to: string,
  name: string,
  creditAmount: string,
  referredName: string,
  userId?: string,
  organizationId?: string
) {
  const template = emailTemplates.referralReward({
    name,
    creditAmount,
    referredName,
    balanceUrl: `${env.WEB_URL}/settings/referrals`,
  });
  return sendEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    type: 'referral_reward',
    userId,
    organizationId,
    templateData: { name, creditAmount, referredName },
  });
}
