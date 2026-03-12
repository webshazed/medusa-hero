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
    }

    console.log(`\n🎟️  Creating BOTTLES5 promotion (£5.00 fixed discount)...`)

    // Create a buyget promotion that natively demands 2+ items to trigger
    const promotion = await promotionModuleService.createPromotions({
        code: "BOTTLES5",
        type: "buyget",
        is_automatic: true, // Native engine can safely auto-apply it because it guards itself
        status: "active",
        buy_rules: [
            {
                attribute: "product_tags.id",
                operator: "in",
                values: ["ptag_01KK9T8AVF86E3JS096PYJSTSX"]
            }
        ],
        buy_rules_min_quantity: 2,
        application_method: {
            type: "fixed",
            target_type: "items",
            allocation: "across_targets",
            value: 5.00,
            currency_code: "gbp",
            apply_to_quantity: 999,
            target_rules: [
                {
                    attribute: "product_tags.id",
                    operator: "in",
                    values: ["ptag_01KK9T8AVF86E3JS096PYJSTSX"]
                }
            ]
        },
    })

    console.log(`\n✅ Successfully created promotion: BOTTLES5 (${promotion.id})`)
}
