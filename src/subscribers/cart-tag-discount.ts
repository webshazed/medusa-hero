import type {
    SubscriberArgs,
    SubscriberConfig,
} from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { updateCartPromotionsWorkflow } from "@medusajs/core-flows"
import { PromotionActions } from "@medusajs/framework/utils"

const TARGET_PROMO_CODE = "BOTTLES5"
const TARGET_TAG_ID = "ptag_01KK9T8AVF86E3JS096PYJSTSX"
const TARGET_TAG_VALUE = "50CL Black Bottles"
const MIN_QUANTITY = 2

/**
 * Cart Tag Discount Subscriber
 *
 * When the cart is updated, checks if there are 2+ items with the
 * target tag ("50CL Black Bottles"). Auto-applies £5 discount if true,
 * auto-removes if false.
 */
export default async function cartTagDiscountHandler({
    event,
    container,
}: SubscriberArgs<{ id: string }>) {
    const cartId = event.data.id

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const cartService: any = container.resolve(Modules.CART)

    try {
        // Get the cart with items, tags, and promotions
        const { data: carts } = await query.graph({
            entity: "cart",
            fields: [
                "id",
                "items.*",
                "items.product.*",
                "items.product.tags.*",
                "promotions.*",
            ],
            filters: {
                id: cartId,
            },
        })

        const cart = carts?.[0] as any
        if (!cart) return

        // Count how many qualifying tagged products are in the cart
        let taggedItemCount = 0

        for (const item of cart.items || []) {
            if (!item) continue
            
            const tags = item.product?.tags || []
            const hasTag = tags.some((t: any) => 
                t.id === TARGET_TAG_ID || 
                t.value?.toLowerCase() === TARGET_TAG_VALUE.toLowerCase()
            )

            if (hasTag) {
                taggedItemCount += item.quantity
            }
        }

        const conditionMet = taggedItemCount >= MIN_QUANTITY
        const hasPromotionAlready = (cart.promotions || []).some(
            (p: any) => p.code === TARGET_PROMO_CODE
        )

        // If condition is met but promo not applied -> ADD promo
        if (conditionMet && !hasPromotionAlready) {
            await updateCartPromotionsWorkflow(container).run({
                input: {
                    cart_id: cartId,
                    promo_codes: [TARGET_PROMO_CODE],
                    action: PromotionActions.ADD
                }
            })
        } 
        // If condition is NOT met but promo IS applied -> REMOVE promo
        else if (!conditionMet && hasPromotionAlready) {
            await updateCartPromotionsWorkflow(container).run({
                input: {
                    cart_id: cartId,
                    promo_codes: [TARGET_PROMO_CODE],
                    action: PromotionActions.REMOVE
                }
            })
        }
    } catch (error) {
        console.error("Error in cart tag discount subscriber:", error)
    }
}

export const config: SubscriberConfig = {
    event: "cart.updated",
}
