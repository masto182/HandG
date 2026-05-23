import type { Meta, StoryObj } from "@storybook/react"
import Input from "./index"

const meta = {
  title: "Components/Input",
  component: Input,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

const wrap = (Story: any) => (
  <div className="w-[360px]">
    <Story />
  </div>
)

export const Default: Story = {
  args: { name: "email", label: "Email" },
  decorators: [wrap],
}

export const WithHelper: Story = {
  args: { name: "email", label: "Email", helperText: "We'll never share it." },
  decorators: [wrap],
}

export const WithError: Story = {
  args: { name: "email", label: "Email", error: "That email is already taken." },
  decorators: [wrap],
}

export const Disabled: Story = {
  args: { name: "email", label: "Email", disabled: true, defaultValue: "foo@bar.com" },
  decorators: [wrap],
}

export const Password: Story = {
  args: { name: "password", label: "Password", type: "password" },
  decorators: [wrap],
}
