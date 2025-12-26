import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { createCheckoutSession } from "../services/paymentService";
import { handleWebhook } from "../controllers/paymentController";

const router = Router();

// Webhook route - this will be mounted at /api/payment/webhook in app.ts
router.post("/webhook", handleWebhook);

// Create Checkout Link (For Frontend "Upgrade" button)
router.post("/create-checkout", authenticate, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const user = (req as any).user;

    const link = await createCheckoutSession(
      user.id,
      user.email,
      productId,
      quantity
    );
    res.json({ url: link });
  } catch (error) {
    res.status(500).json({ error: "Failed to create checkout" });
  }
});

export default router;
