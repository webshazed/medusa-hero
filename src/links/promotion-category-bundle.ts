import { defineLink } from "@medusajs/framework/utils"
import CategoryBundleConfigModule from "../modules/category-bundle-config"
import PromotionModule from "@medusajs/medusa/promotion"

export default defineLink(
    PromotionModule.linkable.promotion,
    CategoryBundleConfigModule.linkable.categoryBundleConfig
)
