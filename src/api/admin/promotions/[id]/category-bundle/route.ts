import {
    MedusaRequest,
    MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { CATEGORY_BUNDLE_CONFIG_MODULE } from "../../../../../modules/category-bundle-config"
import type CategoryBundleConfigModuleService from "../../../../../modules/category-bundle-config/service"
import { LinkDefinition } from "@medusajs/framework/types"

/**
 * GET /admin/promotions/:id/category-bundle
 * Retrieve the category bundle config for a promotion
 */
export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const { id } = req.params
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    try {
        const { data } = await query.graph({
            entity: "promotion",
            fields: ["category_bundle_config.*"],
            filters: {
                id,
            },
        })

        const config = (data?.[0] as any)?.category_bundle_config

        if (!config) {
            return res.status(200).json({ category_bundle_config: null })
        }

        return res.status(200).json({ category_bundle_config: config })
    } catch (error) {
        return res.status(200).json({ category_bundle_config: null })
    }
}

/**
 * POST /admin/promotions/:id/category-bundle
 * Create or update the category bundle config for a promotion
 * Body: { category_id: string, min_quantity?: number }
 */
export async function POST(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const { id } = req.params
    const { category_id, min_quantity = 2 } = req.body as {
        category_id: string
        min_quantity?: number
    }

    if (!category_id) {
        return res.status(400).json({ message: "category_id is required" })
    }

    const categoryBundleService: CategoryBundleConfigModuleService =
        req.scope.resolve(CATEGORY_BUNDLE_CONFIG_MODULE)
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const linkService: any = req.scope.resolve(Modules.LINK)

    // Check if a config already exists
    let existingConfig: any = null
    try {
        const { data } = await query.graph({
            entity: "promotion",
            fields: ["category_bundle_config.*"],
            filters: {
                id,
            },
        })
        existingConfig = (data?.[0] as any)?.category_bundle_config
    } catch {
        // No existing config
    }

    if (existingConfig) {
        // Update existing
        const updated = await categoryBundleService.updateCategoryBundleConfigs({
            id: existingConfig.id,
            category_id,
            min_quantity,
        })

        return res.status(200).json({ category_bundle_config: updated })
    }

    // Create new config and link
    const config = await categoryBundleService.createCategoryBundleConfigs({
        category_id,
        min_quantity,
    })

    const linkDef: LinkDefinition = {
        [Modules.PROMOTION]: {
            promotion_id: id,
        },
        [CATEGORY_BUNDLE_CONFIG_MODULE]: {
            category_bundle_config_id: config.id,
        },
    }

    await linkService.create(linkDef)

    return res.status(200).json({ category_bundle_config: config })
}
