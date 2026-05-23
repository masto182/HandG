import type { Meta, StoryObj } from "@storybook/react"
import { Table } from "@modules/common/components/ui"
import SkeletonCartItem from "./index"

const meta = {
  title: "Modules/Skeletons/CartItem",
  component: SkeletonCartItem,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof SkeletonCartItem>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Table>
      <Table.Body>
        <SkeletonCartItem />
        <SkeletonCartItem />
        <SkeletonCartItem />
      </Table.Body>
    </Table>
  ),
}
