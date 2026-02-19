# SumUp Payment Provider Integration

This document describes the SumUp payment provider integration in your Medusa backend.

## Overview

SumUp is integrated as a custom payment provider in your Medusa v2 backend. The integration allows customers to pay for orders using SumUp's hosted checkout.

## Configuration

### Environment Variables

The following environment variables are required to use the SumUp payment provider:

```env
SUMUP_API_KEY=sup_sk_XHWGEMboaB83r0JKUPpwlJqTuQ21DnEWH
SUMUP_MERCHANT_CODE=MKB7GW9W
```

These are already configured in your `.env` file.

## Architecture

### Payment Provider Service

**Location**: `src/modules/sumup-payment/service.ts`

The SumUp payment provider extends `AbstractPaymentProvider` and implements the following methods:

| Method | Purpose |
| :--- | :--- |
| `initiatePayment()` | Creates a SumUp checkout when customer selects this payment method |
| `authorizePayment()` | Verifies payment status after customer completes the checkout |
| `capturePayment()` | Verifies capture status (SumUp auto-captures) |
| `refundPayment()` | Processes refunds via SumUp API |
| `cancelPayment()` | Cancels/deactivates a checkout |
| `deletePayment()` | Deletes a payment session |
| `getPaymentStatus()` | Retrieves current payment status from SumUp |
| `updatePayment()` | Updates payment amount by creating a new checkout |
| `retrievePayment()` | Retrieves full payment details |

### Module Registration

**Location**: `medusa-config.ts`

The SumUp payment provider is registered in the payment module configuration:

```typescript
{
  resolve: "@medusajs/payment",
  options: {
    providers: [
      {
        resolve: "src/modules/sumup-payment",
        id: "sumup",
        options: {
          api_key: process.env.SUMUP_API_KEY,
          merchant_code: process.env.SUMUP_MERCHANT_CODE,
        },
      },
    ],
  },
}
```

## Admin Configuration

Once the backend is running, the SumUp payment provider will be available in the Medusa Admin dashboard.

### Enable SumUp in a Region

1. Log in to **Medusa Admin** (typically at `http://localhost:9000`)
2. Navigate to **Settings** → **Regions**
3. Select or create a **Region**
4. Click **Edit Region Details**
5. In the **Payment Providers** section, check the **SumUp** checkbox
6. Save the region

Once enabled, customers will be able to select SumUp as a payment method during checkout.

## Payment Flow

### Customer Checkout Flow

1. **Customer selects SumUp** as their payment method
2. **Backend creates a SumUp checkout** via `initiatePayment()`:
   - Calls `POST /v0.1/checkouts`
   - Returns a `hosted_checkout_url` for the customer
3. **Customer is redirected** to SumUp's hosted checkout page
4. **Customer completes payment** on SumUp's page
5. **SumUp redirects** customer back to your storefront
6. **Backend verifies payment** via `authorizePayment()`:
   - Calls `GET /v0.1/checkouts/{id}`
   - Checks if status is `PAID`
7. **Order is completed** if payment is authorized

### Webhook Flow (Optional)

SumUp can send webhooks to notify your backend of status changes:

**Webhook Endpoint**: `POST /webhooks/sumup`

**Webhook Payload**:
```json
{
  "event_type": "CHECKOUT_STATUS_CHANGED",
  "id": "checkout-id"
}
```

**Handler Location**: `src/api/webhooks/sumup/route.ts`

To enable webhooks:

1. Log in to your **SumUp Dashboard**
2. Navigate to **Settings** → **Webhooks** or **API Settings**
3. Add your webhook URL: `https://your-backend-url/webhooks/sumup`
4. Subscribe to `CHECKOUT_STATUS_CHANGED` events

## API Mappings

| Medusa Action | SumUp API Endpoint | Purpose |
| :--- | :--- | :--- |
| Initialize Payment | `POST /v0.1/checkouts` | Create a checkout session |
| Get Payment Status | `GET /v0.1/checkouts/{id}` | Retrieve checkout details |
| Capture Payment | (Auto-captured by SumUp) | Verify capture status |
| Refund Payment | `POST /v0.1/me/refund/{transaction_id}` | Process refunds |
| Cancel Payment | `DELETE /v0.1/checkouts/{id}` | Cancel/deactivate checkout |

## Testing

### Test Mode

SumUp provides a sandbox environment for testing. Use the test API key (prefix: `sk_test_`) in your `.env` file.

### Test Payment Cards

Use the following test card details on SumUp's hosted checkout:

- **Card Number**: `4111 1111 1111 1111`
- **Expiry**: Any future date (e.g., `12/25`)
- **CVC**: Any 3 digits (e.g., `123`)

## Troubleshooting

### Issue: SumUp provider not appearing in Admin

**Solution**: 
1. Ensure `SUMUP_API_KEY` and `SUMUP_MERCHANT_CODE` are set in `.env`
2. Restart the Medusa backend: `npm run dev`
3. Clear browser cache and refresh the Admin dashboard

### Issue: Checkout creation fails

**Solution**:
1. Check the backend logs for error messages
2. Verify the API key is valid (should start with `sup_sk_`)
3. Verify the merchant code is correct
4. Ensure the currency code is supported by SumUp

### Issue: Payment not captured

**Solution**:
1. SumUp auto-captures payments when the checkout is completed
2. Check the SumUp Dashboard to verify the transaction was created
3. Review backend logs for any authorization errors

## Security Considerations

1. **API Key**: Never commit the `.env` file with real API keys to version control. Use environment variables in production.
2. **Webhook Verification**: In production, implement webhook signature verification to ensure requests come from SumUp.
3. **HTTPS**: Always use HTTPS for webhook endpoints in production.
4. **PCI Compliance**: SumUp's hosted checkout handles PCI compliance. Never store card details in your backend.

## References

- [SumUp API Documentation](https://developer.sumup.com/api)
- [SumUp Webhooks](https://developer.sumup.com/online-payments/webhooks/)
- [Medusa Payment Module](https://docs.medusajs.com/resources/commerce-modules/payment)
- [Medusa Payment Provider Guide](https://docs.medusajs.com/resources/references/payment/provider)

## Support

For issues with the SumUp integration:

1. Check the [SumUp Developer Portal](https://developer.sumup.com/)
2. Review the backend logs for error messages
3. Contact SumUp support for API-related issues
