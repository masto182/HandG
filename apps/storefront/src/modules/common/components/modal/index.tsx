"use client"

import { Fragment, type ReactNode } from "react"
import { Dialog, Transition } from "@headlessui/react"
import { clx } from "@modules/common/components/ui"
import Icon from "@modules/common/components/icon"

type ModalProps = {
  isOpen: boolean
  onClose: () => void
  title?: string
  category?: string
  size?: "sm" | "md" | "lg"
  children: ReactNode
  footer?: ReactNode
}

const sizeMap = { sm: "max-w-[400px]", md: "max-w-[560px]", lg: "max-w-[720px]" }

export default function Modal({
  isOpen,
  onClose,
  title,
  category,
  size = "md",
  children,
  footer,
}: ModalProps) {
  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 translate-y-8 sm:translate-y-4 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-8 sm:translate-y-4 sm:scale-95"
          >
            <Dialog.Panel
              className={clx(
                "w-full bg-surface-container-high rounded-t-2xl sm:rounded-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh] shadow-2xl",
                sizeMap[size]
              )}
            >
              {/* Mobile pill handle */}
              <div className="sm:hidden flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-outline-variant" />
              </div>

              {/* Header */}
              <div className="flex items-start justify-between p-6 pb-4">
                <div>
                  {category && (
                    <p className="text-label-caps uppercase tracking-[0.05em] text-on-surface-variant mb-1">
                      {category}
                    </p>
                  )}
                  {title && (
                    <Dialog.Title className="text-h3 text-on-surface">
                      {title}
                    </Dialog.Title>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="text-on-surface-variant hover:text-on-surface transition-colors -mt-1"
                >
                  <Icon name="close" size={24} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 pb-6">{children}</div>

              {/* Footer */}
              {footer && (
                <div className="flex items-center justify-end gap-3 px-6 py-4 bg-surface-container-highest border-t border-white/5">
                  {footer}
                </div>
              )}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}
