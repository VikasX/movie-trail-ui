/**
 * The shadcn/Radix Button primitive.
 * cva selects CSS classes from variant and size props. cn combines them with caller-supplied classes.
 * asChild applies button styling to a child such as a React Router Link.
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

// Define named visual options once. Callers select them through variant and size props.
// Keep `buttonVariants` as the result returned by `cva` with these arguments.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    // Set the `variants` field to an object whose named fields are explained below.
    variants: {
      // Set the `variant` field to an object whose named fields are explained below.
      variant: {
        // Set the `default` field to the text `'bg-primary text-primary-foreground hover:bg-primary/80'`.
        default: 'bg-primary text-primary-foreground hover:bg-primary/80',
        // Set the `outline` field to the text `'border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text...`.
        outline:
          'border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
        // Set the `secondary` field to the text `'bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)...`.
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        // Set the `ghost` field to the text `'hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-mu...`.
        ghost:
          'hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50',
        // Set the `destructive` field to the text `'bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visib...`.
        destructive:
          'bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40',
        // Set the `link` field to the text `'text-primary underline-offset-4 hover:underline'`.
        link: 'text-primary underline-offset-4 hover:underline',
      },
      // Set the `size` field to an object whose named fields are explained below.
      size: {
        // Set the `default` field to the text `'h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2'`.
        default:
          'h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        // Set the `xs` field to the text `"h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-dat...`.
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        // Set the `sm` field to the text `"h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg...`.
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        // Set the `lg` field to the text `'h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2'`.
        lg: 'h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        // Set the `icon` field to the text `'size-8'`.
        icon: 'size-8',
        // Set the `'icon-xs'` field to the text `"size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='siz...`.
        'icon-xs':
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        // Set the `'icon-sm'` field to the text `'size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg'`.
        'icon-sm':
          'size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg',
        // Set the `'icon-lg'` field to the text `'size-9'`.
        'icon-lg': 'size-9',
      },
    },
    // Set the `defaultVariants` field to an object whose named fields are explained below.
    defaultVariants: {
      // Set the `variant` field to the text `'default'`.
      variant: 'default',
      // Set the `size` field to the text `'default'`.
      size: 'default',
    },
  },
)

/** Choose the style classes and optionally render them through a child Link or another element. */
function Button(
  /* Destructure the component inputs into the local names listed below. The following type describes each prop. */ {
    className,
    variant = 'default',
    size = 'default',
    asChild = false,
    ...props
  }: React.ComponentProps<'button'> &
    VariantProps<typeof buttonVariants> & {
      // The `asChild` field used by this data shape. The ? makes this field optional. Its type is `boolean`.
      asChild?: boolean
    },
) {
  // Slot passes styling and behavior to the supplied child when asChild is enabled.
  // Keep `Comp` as a choice between two values based on `asChild`.
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={
        /* Choose the CSS classes from this expression; conditional parts reflect the current state. */ cn(
          buttonVariants({ variant, size, className }),
        )
      }
      {...props}
    />
  )
}

export { Button }
