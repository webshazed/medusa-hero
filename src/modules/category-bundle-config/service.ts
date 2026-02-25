import { MedusaService } from "@medusajs/framework/utils"
import { CategoryBundleConfig } from "./models/category-bundle-config"

class CategoryBundleConfigModuleService extends MedusaService({
    CategoryBundleConfig,
}) { }

export default CategoryBundleConfigModuleService
