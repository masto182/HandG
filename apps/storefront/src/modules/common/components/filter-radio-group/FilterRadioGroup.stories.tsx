import type { Meta, StoryObj } from "@storybook/react"
import FilterRadioGroup from "./index"

const meta = {
  title: "Components/FilterRadioGroup",
  component: FilterRadioGroup,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  argTypes: { handleChange: { action: "selected" } },
} satisfies Meta<typeof FilterRadioGroup>

export default meta
type Story = StoryObj<typeof meta>

const ITEMS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low → high" },
  { value: "price-desc", label: "Price: high → low" },
  { value: "popularity", label: "Most popular" },
]

export const Default: Story = {
  args: { title: "Sort by", items: ITEMS, value: "newest" },
}

export const Selected: Story = {
  args: { title: "Sort by", items: ITEMS, value: "price-desc" },
}
