import { createPromotionsWorkflow } from "@medusajs/medusa/core-flows"
import { Modules } from "@medusajs/framework/utils"
import { CATEGORY_BUNDLE_CONFIG_MODULE } from "../../modules/category-bundle-config"
import type CategoryBundleConfigModuleService from "../../modules/category-bundle-config/service"

createPromotionsWorkflow.hooks.promotionsCreated(
    async ({ promotions, additional_data }, { container }) => {
        if (!additional_data?.category_id) {
            return
        }

        const categoryBundleService: CategoryBundleConfigModuleService =
            container.resolve(CATEGORY_BUNDLE_CONFIG_MODULE)
        const linkService: any = container.resolve(Modules.LINK)

        for (const promotion of promotions) {
            // Create the category bundle config record
            const config = await categoryBundleService.createCategoryBundleConfigs({
                category_id: additional_data.category_id as string,
                min_quantity: (additional_data.min_quantity as number) || 2,
            })

            // Link it to the promotion
            await linkService.create({
                [Modules.PROMOTION]: {
                    promotion_id: promotion.id,
                },
                [CATEGORY_BUNDLE_CONFIG_MODULE]: {
                    category_bundle_config_id: config.id,
                },
            })
        }
    }
)
