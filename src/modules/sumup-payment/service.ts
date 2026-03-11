import { AbstractPaymentProvider } from "@medusajs/framework/utils"
import {
    Logger,
    InitiatePaymentInput,
    InitiatePaymentOutput,
    AuthorizePaymentInput,
    AuthorizePaymentOutput,
    CapturePaymentInput,
    CapturePaymentOutput,
    RefundPaymentInput,
    RefundPaymentOutput,
    CancelPaymentInput,
    CancelPaymentOutput,
    DeletePaymentInput,
    DeletePaymentOutput,
    GetPaymentStatusInput,
    GetPaymentStatusOutput,
    RetrievePaymentInput,
    RetrievePaymentOutput,
    UpdatePaymentInput,
    UpdatePaymentOutput,
    WebhookActionResult,
} from "@medusajs/framework/types"

type SumUpOptions = {
    api_key: string
    merchant_code: string
}

type InjectedDependencies = {
    logger: Logger
}

class SumUpPaymentProviderService extends AbstractPaymentProvider<SumUpOptions> {
    static identifier = "sumup"

    protected logger_: Logger
    protected options_: SumUpOptions
    protected baseUrl = "https://api.sumup.com"

    constructor(container: InjectedDependencies, options: SumUpOptions) {
        super(container, options)
        this.logger_ = container.logger
        this.options_ = options
        this.logger_.info("[DEBUG] SumUpPaymentProviderService initialized");
        console.log("[DEBUG] SumUpPaymentProviderService constructor called");
    }

    static validateOptions(options: Record<any, any>) {
        if (!options.api_key) {
            throw new Error("SumUp API key is required in the provider's options.")
        }
        if (!options.merchant_code) {
            throw new Error("SumUp merchant code is required in the provider's options.")
        }
    }

    /**
     * Helper to make authenticated requests to SumUp API
     */
    private async sumupRequest<T = unknown>(
        path: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${path}`
        const response = await fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.options_.api_key}`,
                ...options.headers,
            },
        })

        if (!response.ok) {
            const errorBody = await response.text()
            this.logger_.error(
                `SumUp API error [${response.status}] ${path}: ${errorBody}`
            )
            throw new Error(
                `SumUp API error: ${response.status} - ${errorBody}`
            )
        }

        // Some endpoints return empty body (e.g. DELETE)
        const text = await response.text()
        if (!text) return {} as T
        return JSON.parse(text) as T
    }

    /**
     * Creates a SumUp checkout when customer selects this payment method.
     */
    async initiatePayment(
        input: InitiatePaymentInput
    ): Promise<InitiatePaymentOutput> {
        const { amount, currency_code, context } = input

        // Embed the Medusa payment session ID in the checkout reference
        // so we can map back from SumUp webhooks to the correct Medusa session
        const medusaSessionId = (input as any).data?.session_id || context?.idempotency_key || ""
        const checkoutReference = `medusa__${medusaSessionId}__${Date.now()}`

        this.logger_.info(`[SumUp] Creating checkout with reference: ${checkoutReference}, medusaSessionId: ${medusaSessionId}`)

        const storeUrls = (process.env.STORE_CORS || "http://localhost:8000").split(",")
        const storeUrl = process.env.STORE_URL || storeUrls[process.env.NODE_ENV === "production" ? storeUrls.length - 1 : 0]
        const returnUrl = `${storeUrl.replace(/\/$/, '')}/checkout/sumup-return`

        const checkout = await this.sumupRequest<{
            id: string
            checkout_reference: string
            status: string
            hosted_checkout_url?: string
        }>("/v0.1/checkouts", {
            method: "POST",
            body: JSON.stringify({
                checkout_reference: checkoutReference,
                amount: Number(amount),
                currency: currency_code.toUpperCase(),
                merchant_code: this.options_.merchant_code,
                description: `Order payment`,
                return_url: returnUrl,
                hosted_checkout: {
                    enabled: true,
                },
            }),
        })

        this.logger_.info(
            `SumUp checkout created: ${checkout.id} (ref: ${checkoutReference})`
        )

        return {
            id: checkout.id,
            data: {
                id: checkout.id,
                checkout_reference: checkout.checkout_reference,
                status: checkout.status,
                hosted_checkout_url: checkout.hosted_checkout_url,
            },
        }
    }

    /**
     * Authorizes the payment after customer completes the SumUp checkout.
     */
    async authorizePayment(
        input: AuthorizePaymentInput
    ): Promise<AuthorizePaymentOutput> {
        const checkoutId = input.data?.id as string

        if (!checkoutId) {
            return {
                status: "error",
                data: input.data || {},
            }
        }

        try {
            const checkout = await this.sumupRequest<{
                id: string
                status: string
                transaction_id?: string
                transaction_code?: string
                amount?: number
            }>(`/v0.1/checkouts/${checkoutId}`)

            const sumupStatus = checkout.status?.toUpperCase()

            // SumUp statuses: PENDING, PAID, FAILED, EXPIRED
            if (sumupStatus === "PAID") {
                return {
                    status: "authorized",
                    data: {
                        id: checkout.id,
                        transaction_id: checkout.transaction_id,
                        transaction_code: checkout.transaction_code,
                        status: checkout.status,
                        amount: checkout.amount,
                    },
                }
            } else if (sumupStatus === "FAILED" || sumupStatus === "EXPIRED") {
                return {
                    status: "error",
                    data: {
                        id: checkout.id,
                        status: checkout.status,
                    },
                }
            } else {
                // Still PENDING
                return {
                    status: "pending",
                    data: {
                        id: checkout.id,
                        status: checkout.status,
                    },
                }
            }
        } catch (error) {
            this.logger_.error(`SumUp authorize error: ${error}`)
            return {
                status: "error",
                data: {
                    ...input.data,
                    error: (error as Error).message,
                },
            }
        }
    }

    /**
     * SumUp auto-captures payments, so this is a no-op that verifies the status.
     */
    async capturePayment(
        input: CapturePaymentInput
    ): Promise<CapturePaymentOutput> {
        // SumUp automatically captures payments when the checkout is completed.
        // We just verify the status and return the existing data.
        const checkoutId = input.data?.id as string

        if (checkoutId) {
            try {
                const checkout = await this.sumupRequest<{
                    id: string
                    status: string
                    transaction_id?: string
                    transaction_code?: string
                }>(`/v0.1/checkouts/${checkoutId}`)

                return {
                    data: {
                        ...input.data,
                        status: checkout.status,
                        transaction_id: checkout.transaction_id,
                        transaction_code: checkout.transaction_code,
                    },
                }
            } catch (error) {
                this.logger_.error(`SumUp capture check error: ${error}`)
            }
        }

        return { data: input.data || {} }
    }

    /**
     * Refund a SumUp transaction.
     */
    async refundPayment(
        input: RefundPaymentInput
    ): Promise<RefundPaymentOutput> {
        const transactionId = input.data?.transaction_id as string

        if (!transactionId) {
            throw new Error("No SumUp transaction_id found for refund")
        }

        await this.sumupRequest(`/v0.1/me/refund/${transactionId}`, {
            method: "POST",
            body: JSON.stringify({
                amount: Number(input.amount),
            }),
        })

        this.logger_.info(
            `SumUp refund processed for transaction ${transactionId}, amount: ${input.amount}`
        )

        return {
            data: {
                ...input.data,
                refunded: true,
                refund_amount: Number(input.amount),
            },
        }
    }

    /**
     * Cancel/deactivate a SumUp checkout.
     */
    async cancelPayment(
        input: CancelPaymentInput
    ): Promise<CancelPaymentOutput> {
        const checkoutId = input.data?.id as string

        if (checkoutId) {
            try {
                await this.sumupRequest(`/v0.1/checkouts/${checkoutId}`, {
                    method: "DELETE",
                })
                this.logger_.info(`SumUp checkout ${checkoutId} cancelled`)
            } catch (error) {
                this.logger_.warn(
                    `SumUp cancel failed (may already be completed): ${error}`
                )
            }
        }

        return {
            data: {
                ...input.data,
                cancelled: true,
            },
        }
    }

    /**
     * Delete/deactivate a SumUp checkout session.
     */
    async deletePayment(
        input: DeletePaymentInput
    ): Promise<DeletePaymentOutput> {
        const checkoutId = input.data?.id as string

        if (checkoutId) {
            try {
                await this.sumupRequest(`/v0.1/checkouts/${checkoutId}`, {
                    method: "DELETE",
                })
            } catch (error) {
                // Checkout may already be completed or expired, that's fine
                this.logger_.warn(`SumUp delete checkout: ${error}`)
            }
        }

        return { data: input.data || {} }
    }

    /**
     * Get the current payment status from SumUp.
     */
    async getPaymentStatus(
        input: GetPaymentStatusInput
    ): Promise<GetPaymentStatusOutput> {
        const checkoutId = input.data?.id as string

        if (!checkoutId) {
            return { status: "pending" }
        }

        try {
            const checkout = await this.sumupRequest<{
                status: string
            }>(`/v0.1/checkouts/${checkoutId}`)

            const sumupStatus = checkout.status?.toUpperCase()

            switch (sumupStatus) {
                case "PAID":
                    return { status: "authorized" }
                case "FAILED":
                    return { status: "error" }
                case "EXPIRED":
                    return { status: "canceled" }
                default:
                    return { status: "pending" }
            }
        } catch (error) {
            this.logger_.error(`SumUp getPaymentStatus error: ${error}`)
            return { status: "error" }
        }
    }

    /**
     * Update a payment — re-creates the checkout with new amount.
     */
    async updatePayment(
        input: UpdatePaymentInput
    ): Promise<UpdatePaymentOutput> {
        const { amount, currency_code } = input
        const checkoutId = input.data?.id as string

        // Delete the old checkout if it exists
        if (checkoutId) {
            try {
                await this.sumupRequest(`/v0.1/checkouts/${checkoutId}`, {
                    method: "DELETE",
                })
            } catch (error) {
                // Ignore errors on deletion
            }
        }

        // Create a new checkout with the updated amount
        // Embed the Medusa payment session ID in the checkout reference
        const medusaSessionId = (input as any).data?.session_id || ""
        const checkoutReference = `medusa__${medusaSessionId}__${Date.now()}`

        this.logger_.info(`[SumUp] Updating checkout with reference: ${checkoutReference}, medusaSessionId: ${medusaSessionId}`)

        const storeUrls = (process.env.STORE_CORS || "http://localhost:8000").split(",")
        const storeUrl = process.env.STORE_URL || storeUrls[process.env.NODE_ENV === "production" ? storeUrls.length - 1 : 0]
        const returnUrl = `${storeUrl.replace(/\/$/, '')}/checkout/sumup-return`

        const checkout = await this.sumupRequest<{
            id: string
            checkout_reference: string
            status: string
            hosted_checkout_url?: string
        }>("/v0.1/checkouts", {
            method: "POST",
            body: JSON.stringify({
                checkout_reference: checkoutReference,
                amount: Number(amount),
                currency: currency_code.toUpperCase(),
                merchant_code: this.options_.merchant_code,
                description: `Order payment (updated)`,
                return_url: returnUrl,
                hosted_checkout: {
                    enabled: true,
                },
            }),
        })

        return {
            data: {
                id: checkout.id,
                checkout_reference: checkout.checkout_reference,
                status: checkout.status,
                hosted_checkout_url: checkout.hosted_checkout_url,
            },
        }
    }

    /**
     * Retrieve payment details from SumUp.
     */
    async retrievePayment(
        input: RetrievePaymentInput
    ): Promise<RetrievePaymentOutput> {
        const checkoutId = input.data?.id as string

        if (!checkoutId) {
            return { data: input.data || {} }
        }

        try {
            const checkout = await this.sumupRequest<{
                id: string
                status: string
                amount: number
                transaction_id?: string
                transaction_code?: string
            }>(`/v0.1/checkouts/${checkoutId}`)

            return {
                data: {
                    ...input.data,
                    ...checkout,
                },
            }
        } catch (error) {
            this.logger_.error(`SumUp retrievePayment error: ${error}`)
            return { data: input.data || {} }
        }
    }

    /**
     * Extract the Medusa payment session ID from our checkout reference.
     * Format: medusa__{payses_xxx}__{timestamp}
     */
    private extractMedusaSessionId(checkoutReference: string): string | null {
        if (!checkoutReference) return null
        const parts = checkoutReference.split("__")
        // parts[0] = "medusa", parts[1] = Medusa session ID, parts[2] = timestamp
        if (parts.length >= 2 && parts[1]) {
            return parts[1]
        }
        return null
    }

    /**
     * Handle SumUp webhooks to mark payments as authorized asynchronously.
     * This is the critical safety net that ensures orders are created even
     * if the storefront return page times out.
     */
    async getWebhookActionAndData(
        payload: { data: Record<string, unknown>; rawData: string | Buffer; headers: Record<string, unknown> }
    ): Promise<WebhookActionResult> {
        const { data } = payload
        const eventType = data.event_type as string
        const checkoutId = data.id as string

        this.logger_.info(`[SumUp Webhook] Processing event ${eventType} for checkout ${checkoutId}`)

        if (eventType !== "CHECKOUT_STATUS_CHANGED" || !checkoutId) {
            return { action: "not_supported" }
        }

        try {
            // Verify checkout status directly with SumUp API
            const checkout = await this.sumupRequest<{
                status: string
                amount: number
                checkout_reference: string
            }>(`/v0.1/checkouts/${checkoutId}`)

            const sumupStatus = checkout.status?.toUpperCase()
            this.logger_.info(`[SumUp Webhook] Checkout ${checkoutId} status: ${sumupStatus}, reference: ${checkout.checkout_reference}`)

            // Extract the Medusa payment session ID from the checkout reference
            const medusaSessionId = this.extractMedusaSessionId(checkout.checkout_reference)

            if (!medusaSessionId) {
                this.logger_.error(`[SumUp Webhook] Could not extract Medusa session ID from reference: ${checkout.checkout_reference}`)
                return { action: "not_supported" }
            }

            this.logger_.info(`[SumUp Webhook] Mapped to Medusa session: ${medusaSessionId}`)

            if (sumupStatus === "PAID") {
                return {
                    action: "authorized",
                    data: {
                        session_id: medusaSessionId,
                        amount: checkout.amount,
                    },
                }
            }

            if (sumupStatus === "FAILED") {
                return {
                    action: "failed",
                    data: {
                        session_id: medusaSessionId,
                        amount: checkout.amount,
                    },
                }
            }

            return { action: "not_supported" }
        } catch (error) {
            this.logger_.error(`[SumUp Webhook] Error verifying checkout ${checkoutId}: ${error}`)
            return { action: "not_supported" }
        }
    }
}

export default SumUpPaymentProviderService
