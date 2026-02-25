import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

export default async function orderPlacedHandler({
    event: { data },
    container,
}: SubscriberArgs<{ id: string }>) {
    const logger = container.resolve("logger")
    const orderService = container.resolve(Modules.ORDER)
    const notificationService = container.resolve(Modules.NOTIFICATION)

    const adminEmail = process.env.NOTIFICATION_ADMIN_EMAIL

    try {
        // Fetch order details
        const order = await orderService.retrieveOrder(data.id, {
            relations: ["items", "shipping_address"],
        })

        const orderTotal = (Number(order.total) / 100).toFixed(2)
        const currency = order.currency_code?.toUpperCase() || "GBP"

        // Build items list for email
        const itemsList = order.items
            ?.map(
                (item: any) =>
                    `• ${item.title} (x${item.quantity}) — ${currency} ${(item.total / 100).toFixed(2)}`
            )
            .join("\n") || "No items"

        const shippingAddr = order.shipping_address
            ? `${order.shipping_address.first_name || ""} ${order.shipping_address.last_name || ""}\n${order.shipping_address.address_1 || ""}\n${order.shipping_address.city || ""}, ${order.shipping_address.postal_code || ""}\n${order.shipping_address.country_code?.toUpperCase() || ""}`
            : "N/A"

        // 1. Send admin notification email
        if (adminEmail) {
            await notificationService.createNotifications({
                to: adminEmail,
                channel: "email",
                template: "admin-order-notification",
                content: {
                    subject: `🛒 New Order Received — #${order.display_id}`,
                    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">New Order Received</h1>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 8px; font-weight: bold; color: #555;">Order ID:</td>
                  <td style="padding: 8px;">#${order.display_id}</td>
                </tr>
                <tr style="background: #f9f9f9;">
                  <td style="padding: 8px; font-weight: bold; color: #555;">Customer Email:</td>
                  <td style="padding: 8px;">${order.email || "N/A"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; font-weight: bold; color: #555;">Total:</td>
                  <td style="padding: 8px; font-size: 18px; font-weight: bold; color: #2a9d8f;">${currency} ${orderTotal}</td>
                </tr>
              </table>
              <h2 style="color: #555; font-size: 16px;">Items Ordered</h2>
              <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; font-size: 14px;">${itemsList}</pre>
              <h2 style="color: #555; font-size: 16px;">Shipping Address</h2>
              <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; font-size: 14px;">${shippingAddr}</pre>
            </div>
          `,
                },
            })

            logger.info(`Admin notification sent for order #${order.display_id}`)
        }

        // 2. Send customer confirmation email
        if (order.email) {
            await notificationService.createNotifications({
                to: order.email,
                channel: "email",
                template: "order-confirmation",
                content: {
                    subject: `Order Confirmed — #${order.display_id}`,
                    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333; text-align: center;">Thank You for Your Order!</h1>
              <p style="color: #666; text-align: center; font-size: 16px;">Your order <strong>#${order.display_id}</strong> has been confirmed.</p>
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
              <h2 style="color: #555; font-size: 16px;">Order Summary</h2>
              <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; font-size: 14px;">${itemsList}</pre>
              <table style="width: 100%; margin: 20px 0;">
                <tr>
                  <td style="padding: 8px; font-weight: bold; font-size: 18px;">Total:</td>
                  <td style="padding: 8px; font-weight: bold; font-size: 18px; text-align: right; color: #2a9d8f;">${currency} ${orderTotal}</td>
                </tr>
              </table>
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
              <p style="color: #999; font-size: 12px; text-align: center;">If you have any questions about your order, please reply to this email.</p>
            </div>
          `,
                },
            })

            logger.info(`Order confirmation email sent to ${order.email} for order #${order.display_id}`)
        }
    } catch (error) {
        logger.error(`Failed to send order notification emails: ${error}`)
    }
}

export const config: SubscriberConfig = {
    event: "order.placed",
}
