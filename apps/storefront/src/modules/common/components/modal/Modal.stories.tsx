import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import Modal from "./index"

const meta = {
  title: "Components/Modal",
  component: Modal,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Modal>

export default meta
type Story = StoryObj<typeof meta>

const Template = (args: any) => {
  const [open, setOpen] = useState(true)
  return (
    <div>
      <button
        className="rounded-md bg-primary px-4 py-2 text-on-primary"
        onClick={() => setOpen(true)}
      >
        Open modal
      </button>
      <Modal {...args} isOpen={open} onClose={() => setOpen(false)}>
        {args.children}
      </Modal>
    </div>
  )
}

export const Small: Story = {
  args: {
    title: "Confirm action",
    size: "sm",
    children: <p>This is a small modal. Use it for confirm dialogs.</p>,
  },
  render: Template,
}

export const Medium: Story = {
  args: {
    title: "Edit profile",
    category: "Account",
    size: "md",
    children: (
      <div className="flex flex-col gap-3">
        <input className="border rounded px-3 py-2" placeholder="First name" />
        <input className="border rounded px-3 py-2" placeholder="Last name" />
      </div>
    ),
  },
  render: Template,
}

export const LargeWithFooter: Story = {
  args: {
    title: "Order details",
    size: "lg",
    children: (
      <div>
        <p className="text-on-surface-variant">3 items · Total $42.00</p>
        <ul className="mt-4 list-disc pl-5 text-sm">
          <li>Pale Ale × 2</li>
          <li>IPA × 1</li>
          <li>Stout × 1</li>
        </ul>
      </div>
    ),
    footer: (
      <div className="flex justify-end gap-2">
        <button className="rounded border px-4 py-2">Cancel</button>
        <button className="rounded bg-primary px-4 py-2 text-on-primary">Confirm</button>
      </div>
    ),
  },
  render: Template,
}
