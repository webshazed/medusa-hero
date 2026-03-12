import type {
    SubscriberArgs,
    SubscriberConfig,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateCartPromotionsWorkflow } from "@medusajs/core-flows"
import { PromotionActions } from "@medusajs/framework/utils"

/**
 * Global Coupon Quantity Guard
 * 
 * Automatically removes ALL promotion codes if the cart has fewer than 2 items total.
 * This enforces a global rule that coupons only apply to carts with 2+ items.
 */
export default async function globalPromotionGuardHandler({
    event,
    container,
}: SubscriberArgs<{ id: string }>) {
    const cartId = event.data.id
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    try {
        const { data: carts } = await query.graph({
            entity: "cart",
            fields: [
                "id",
                "items.*",
                "promotions.*",
            ],
            filters: {
                id: cartId,
            },
        })

        const cart = carts?.[0] as any
        if (!cart || !cart.promotions || cart.promotions.length === 0) {
            return
        }

        // Calculate total quantity of all items
        const totalQuantity = (cart.items || []).reduce(
            (acc: number, item: any) => acc + (item.quantity || 0), 
            0
        )

        // If total items < 2, remove all promotions
        if (totalQuantity < 2) {
            const promoCodes = cart.promotions
                .map((p: any) => p.code)
                .filter(Boolean)

            if (promoCodes.length > 0) {
                console.log(`[GlobalGuard] Removing all promos (${promoCodes.join(", ")}) from cart ${cartId} due to low quantity (${totalQuantity})`)
                
                await updateCartPromotionsWorkflow(container).run({
                    input: {
                        cart_id: cartId,
                        promo_codes: promoCodes,
                        action: PromotionActions.REMOVE
                    }
                })
            }
        }
    } catch (error) {
        console.error("Error in Global Promotion Guard:", error)
    }
}

export const config: SubscriberConfig = {
    event: "cart.updated",
}
