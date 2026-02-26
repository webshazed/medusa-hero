import Medusa from "@medusajs/js-sdk"

// In the Medusa v2 Admin, the relative path or current origin is standard.
// We fallback to '/ ' as baseUrl if no explicit backend URL is provided,
// because the admin is normally served by the backend or under the proxy directly.
const backendUrl =
    (typeof process !== 'undefined' && process.env?.VITE_MEDUSA_BACKEND_URL) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MEDUSA_BACKEND_URL) ||
    "/"

export const sdk = new Medusa({
    baseUrl: backendUrl === "/" ? undefined : backendUrl,
    debug: false,
    auth: {
        type: "session",
    },
})
