import type { Meta, StoryObj } from "@storybook/react"
import SkeletonOrderSummary from "./index"

const meta = {
  title: "Modules/Skeletons/OrderSummary",
  component: SkeletonOrderSummary,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof SkeletonOrderSummary>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  decorators: [
    (Story) => (
      <div className="w-[360px]">
        <Story />
      </div>
    ),
  ],
}
