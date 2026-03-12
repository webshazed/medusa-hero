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
        console.log(`\n🗑️  Deleting existing BOTTLES5 promotion (id: ${existingPromotions[0].id})...`)
        await promotionModuleService.deletePromotions([existingPromotions[0].id])
        console.log("✅ Deletion complete.")
    }

    console.log(`\n🎟️  Creating BOTTLES5 promotion (Standard, Manual)...`)

    try {
        const promotion = await promotionModuleService.createPromotions({
            code: "BOTTLES5",
            type: "standard",
            is_automatic: false, // CRITICAL: This prevents Medusa's engine from overriding our subscriber
            status: "active",
            application_method: {
                type: "fixed",
                target_type: "order",
                value: 5.00,
                currency_code: "gbp",
            },
        })
        console.log(`\n✅ Successfully created promotion: ${promotion.code} (${promotion.id})`)
    } catch (err: any) {
        console.error("\n❌ Failed to create promotion.")
        console.error("Error message:", err.message)
        throw err
    }
}
