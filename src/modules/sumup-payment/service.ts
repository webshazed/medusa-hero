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
        console.log("[DEBUG] SumUpPaymentProviderService.validateOptions called with:", JSON.stringify(options));
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

        const checkoutReference = `medusa_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

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
        const checkoutReference = `medusa_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

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
     * Handle SumUp webhooks (optional, can be expanded later).
     */
    async getWebhookActionAndData(
        data: { data: Record<string, unknown>; rawData: string | Buffer; headers: Record<string, unknown> }
    ): Promise<WebhookActionResult> {
        return {
            action: "not_supported",
        }
    }
}

export default SumUpPaymentProviderService
