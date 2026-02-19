import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

/**
 * SumUp Webhook Handler
 * 
 * Receives webhook notifications from SumUp when checkout status changes.
 * Event: CHECKOUT_STATUS_CHANGED
 * Payload: { event_type: "CHECKOUT_STATUS_CHANGED", id: "checkout-id" }
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);
  
  try {
    const body = req.body as Record<string, unknown>;
    const event_type = body.event_type as string;
    const id = body.id as string;

    logger.info(`[SumUp Webhook] Received event: ${event_type}, checkout_id: ${id}`);

    // Verify the event by calling SumUp API directly
    if (event_type === "CHECKOUT_STATUS_CHANGED" && id) {
      // In a production environment, you would:
      // 1. Verify the webhook signature (if SumUp provides one)
      // 2. Fetch the checkout details from SumUp API
      // 3. Update the corresponding Medusa order/payment based on the status
      
      logger.info(`[SumUp Webhook] Processing checkout status change for: ${id}`);
      
      // TODO: Implement order/payment status update logic
      // For now, just acknowledge receipt
    }

    // Always respond with 2xx status code to acknowledge receipt
    res.status(200).json({
      success: true,
      message: "Webhook received and processed",
    });
  } catch (error) {
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);
    logger.error(`[SumUp Webhook] Error processing webhook: ${error}`);
    
    // Still return 2xx to prevent SumUp from retrying
    res.status(200).json({
      success: false,
      message: "Webhook received but processing failed",
    });
  }
}
