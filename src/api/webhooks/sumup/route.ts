import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { IPaymentModuleService } from "@medusajs/framework/types";

/**
 * SumUp Webhook Handler
 * 
 * Forwards webhook notifications from SumUp to the Payment Module.
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);
  const paymentModule: IPaymentModuleService = req.scope.resolve(Modules.PAYMENT);
  
  try {
    const body = req.body as Record<string, unknown>;
    const event_type = body.event_type as string;
    const id = body.id as string;

    logger.info(`[SumUp Webhook] Received webhook event: ${event_type}, id: ${id}`);

    // Process the event using the Payment Module
    // This will trigger the provider's getWebhookActionAndData and update payment status
    await paymentModule.processEvent({
      providerId: "sumup",
      payload: body,
      headers: req.headers,
    });

    // Always respond with 200 status code to acknowledge receipt
    res.status(200).json({
      success: true,
      message: "Webhook processed",
    });
  } catch (error) {
    logger.error(`[SumUp Webhook] Error processing webhook: ${error}`);
    
    // Return 200 even on error to prevent SumUp retries if we've already logged it
    // SumUp will retry if status is non-2xx
    res.status(200).json({
      success: false,
      message: "Webhook received but processing failed internally",
    });
  }
}
