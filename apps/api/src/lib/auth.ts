import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db, users, sessions, accounts, verifications } from '@menucraft/database';
import { env } from '../config/env.js';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  secret: env.AUTH_SECRET,
  baseURL: env.API_URL,
  trustedOrigins: [env.WEB_URL, env.PUBLIC_URL],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true in production
    sendResetPassword: async ({ user, url }) => {
      // TODO: Use your email service (Resend) to send the reset password email
      // For now, log to console - replace with actual email sending
      console.log(`[Password Reset] Send email to ${user.email} with link: ${url}`);
      // Example with Resend:
      // await sendEmail({
      //   to: user.email,
      //   subject: 'Reset your password',
      //   html: `<p>Click <a href="${url}">here</a> to reset your password.</p>`,
      // });
    },
  },

  socialProviders: {
    google: env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    } : undefined,
  },

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },

  user: {
    additionalFields: {
      firstName: {
        type: 'string',
        required: false,
      },
      lastName: {
        type: 'string',
        required: false,
      },
      avatarUrl: {
        type: 'string',
        required: false,
      },
      preferences: {
        type: 'string', // JSON string
        required: false,
      },
    },
  },

});

export type Auth = typeof auth;
