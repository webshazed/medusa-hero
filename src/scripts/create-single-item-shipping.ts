import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * Creates a £5 flat-rate shipping option for single-item orders.
 * 
 * Run with: npx medusa exec src/scripts/create-single-item-shipping.ts
 * 
 * This script:
 * 1. Finds the existing shipping option (£8 flat rate)
 * 2. Renames it to "Standard Shipping (2+ items)"
 * 3. Creates a new £5 shipping option "Standard Shipping (1 item)" in the same service zone
 */
export default async function createSingleItemShipping({ container }: ExecArgs) {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)

    console.log("🔍 Looking for existing shipping options...")

    // Find all existing shipping options
    const { data: existingOptions } = await query.graph({
        entity: "shipping_option",
        fields: [
            "id",
            "name",
            "price_type",
            "provider_id",
            "shipping_option_type_id",
            "service_zone_id",
            "shipping_profile_id",
            "prices.*",
            "type.*",
            "rules.*",
            "service_zone.*",
        ],
        filters: {},
    })

    console.log(`Found ${existingOptions.length} shipping options:`)
    for (const opt of existingOptions) {
        console.log(`  - ${opt.name} (id: ${opt.id}, price_type: ${opt.price_type})`)
    }

    // Find the £8 flat-rate shipping option (non-pickup)
    const flatRateOption = existingOptions.find(
        (opt: any) => opt.price_type === "flat" && opt.name !== "Pick up"
    ) as any

    if (!flatRateOption) {
        console.error("❌ Could not find an existing flat-rate shipping option. Aborting.")
        return
    }

    console.log(`\n✅ Found flat-rate option: "${flatRateOption.name}" (${flatRateOption.id})`)
    console.log(`   Service Zone: ${flatRateOption.service_zone_id}`)
    console.log(`   Provider: ${flatRateOption.provider_id}`)
    console.log(`   Profile: ${flatRateOption.shipping_profile_id}`)

    // Check if we already created the £5 option
    const existingSingleOption = existingOptions.find(
        (opt: any) => opt.name === "Standard Shipping (1 item)"
    )

    if (existingSingleOption) {
        console.log("\n⚠️  'Standard Shipping (1 item)' already exists. Skipping creation.")
        return
    }

    // Rename the existing £8 option
    console.log(`\n📝 Renaming existing option to "Standard Shipping (2+ items)"...`)
    await fulfillmentModuleService.updateShippingOptions({
        id: flatRateOption.id,
        name: "Standard Shipping (2+ items)",
    })

    // Create the new £5 option in the same service zone
    console.log(`\n📦 Creating "Standard Shipping (1 item)" at £5.00...`)

    // Get price details from the existing option
    const existingPrices = flatRateOption.prices || []
    const currencyCode = existingPrices.length > 0 ? existingPrices[0].currency_code : "gbp"

    const newOption = await fulfillmentModuleService.createShippingOptions({
        name: "Standard Shipping (1 item)",
        price_type: "flat",
        provider_id: flatRateOption.provider_id,
        service_zone_id: flatRateOption.service_zone_id,
        shipping_profile_id: flatRateOption.shipping_profile_id,
        type: {
            label: flatRateOption.type?.label || "Standard",
            description: flatRateOption.type?.description || "Standard shipping for single items",
            code: "standard-single",
        },
        prices: [
            {
                currency_code: currencyCode,
                amount: 500, // £5.00 in minor units
            },
        ],
        rules: flatRateOption.rules?.map((r: any) => ({
            attribute: r.attribute,
            operator: r.operator,
            value: r.value,
        })) || [],
    })

    console.log(`\n✅ Successfully created shipping option: "${newOption.name}" (${newOption.id})`)
    console.log(`\n📋 Summary:`)
    console.log(`   - "Standard Shipping (1 item)" → £5.00`)
    console.log(`   - "Standard Shipping (2+ items)" → £8.00`)
    console.log(`   - Pickup option → unchanged`)
    console.log(`\nDone! ✨`)
}
