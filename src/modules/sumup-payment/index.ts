import SumUpPaymentProviderService from "./service"
import { ModuleProvider, Modules } from "@medusajs/framework/utils"

console.log("[DEBUG] Loading SumUp Module index.ts");

export default ModuleProvider(Modules.PAYMENT, {
    services: [SumUpPaymentProviderService],
})
