import crypto from 'crypto';
import {
  db,
  webhookEndpoints,
  webhookDeliveries,
  type WebhookEventType,
  type NewWebhookDelivery,
  eq,
  and,
} from '@menucraft/database';

export { type WebhookEventType } from '@menucraft/database';

interface WebhookPayload {
  id: string;
  type: WebhookEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Generate a webhook signature for payload verification
 */
export function generateSignature(payload: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  return `sha256=${hmac.digest('hex')}`;
}

/**
 * Verify a webhook signature
 */
export function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = generateSignature(payload, secret);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

/**
 * Generate a random webhook secret
 */
export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(32).toString('hex')}`;
}

/**
 * Dispatch a webhook event to all subscribed endpoints for an organization
 */
export async function dispatchWebhook(
  organizationId: string,
  eventType: WebhookEventType,
  data: Record<string, unknown>
): Promise<void> {
  // Find all enabled endpoints for this org that subscribe to this event type
  const endpoints = await db.query.webhookEndpoints.findMany({
    where: and(
      eq(webhookEndpoints.organizationId, organizationId),
      eq(webhookEndpoints.enabled, true)
    ),
  });

  const relevantEndpoints = endpoints.filter((ep) => {
    const events = ep.events as string[];
    return events.includes(eventType) || events.includes('*');
  });

  if (relevantEndpoints.length === 0) {
    return;
  }

  const payload: WebhookPayload = {
    id: crypto.randomUUID(),
    type: eventType,
    timestamp: new Date().toISOString(),
    data,
  };

  // Create delivery records and dispatch asynchronously
  await Promise.all(
    relevantEndpoints.map(async (endpoint) => {
      const [delivery] = await db
        .insert(webhookDeliveries)
        .values({
          endpointId: endpoint.id,
          eventType,
          payload,
          status: 'pending',
        } as NewWebhookDelivery)
        .returning();

      if (!delivery) {
        console.error(`Failed to create webhook delivery for endpoint ${endpoint.id}`);
        return;
      }

      // Dispatch asynchronously - don't await
      deliverWebhook(delivery.id, endpoint.url, endpoint.secret, payload).catch((err) => {
        console.error(`Webhook delivery failed for ${delivery.id}:`, err);
      });
    })
  );
}

/**
 * Deliver a webhook to an endpoint
 */
async function deliverWebhook(
  deliveryId: string,
  url: string,
  secret: string,
  payload: WebhookPayload
): Promise<void> {
  const payloadString = JSON.stringify(payload);
  const signature = generateSignature(payloadString, secret);

  // Update status to retrying
  await db
    .update(webhookDeliveries)
    .set({
      status: 'retrying',
      attempts: 1,
    })
    .where(eq(webhookDeliveries.id, deliveryId));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-ID': payload.id,
        'X-Webhook-Timestamp': payload.timestamp,
        'User-Agent': 'MenuCraft-Webhooks/1.0',
      },
      body: payloadString,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    const responseBody = await response.text().catch(() => '');

    if (response.ok) {
      await db
        .update(webhookDeliveries)
        .set({
          status: 'success',
          httpStatus: response.status,
          responseBody: responseBody.substring(0, 1000),
          completedAt: new Date(),
        })
        .where(eq(webhookDeliveries.id, deliveryId));
    } else {
      await handleDeliveryFailure(deliveryId, response.status, responseBody, url, secret, payload);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await handleDeliveryFailure(deliveryId, null, errorMessage, url, secret, payload);
  }
}

/**
 * Handle webhook delivery failure with exponential backoff retry
 */
async function handleDeliveryFailure(
  deliveryId: string,
  httpStatus: number | null,
  errorMessage: string,
  url: string,
  secret: string,
  payload: WebhookPayload
): Promise<void> {
  const delivery = await db.query.webhookDeliveries.findFirst({
    where: eq(webhookDeliveries.id, deliveryId),
  });

  if (!delivery) return;

  const attempts = delivery.attempts + 1;

  if (attempts >= delivery.maxAttempts) {
    // Max retries reached
    await db
      .update(webhookDeliveries)
      .set({
        status: 'failed',
        httpStatus,
        errorMessage: errorMessage.substring(0, 1000),
        attempts,
        completedAt: new Date(),
      })
      .where(eq(webhookDeliveries.id, deliveryId));
    return;
  }

  // Exponential backoff: 1min, 5min, 30min, 2hr, 12hr
  const backoffMinutes = [1, 5, 30, 120, 720] as const;
  const delayMinutes = backoffMinutes[Math.min(attempts - 1, backoffMinutes.length - 1)] ?? 1;
  const nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000);

  await db
    .update(webhookDeliveries)
    .set({
      status: 'retrying',
      httpStatus,
      errorMessage: errorMessage.substring(0, 1000),
      attempts,
      nextRetryAt,
    })
    .where(eq(webhookDeliveries.id, deliveryId));

  // Schedule retry
  setTimeout(
    () => {
      deliverWebhook(deliveryId, url, secret, payload).catch((err) => {
        console.error(`Webhook retry failed for ${deliveryId}:`, err);
      });
    },
    delayMinutes * 60 * 1000
  );
}

/**
 * Manually retry a failed webhook delivery
 */
export async function retryWebhookDelivery(deliveryId: string): Promise<boolean> {
  const delivery = await db.query.webhookDeliveries.findFirst({
    where: eq(webhookDeliveries.id, deliveryId),
    with: { endpoint: true },
  });

  if (!delivery || !delivery.endpoint) {
    return false;
  }

  // Reset attempts and schedule immediate delivery
  await db
    .update(webhookDeliveries)
    .set({
      status: 'pending',
      attempts: 0,
      errorMessage: null,
      httpStatus: null,
      nextRetryAt: null,
    })
    .where(eq(webhookDeliveries.id, deliveryId));

  deliverWebhook(
    deliveryId,
    delivery.endpoint.url,
    delivery.endpoint.secret,
    delivery.payload as WebhookPayload
  ).catch((err) => {
    console.error(`Webhook retry failed for ${deliveryId}:`, err);
  });

  return true;
}

// ============================================================================
// Event Helpers
// ============================================================================

export async function emitMenuCreated(organizationId: string, menu: Record<string, unknown>) {
  await dispatchWebhook(organizationId, 'menu.created', { menu });
}

export async function emitMenuUpdated(organizationId: string, menu: Record<string, unknown>) {
  await dispatchWebhook(organizationId, 'menu.updated', { menu });
}

export async function emitMenuPublished(organizationId: string, menu: Record<string, unknown>) {
  await dispatchWebhook(organizationId, 'menu.published', { menu });
}

export async function emitMenuDeleted(organizationId: string, menuId: string) {
  await dispatchWebhook(organizationId, 'menu.deleted', { menuId });
}

export async function emitVenueCreated(organizationId: string, venue: Record<string, unknown>) {
  await dispatchWebhook(organizationId, 'venue.created', { venue });
}

export async function emitVenueUpdated(organizationId: string, venue: Record<string, unknown>) {
  await dispatchWebhook(organizationId, 'venue.updated', { venue });
}

export async function emitVenueDeleted(organizationId: string, venueId: string) {
  await dispatchWebhook(organizationId, 'venue.deleted', { venueId });
}

export async function emitQrCodeCreated(organizationId: string, qrCode: Record<string, unknown>) {
  await dispatchWebhook(organizationId, 'qr_code.created', { qrCode });
}

export async function emitQrCodeScanned(organizationId: string, qrCodeId: string, metadata?: Record<string, unknown>) {
  await dispatchWebhook(organizationId, 'qr_code.scanned', { qrCodeId, ...metadata });
}

export async function emitQrCodeDeleted(organizationId: string, qrCodeId: string) {
  await dispatchWebhook(organizationId, 'qr_code.deleted', { qrCodeId });
}

export async function emitSubscriptionCreated(organizationId: string, subscription: Record<string, unknown>) {
  await dispatchWebhook(organizationId, 'subscription.created', { subscription });
}

export async function emitSubscriptionUpdated(organizationId: string, subscription: Record<string, unknown>) {
  await dispatchWebhook(organizationId, 'subscription.updated', { subscription });
}

export async function emitSubscriptionCanceled(organizationId: string, subscription: Record<string, unknown>) {
  await dispatchWebhook(organizationId, 'subscription.canceled', { subscription });
}

export async function emitSubscriptionRenewed(organizationId: string, subscription: Record<string, unknown>) {
  await dispatchWebhook(organizationId, 'subscription.renewed', { subscription });
}

export async function emitTeamMemberAdded(
  organizationId: string,
  userId: string,
  role: string,
  invitedBy?: string
) {
  await dispatchWebhook(organizationId, 'team.member_added', { userId, role, invitedBy });
}

export async function emitTeamMemberRemoved(organizationId: string, userId: string, removedBy?: string) {
  await dispatchWebhook(organizationId, 'team.member_removed', { userId, removedBy });
}
