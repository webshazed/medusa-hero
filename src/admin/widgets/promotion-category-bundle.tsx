import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminPromotion } from "@medusajs/framework/types"
import { Container, Heading, Text, Input, Button, toast, Select } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { sdk } from "../lib/sdk"

export const config = defineWidgetConfig({
    zone: "promotion.details.after",
})

// Define the shape of our config
type CategoryBundleConfig = {
    id: string
    category_id: string
    min_quantity: number
}

const CategoryBundleWidget = ({ data }: DetailWidgetProps<AdminPromotion>) => {
    const [config, setConfig] = useState<CategoryBundleConfig | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([])

    // Form state
    const [categoryId, setCategoryId] = useState<string>("")
    const [minQuantity, setMinQuantity] = useState<string>("2")

    useEffect(() => {
        // Fetch categories for the dropdown
        const fetchCategories = async () => {
            try {
                // Use the raw fetch client to be absolutely certain of the API payload
                const response = await sdk.client.fetch(`/admin/product-categories?limit=100`, {
                    method: "GET"
                })
                setCategories(response.product_categories || [])
            } catch (err) {
                console.error("Failed to fetch product categories:", err)
                toast.error("Failed to load categories")
            }
        }

        // Fetch existing bundle config
        const fetchConfig = async () => {
            try {
                const response = await sdk.client.fetch(`/admin/promotions/${data.id}/category-bundle`, {
                    method: "GET"
                })

                if (response.category_bundle_config) {
                    setConfig(response.category_bundle_config)
                    setCategoryId(response.category_bundle_config.category_id)
                    setMinQuantity(response.category_bundle_config.min_quantity.toString())
                }
            } catch (err) {
                console.error("Failed to fetch bundle config", err)
            } finally {
                setIsLoading(false)
            }
        }

        fetchCategories()
        fetchConfig()
    }, [data.id])

    const handleSave = async () => {
        if (!categoryId) {
            toast.error("Please select a category")
            return
        }

        const qty = parseInt(minQuantity, 10)
        if (isNaN(qty) || qty < 1) {
            toast.error("Minimum quantity must be at least 1")
            return
        }

        setIsSaving(true)
        try {
            const response = await sdk.client.fetch(`/admin/promotions/${data.id}/category-bundle`, {
                method: "POST",
                body: {
                    category_id: categoryId,
                    min_quantity: qty,
                },
            })

            setConfig(response.category_bundle_config)
            toast.success("Category bundle requirement saved successfully")
        } catch (err) {
            console.error(err)
            toast.error("Failed to save category bundle requirement")
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return null
    }

    return (
        <Container className="divide-y p-0 mt-4">
            <div className="flex items-center justify-between px-6 py-4">
                <div>
                    <Heading level="h2">Category Bundle Requirement</Heading>
                    <Text className="text-ui-fg-subtle mt-1">
                        Restrict this promotion to only apply when a minimum quantity of items from a specific category are in the cart.
                    </Text>
                </div>
            </div>
            <div className="flex flex-col gap-y-4 px-6 py-4">

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Text className="mb-2 txt-medium text-ui-fg-subtle font-medium">Product Category</Text>
                        <Select value={categoryId} onValueChange={setCategoryId}>
                            <Select.Trigger>
                                <Select.Value placeholder="Select a category" />
                            </Select.Trigger>
                            <Select.Content>
                                {categories.map((cat) => (
                                    <Select.Item key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </Select.Item>
                                ))}
                            </Select.Content>
                        </Select>
                    </div>

                    <div>
                        <Text className="mb-2 txt-medium text-ui-fg-subtle font-medium">Minimum Quantity</Text>
                        <Input
                            type="number"
                            min={1}
                            value={minQuantity}
                            onChange={(e) => setMinQuantity(e.target.value)}
                            placeholder="e.g. 2"
                        />
                    </div>
                </div>

                <div className="flex justify-end mt-4">
                    <Button
                        variant="secondary"
                        isLoading={isSaving}
                        onClick={handleSave}
                    >
                        Save Requirement
                    </Button>
                </div>
            </div>
        </Container>
    )
}

export default CategoryBundleWidget
