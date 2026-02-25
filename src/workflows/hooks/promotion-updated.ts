import { updatePromotionsWorkflow } from "@medusajs/medusa/core-flows"
import { Modules } from "@medusajs/framework/utils"
import { CATEGORY_BUNDLE_CONFIG_MODULE } from "../../modules/category-bundle-config"
import type CategoryBundleConfigModuleService from "../../modules/category-bundle-config/service"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

updatePromotionsWorkflow.hooks.promotionsUpdated(
    async ({ promotions, additional_data }, { container }) => {
        if (!additional_data?.category_id) {
            return
        }

        const categoryBundleService: CategoryBundleConfigModuleService =
            container.resolve(CATEGORY_BUNDLE_CONFIG_MODULE)
        const query = container.resolve(ContainerRegistrationKeys.QUERY)
        const linkService: any = container.resolve(Modules.LINK)

        for (const promotion of promotions) {
            // Check if a config already exists for this promotion
            const { data: existingLinks } = await query.graph({
                entity: "promotion",
                fields: ["category_bundle_config.*"],
                filters: {
                    id: promotion.id,
                },
            })

            const existingConfig = (existingLinks?.[0] as any)?.category_bundle_config

            if (existingConfig) {
                // Update the existing config
                await categoryBundleService.updateCategoryBundleConfigs({
                    id: existingConfig.id,
                    category_id: additional_data.category_id as string,
                    min_quantity: (additional_data.min_quantity as number) || existingConfig.min_quantity,
                })
            } else {
                // Create a new config and link it
                const config = await categoryBundleService.createCategoryBundleConfigs({
                    category_id: additional_data.category_id as string,
                    min_quantity: (additional_data.min_quantity as number) || 2,
                })

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
    }
)
