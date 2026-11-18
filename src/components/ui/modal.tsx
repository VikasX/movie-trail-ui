/**
 * The common accessible dialog wrapper used by feature dialogs.
 * Radix handles keyboard focus, Escape, outside interaction, and the portal.
 * children supplies the dialog body. wide selects the larger trailer layout.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// Bring in the exported helpers/components from `radix-ui`.
import { Dialog } from 'radix-ui'
// SVG icon components used by the controls and headings below.
import { X } from 'lucide-react'
// React hooks and component/type helpers used to build this file’s interface.
import type { ReactNode } from 'react'
/** Wrap a feature-specific dialog body with shared Radix accessibility and positioning. */
export function Modal(
  /* Destructure the component inputs into the local names listed below. The following type describes each prop. */ {
    open,
    onClose,
    title,
    children,
    wide = false,
  }: {
    // The `open` field used by this data shape. Its type is `boolean`.
    open: boolean
    // The `onClose` field used by this data shape. Its type is `() => void`.
    onClose: () => void
    // The title record or display title used by this object. Its type is `string`.
    title: string
    // The `children` field used by this data shape. Its type is `ReactNode`.
    children: ReactNode
    // The `wide` field used by this data shape. The ? makes this field optional. Its type is `boolean`.
    wide?: boolean
  },
) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={
        /* The dialog reports its next open/closed state through this callback. */ (
          v,
        ) => {
          // Take this branch only when `!v` is truthy.
          if (!v) onClose()
        }
      }
    >
      {/* Render the overlay outside the surrounding page layout. */}
      {/* Render the Dialog.Portal component. */}
      <Dialog.Portal>
        {/* Render the Dialog.Overlay component. */}
        <Dialog.Overlay className="modal-overlay" />
        {/* Render the Dialog.Content component. */}
        <Dialog.Content
          className={
            /* Choose the CSS classes from this expression; conditional parts reflect the current state. */ 'modal-content ' +
            (wide ? 'modal-wide' : '')
          }
          // Bodies differ between dialogs, so this wrapper does not claim a single shared description element.
          aria-describedby={undefined}
        >
          {/* Give the dialog an accessible title and a shared close control. */}
          {/* Render the div element styled by `"modal-heading"`. */}
          <div className="modal-heading">
            {/* Render the Dialog.Title component. */}
            <Dialog.Title>{title}</Dialog.Title>
            {/* Render the Dialog.Close component. */}
            {/* The accessible name is `"Close dialog"`. */}
            <Dialog.Close className="icon-button" aria-label="Close dialog">
              {/* Render the X component. */}
              <X size={20} />
            </Dialog.Close>
          </div>
          {/* Insert `children` into this part of the interface. */}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
