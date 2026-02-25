import { model } from "@medusajs/framework/utils"

export const CategoryBundleConfig = model.define("category_bundle_config", {
    id: model.id().primaryKey(),
    category_id: model.text(),
    min_quantity: model.number().default(2),
})
