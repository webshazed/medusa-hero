import { defineMiddlewares } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"

export default defineMiddlewares({
    routes: [
        {
            method: "POST",
            matcher: "/admin/promotions",
            additionalDataValidator: {
                category_id: z.string().optional(),
                min_quantity: z.number().min(1).optional(),
            },
        },
        {
            method: "POST",
            matcher: "/admin/promotions/:id",
            additionalDataValidator: {
                category_id: z.string().optional(),
                min_quantity: z.number().min(1).optional(),
            },
        },
    ],
})
