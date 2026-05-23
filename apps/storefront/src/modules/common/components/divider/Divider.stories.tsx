import type { Meta, StoryObj } from "@storybook/react"
import Divider from "./index"

const meta = {
  title: "Components/Divider",
  component: Divider,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof Divider>

export default meta
type Story = StoryObj<typeof meta>

export const Plain: Story = {
  args: {},
  decorators: [
    (Story) => (
      <div className="w-[480px]">
        <Story />
      </div>
    ),
  ],
}

export const WithLabel: Story = {
  args: { label: "or" },
  decorators: [
    (Story) => (
      <div className="w-[480px]">
        <Story />
      </div>
    ),
  ],
}
