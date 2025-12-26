import DodoPayments from "dodopayments";
import config from "../config";

// Initialize the client with correct environment variable name
const client = new DodoPayments({
  bearerToken: config.DODO_PAYMENTS_API_KEY!, // Change from DODO_API_KEY
  environment:
    process.env.NODE_ENV === "production" ? "live_mode" : "test_mode",
});

export const createCheckoutSession = async (
  userId: string,
  email: string,
  productId: string,
  quantity: number = 1
) => {
  try {
    const response = await client.checkoutSessions.create({
      product_cart: [
        {
          product_id: productId,
          quantity: quantity,
        },
      ],
      customer: {
        // For EXISTING customer (if you have their customer_id)
        // customer_id: "cus_xxx",

        // For NEW customer
        email: email,
        name: undefined, // optional
        // Metadata is NOT directly on customer, it's a separate field
      },
      // Metadata goes at the top level, not inside customer
      metadata: {
        userId: userId,
      },
      return_url: `${config.FRONTEND_URL}/dashboard?success=true`,
    });

    // The response property is 'checkout_url', not 'payment_link'
    return response.checkout_url;
  } catch (error) {
    console.error("Dodo SDK Error:", error);
    throw new Error("Failed to create checkout session");
  }
};
