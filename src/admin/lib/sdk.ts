import Medusa from "@medusajs/js-sdk"

// __BACKEND_URL__ is injected at build time by Medusa's admin bundler
// from the `admin.backendUrl` setting in medusa-config.ts.
declare const __BACKEND_URL__: string | undefined

const backendUrl =
    __BACKEND_URL__ ??
    ((typeof import.meta !== 'undefined' && import.meta.env?.VITE_MEDUSA_BACKEND_URL) ||
        "/")

export const sdk = new Medusa({
    baseUrl: backendUrl,
    debug: false,
    auth: {
        type: "session",
    },
})
