import { Text, clx } from "@modules/common/components/ui"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import Icon from "@modules/common/components/icon"
import React from "react"

type AccordionItemProps = AccordionPrimitive.AccordionItemProps & {
  title: string
  subtitle?: string
  description?: string
  required?: boolean
  tooltip?: string
  forceMountContent?: true
  headingSize?: "small" | "medium" | "large"
  customTrigger?: React.ReactNode
  complete?: boolean
  active?: boolean
  triggerable?: boolean
  children: React.ReactNode
}

type AccordionProps =
  | (AccordionPrimitive.AccordionSingleProps &
      React.RefAttributes<HTMLDivElement>)
  | (AccordionPrimitive.AccordionMultipleProps &
      React.RefAttributes<HTMLDivElement>)

const Accordion: React.FC<AccordionProps> & {
  Item: React.FC<AccordionItemProps>
} = ({ children, ...props }) => {
  return (
    <AccordionPrimitive.Root {...props}>{children}</AccordionPrimitive.Root>
  )
}

const Item: React.FC<AccordionItemProps> = ({
  title,
  subtitle,
  description,
  children,
  className,
  headingSize: _headingSize = "large",
  customTrigger = undefined,
  forceMountContent = undefined,
  triggerable: _triggerable,
  ...props
}) => {
  return (
    <AccordionPrimitive.Item
      {...props}
      className={clx(
        "border-outline-variant group border-t last:mb-0 last:border-b",
        "py-4",
        className
      )}
    >
      <AccordionPrimitive.Header className="px-1">
        <div className="flex flex-col">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-3">
              <Text className="text-on-surface font-semibold text-body-md">{title}</Text>
            </div>
            <AccordionPrimitive.Trigger className="text-on-surface-variant hover:text-on-surface transition-colors">
              {customTrigger || <ChevronTrigger />}
            </AccordionPrimitive.Trigger>
          </div>
          {subtitle && (
            <Text as="span" className="mt-1 text-body-sm text-on-surface-variant">
              {subtitle}
            </Text>
          )}
        </div>
      </AccordionPrimitive.Header>
      <AccordionPrimitive.Content
        forceMount={forceMountContent}
        className={clx(
          "radix-state-closed:animate-accordion-close radix-state-open:animate-accordion-open radix-state-closed:pointer-events-none px-1"
        )}
      >
        <div className="pt-3">
          {description && <Text className="text-body-sm text-on-surface-variant">{description}</Text>}
          <div className="w-full">{children}</div>
        </div>
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  )
}

Accordion.Item = Item

const ChevronTrigger = () => {
  return (
    <Icon
      name="expand_more"
      size={20}
      className="group-radix-state-open:rotate-180 transition-transform duration-200"
    />
  )
}

export default Accordion
