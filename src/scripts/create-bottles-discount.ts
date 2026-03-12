// @ts-nocheck
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * Creates a £5 fixed discount promotion for 2+ 50CL Black Bottles.
 * 
 * Run with: npx medusa exec src/scripts/create-bottles-discount.ts
 */
export default async function createBottlesDiscount({ container }: ExecArgs) {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const promotionModuleService = container.resolve(Modules.PROMOTION)

    console.log("🔍 Checking if BOTTLES5 promotion already exists...")

    const { data: existingPromotions } = await query.graph({
        entity: "promotion",
        fields: ["id", "code"],
        filters: {
            code: "BOTTLES5",
        },
    })

    if (existingPromotions.length > 0) {
        console.log(`\n⚠️  Promotion BOTTLES5 already exists (id: ${existingPromotions[0].id}). Skipping creation.`)
        return
    }

    console.log(`\n🎟️  Creating BOTTLES5 promotion (£5.00 fixed discount)...`)

    // Create a standard promotion with application method "fixed"
    const promotion = await promotionModuleService.createPromotions({
        code: "BOTTLES5",
        type: "standard",
        is_automatic: true,
        application_method: {
            type: "fixed",
            target_type: "order",
            value: 5.00, // £5.00 discount
            currency_code: "gbp",
        },
    })

    console.log(`\n✅ Successfully created promotion: BOTTLES5 (${promotion.id})`)
}
