import { defineWidgetConfig } from "@medusajs/admin-sdk"

const HideLogoWidget = () => {
    return (
        <style>
            {`
        /* Target the Medusa logo/AvatarBox on the login page specifically */
        div.max-w-\\[280px\\].flex-col.items-center > div.bg-ui-button-neutral {
          display: none !important;
        }
      `}
        </style>
    )
}

export const config = defineWidgetConfig({
    zone: "login.before",
})

export default HideLogoWidget
