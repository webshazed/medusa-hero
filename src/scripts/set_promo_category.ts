import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { CATEGORY_BUNDLE_CONFIG_MODULE } from "../modules/category-bundle-config"

export default async function ({ container }: { container: any }) {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    console.log("Fetching promotion GIN2...")
    const { data: promotions } = await query.graph({
        entity: "promotion",
        fields: ["id", "code"],
        filters: {
            code: "GIN2"
        }
    })

    if (!promotions || promotions.length === 0) {
        console.error("Promotion GIN2 not found!")
        return
    }
    const promo = promotions[0]
    console.log(`Found promotion: ${promo.id}`)

    console.log("Fetching category Gin...")
    const { data: categories } = await query.graph({
        entity: "product_category",
        fields: ["id", "name"],
        filters: {
            name: "Gin"
        }
    })

    if (!categories || categories.length === 0) {
        console.error("Category Gin not found!")
        return
    }
    const category = categories[0]
    console.log(`Found category: ${category.id}`)

    const categoryBundleService = container.resolve(CATEGORY_BUNDLE_CONFIG_MODULE)
    const linkService = container.resolve(ContainerRegistrationKeys.REMOTE_LINK)

    console.log("Checking for existing link...")
    const { data: existingLink } = await query.graph({
        entity: "promotion",
        fields: ["category_bundle_config.*"],
        filters: {
            id: promo.id,
        },
    })

    const existingConfig = (existingLink?.[0] as any)?.category_bundle_config

    if (existingConfig) {
        console.log(`Updating existing config: ${existingConfig.id}`)
        await categoryBundleService.updateCategoryBundleConfigs({
            id: existingConfig.id,
            category_id: category.id,
            min_quantity: 2,
        })
        console.log("Successfully updated config!")
        return
    }

    console.log("Creating new config...")
    let newConfig
    try {
        newConfig = await categoryBundleService.createCategoryBundleConfigs({
            category_id: category.id,
            min_quantity: 2,
        })
    } catch (err) {
        console.log('Error creating bundle config arrays format? trying array...');
        try {
            newConfig = (await categoryBundleService.createCategoryBundleConfigs([{
                category_id: category.id,
                min_quantity: 2,
            }]))[0]
        } catch (err2) {
            console.error("Failed to create config", err2)
            return;
        }
    }

    console.log(`Created config: ${newConfig.id}`)

    console.log("Creating link...")
    await linkService.create({
        [Modules.PROMOTION]: {
            promotion_id: promo.id,
        },
        [CATEGORY_BUNDLE_CONFIG_MODULE]: {
            category_bundle_config_id: newConfig.id,
        },
    })

    console.log("Successfully linked Promotion GIN2 to Category Gin!")
}
