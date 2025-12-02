import Stripe from 'stripe';
import { env } from '../config/env.js';

// Initialize Stripe client if secret key is available
export const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2025-11-17.clover' })
  : null;

// Helper to get Stripe client or throw if not configured
export function requireStripe(): Stripe {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
  }
  return stripe;
}

// Check if Stripe is available
export function isStripeConfigured(): boolean {
  return !!stripe;
}
