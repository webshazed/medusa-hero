import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules, PaymentWebhookEvents } from "@medusajs/framework/utils";

/**
 * SumUp Webhook Handler
 * 
 * Emits a payment.webhook_received event to be processed by Medusa's standard
 * payment webhook handler.
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);
  const eventBus = req.scope.resolve(Modules.EVENT_BUS);
  
  try {
    const body = req.body as Record<string, unknown>;
    const event_type = body.event_type as string;
    const id = body.id as string;

    logger.info(`[SumUp Webhook] Received webhook event: ${event_type}, id: ${id}`);

    // Emit the standard Medusa payment webhook event
    // This will be picked up by the payment-webhook subscriber and processed via workflow
    await eventBus.emit({
      name: PaymentWebhookEvents.WebhookReceived,
      data: {
        provider: "sumup",
        payload: {
          data: body,
          rawData: (req as any).rawBody || JSON.stringify(body),
          headers: req.headers,
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Webhook event emitted",
    });
  } catch (error) {
    logger.error(`[SumUp Webhook] Error emitting webhook event: ${error}`);
    
    // Always respond with 200 to acknowledge receipt to SumUp
    res.status(200).json({
      success: false,
      message: "Internal error occurred",
    });
  }
}
