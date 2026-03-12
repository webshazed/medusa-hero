// @ts-nocheck
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export default async function listPromotions({ container }: ExecArgs) {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: promotions } = await query.graph({
        entity: "promotion",
        fields: ["id", "code", "type", "is_automatic", "status"],
    })

    console.log("Current Promotions:")
    promotions.forEach(p => {
        console.log(`- ${p.code} (${p.id}): type=${p.type}, automatic=${p.is_automatic}, status=${p.status}`)
    })
}
