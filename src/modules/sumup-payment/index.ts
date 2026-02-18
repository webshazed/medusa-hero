import SumUpPaymentProviderService from "./service"

console.log("[DEBUG] Loading SumUp Module index.ts");
console.log(`[DEBUG] Service Import Type: ${typeof SumUpPaymentProviderService}`);
console.log(`[DEBUG] Service Import Value:`, SumUpPaymentProviderService);
console.log(`[DEBUG] Service Import Prototype:`, SumUpPaymentProviderService?.prototype);

export default {
    services: [SumUpPaymentProviderService],
}
