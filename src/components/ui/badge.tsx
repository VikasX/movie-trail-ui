/**
 * The shadcn/Radix Badge primitive for small status labels.
 * cva selects the visual variant. asChild can apply the styling to an existing child element.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// React hooks and component/type helpers used to build this file’s interface.
import * as React from 'react'
// Bring in the exported helpers/components from `class-variance-authority`.
import { cva, type VariantProps } from 'class-variance-authority'
// Bring in the exported helpers/components from `cn`.
import { cn } from 'cn'
// Bring in the exported helpers/components from `radix-ui`.
import { Slot } from 'radix-ui'

// Group the supported badge appearances and their CSS classes under named variants.
// Keep `badgeVariants` as the result returned by `cva` with these arguments.
const badgeVariants = cva(
  'group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!',
  {
    // Set the `variants` field to an object whose named fields are explained below.
    variants: {
      // Set the `variant` field to an object whose named fields are explained below.
      variant: {
        // Set the `default` field to the text `'bg-primary text-primary-foreground [a]:hover:bg-primary/80'`.
        default: 'bg-primary text-primary-foreground [a]:hover:bg-primary/80',
        // Set the `secondary` field to the text `'bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80'`.
        secondary:
          'bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80',
        // Set the `destructive` field to the text `'bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-vis...`.
        destructive:
          'bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20',
        // Set the `outline` field to the text `'border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground'`.
        outline:
          'border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground',
        // Set the `ghost` field to the text `'hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50'`.
        ghost:
          'hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50',
        // Set the `link` field to the text `'text-primary underline-offset-4 hover:underline'`.
        link: 'text-primary underline-offset-4 hover:underline',
      },
    },
    // Set the `defaultVariants` field to an object whose named fields are explained below.
    defaultVariants: {
      // Set the `variant` field to the text `'default'`.
      variant: 'default',
    },
  },
)

/** Choose a compact status-label style and merge any extra class names. */
function Badge(
  /* Destructure the component inputs into the local names listed below. The following type describes each prop. */ {
    className,
    variant = 'default',
    asChild = false,
    ...props
  }: React.ComponentProps<'span'> &
    VariantProps<typeof badgeVariants> & { asChild?: boolean },
) {
  // Keep `Comp` as a choice between two values based on `asChild`.
  const Comp = asChild ? Slot.Root : 'span'

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={
        /* Choose the CSS classes from this expression; conditional parts reflect the current state. */ cn(
          badgeVariants({ variant }),
          className,
        )
      }
      {...props}
    />
  )
}

export { Badge }
