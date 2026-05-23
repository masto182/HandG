import type { Meta, StoryObj } from "@storybook/react"
import SkeletonProductPreview from "./index"

const meta = {
  title: "Modules/Skeletons/ProductPreview",
  component: SkeletonProductPreview,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof SkeletonProductPreview>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  decorators: [
    (Story) => (
      <div className="w-[280px]">
        <Story />
      </div>
    ),
  ],
}

export const Grid: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <SkeletonProductPreview key={i} />
      ))}
    </div>
  ),
}
