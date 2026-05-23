import type { Meta, StoryObj } from "@storybook/react"
import NativeSelect from "./index"

const meta = {
  title: "Components/NativeSelect",
  component: NativeSelect,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof NativeSelect>

export default meta
type Story = StoryObj<typeof meta>

const wrap = (Story: any) => (
  <div className="w-[360px]">
    <Story />
  </div>
)

export const Default: Story = {
  args: { label: "Country", placeholder: "Select a country..." },
  render: (args) => (
    <NativeSelect {...args}>
      <option value="us">United States</option>
      <option value="au">Australia</option>
      <option value="gb">United Kingdom</option>
      <option value="ca">Canada</option>
    </NativeSelect>
  ),
  decorators: [wrap],
}

export const WithError: Story = {
  args: { label: "Country", error: "Please choose a country." },
  render: (args) => (
    <NativeSelect {...args}>
      <option value="us">United States</option>
      <option value="au">Australia</option>
    </NativeSelect>
  ),
  decorators: [wrap],
}
