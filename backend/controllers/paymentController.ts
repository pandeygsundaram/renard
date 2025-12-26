import { Request, Response } from "express";
import crypto from "crypto";
import prisma from "../config/database";
import config from "../config";
import DodoPayments from "dodopayments";

const WEBHOOK_SECRET = config.WEBHOOK_SECRET;

// Initialize Dodo client for fetching subscription details
const dodoClient = new DodoPayments({
  bearerToken: config.DODO_PAYMENTS_API_KEY!,
  environment: config.NODE_ENV === "production" ? "live_mode" : "test_mode",
});

// Verify signature using raw body
const verifySignature = (rawBody: Buffer, signature: string): boolean => {
  if (!WEBHOOK_SECRET) {
    console.error("❌ WEBHOOK_SECRET is missing in .env");
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};

export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const signature = req.headers["webhook-signature"] as string;
    const rawBody = req.body as Buffer;
    const event = JSON.parse(rawBody.toString("utf-8"));

    const { business_id, type, timestamp, data } = event;

    // Verify signature in production
    if (config.NODE_ENV === "production") {
      if (!signature || !verifySignature(rawBody, signature)) {
        console.warn(`⚠️ Invalid Webhook Signature from IP: ${req.ip}`);
        return res.status(400).json({ error: "Invalid signature" });
      }
    }

    // Create unique event ID for idempotency
    const eventId = crypto
      .createHash("sha256")
      .update(
        `${business_id}-${timestamp}-${type}-${
          data.payment_id || data.subscription_id || ""
        }`
      )
      .digest("hex");

    console.log(
      `📥 Received webhook: ${type} (Generated ID: ${eventId.substring(
        0,
        12
      )}...)`
    );

    // Idempotency check
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { eventId },
    });

    if (existingEvent) {
      console.log(
        `ℹ️ Event ${eventId.substring(0, 12)}... already processed. Skipping.`
      );
      return res.status(200).json({ received: true });
    }

    console.log(`🔔 Processing Webhook: ${type}`);

    // Process event in transaction
    await prisma.$transaction(async (tx) => {
      switch (type) {
        case "payment.succeeded":
        case "subscription.created":
        case "subscription.active":
        case "subscription.renewed":
          await handleSubscriptionSuccess(data, type, tx);
          break;

        case "subscription.updated":
          // Usually just metadata/status changes, not provisioning
          console.log(`ℹ️ Subscription updated - no action needed`);
          break;

        case "subscription.canceled":
        case "subscription.cancelled":
        case "subscription.past_due":
        case "subscription.expired":
        case "subscription.failed":
          await handleSubscriptionFailure(data, tx);
          break;

        default:
          console.log(`ℹ️ Unhandled event type: ${type}`);
      }

      await tx.webhookEvent.create({
        data: {
          eventId,
          type,
          status: "PROCESSED",
        },
      });
    });

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("❌ Webhook processing failed:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Helper functions
const handleSubscriptionSuccess = async (
  data: any,
  eventType: string,
  tx: any
) => {
  const userId = data.metadata?.userId;
  const customerId = data.customer?.customer_id || data.customer_id;

  if (!userId) {
    console.warn(
      "⚠️ Webhook missing userId in metadata. Data:",
      JSON.stringify(data, null, 2)
    );
    return;
  }

  let productId: string | undefined;
  let subscriptionId: string | undefined;
  let quantity = 1;

  // Determine if this is a payment or subscription event
  if (data.subscription_id) {
    // This is a subscription event - fetch subscription details to get product_id
    subscriptionId = data.subscription_id;

    try {
      console.log(`🔍 Fetching subscription details for: ${subscriptionId}`);
      const subscription = await dodoClient.subscriptions.retrieve(
        subscriptionId
      );

      // Subscription has product_id at the top level
      productId = subscription.product_id;
      quantity = subscription.quantity || 1;

      console.log(
        `📦 Found product_id: ${productId} with quantity: ${quantity}`
      );
    } catch (error) {
      console.error(
        `❌ Failed to fetch subscription ${subscriptionId}:`,
        error
      );
      return;
    }
  } else if (data.product_cart && data.product_cart.length > 0) {
    // This is a one-time payment with product_cart
    productId = data.product_cart[0].product_id;
    quantity = data.product_cart[0].quantity || 1;
  }

  if (!productId) {
    console.warn(
      `⚠️ Could not determine product_id from event type: ${eventType}`
    );
    return;
  }

  const PRO_PLAN_ID = config.DODO_PRODUCT_PRO;
  const SEAT_ADDON_ID = config.DODO_PRODUCT_SEAT;
  const TEAM_ADDON_ID = config.DODO_PRODUCT_TEAM;

  console.log(
    `✅ Provisioning ${productId} (qty: ${quantity}) for User ${userId}`
  );

  if (productId === PRO_PLAN_ID) {
    await tx.user.update({
      where: { id: userId },
      data: {
        plan: "PRO",
        subStatus: "ACTIVE",
        subscriptionId,
        customerId,
        maxTeams: 1,
        maxSeats: 3,
      },
    });
    console.log(`✅ User ${userId} upgraded to PRO`);
  } else if (productId === SEAT_ADDON_ID) {
    await tx.user.update({
      where: { id: userId },
      data: {
        maxSeats: { increment: quantity },
      },
    });
    console.log(`✅ Added ${quantity} seats to User ${userId}`);
  } else if (productId === TEAM_ADDON_ID) {
    await tx.user.update({
      where: { id: userId },
      data: {
        maxTeams: { increment: quantity },
      },
    });
    console.log(`✅ Added ${quantity} teams to User ${userId}`);
  } else {
    console.warn(`⚠️ Unknown Product ID: ${productId}`);
  }
};

const handleSubscriptionFailure = async (data: any, tx: any) => {
  const userId = data.metadata?.userId;

  if (!userId) {
    console.warn("⚠️ Webhook missing userId in metadata");
    return;
  }

  console.log(`⛔ Revoking access for User ${userId}`);

  await tx.user.update({
    where: { id: userId },
    data: {
      plan: "FREE",
      subStatus: "CANCELED",
      maxTeams: 1,
      maxSeats: 1,
      subscriptionId: null,
    },
  });

  console.log(`✅ User ${userId} downgraded to FREE`);
};
