import type {
    SubscriberArgs,
    SubscriberConfig,
} from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { updateCartPromotionsWorkflow } from "@medusajs/core-flows"
import { PromotionActions } from "@medusajs/framework/utils"

/**
 * Cart Promotion Guard Subscriber
 *
 * When promotions are added to a cart, this checks whether any of them
 * have a category bundle requirement. If the cart doesn't have enough
 * items from the required category, the promotion is removed.
 */
export default async function cartPromotionGuardHandler({
    event,
    container,
}: SubscriberArgs<{ id: string }>) {
    const cartId = event.data.id

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const cartService: any = container.resolve(Modules.CART)

    try {
        // Get the cart with its items and promotions
        const { data: carts } = await query.graph({
            entity: "cart",
            fields: [
                "id",
                "items.*",
                "items.product.*",
                "items.product.categories.*",
                "items.adjustments.*",
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

        // For each promotion on the cart, check if it has a category bundle config
        const promosToRemoveCodes: string[] = []

        for (const promo of cart.promotions) {
            if (!promo) continue

            let bundleConfig: any = null

            try {
                const { data: promoData } = await query.graph({
                    entity: "promotion",
                    fields: ["category_bundle_config.*"],
                    filters: {
                        id: promo.id,
                    },
                })
                bundleConfig = (promoData?.[0] as any)?.category_bundle_config
            } catch {
                // No bundle config for this promotion, skip
                continue
            }

            if (!bundleConfig || !bundleConfig.category_id) {
                continue
            }

            // Count the total quantity of items from the required category
            let categoryItemCount = 0

            for (const item of cart.items || []) {
                if (!item) continue
                const categories = item.product?.categories || []
                const matchesCategory = categories.some(
                    (cat: any) => cat.id === bundleConfig.category_id
                )

                if (matchesCategory) {
                    categoryItemCount += item.quantity
                }
            }

            // If not enough items from the category, mark promotion for removal
            if (categoryItemCount < bundleConfig.min_quantity) {
                if (promo.code) {
                    promosToRemoveCodes.push(promo.code)
                }
            }
        }

        // Completely remove promos from the cart that don't meet the requirement
        if (promosToRemoveCodes.length > 0) {
            await updateCartPromotionsWorkflow(container).run({
                input: {
                    cart_id: cartId,
                    promo_codes: promosToRemoveCodes,
                    action: PromotionActions.REMOVE
                }
            })
        }
    } catch (error) {
        console.error("Error in cart promotion guard:", error)
    }
}

export const config: SubscriberConfig = {
    event: "cart.updated",
}
