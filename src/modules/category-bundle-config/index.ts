import { Module } from "@medusajs/framework/utils"
import CategoryBundleConfigModuleService from "./service"

export const CATEGORY_BUNDLE_CONFIG_MODULE = "categoryBundleConfigModuleService"

export default Module(CATEGORY_BUNDLE_CONFIG_MODULE, {
    service: CategoryBundleConfigModuleService,
})
