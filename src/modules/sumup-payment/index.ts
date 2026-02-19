import SumUpPaymentProviderService from "./service"

console.log("[DEBUG] Loading SumUp Module index.ts");
// Debug the export
console.log("[DEBUG] SumUp Service Export:", SumUpPaymentProviderService);

export default {
    service: SumUpPaymentProviderService,
}
