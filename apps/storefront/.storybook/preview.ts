import type { Preview } from "@storybook/react"
import { withThemeByClassName } from "@storybook/addon-themes"
import "../src/styles/globals.css"

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    options: {
      storySort: {
        order: ["Introduction", "Foundations", "Components", "Modules", "*"],
      },
    },
    a11y: {
      element: "#storybook-root",
      config: {},
      options: {},
    },
    layout: "centered",
    backgrounds: {
      default: "light",
      values: [
        { name: "light", value: "#ffffff" },
        { name: "neutral", value: "#f5f5f5" },
        { name: "dark", value: "#0a0a0a" },
      ],
    },
    viewport: {
      viewports: {
        mobile: { name: "Mobile (375)", styles: { width: "375px", height: "667px" } },
        tablet: { name: "Tablet (768)", styles: { width: "768px", height: "1024px" } },
        desktop: { name: "Desktop (1280)", styles: { width: "1280px", height: "800px" } },
      },
    },
  },
  decorators: [
    withThemeByClassName({
      themes: { light: "", dark: "dark" },
      defaultTheme: "light",
    }),
  ],
}

export default preview
