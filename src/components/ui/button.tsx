import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-[0.7rem] border border-transparent text-sm font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] duration-150 outline-none select-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_1px_2px_rgb(16_18_27/0.16),0_6px_16px_-8px_rgb(16_18_27/0.4)] hover:bg-primary/92 dark:shadow-none",
        outline:
          "border-border bg-card text-foreground shadow-[0_1px_2px_rgb(16_18_27/0.04)] hover:border-foreground/20 hover:bg-accent dark:bg-transparent dark:shadow-none",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "text-muted-foreground hover:bg-accent hover:text-foreground",
        destructive:
          "bg-destructive text-white shadow-[0_1px_2px_rgb(16_18_27/0.12)] hover:bg-destructive/90 focus-visible:ring-destructive/25",
        link: "h-auto rounded-none p-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 px-3.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-6 gap-1 rounded-[0.45rem] px-1.5 text-[0.7rem] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-[0.6rem] px-2.5 text-[0.8rem] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 rounded-[0.8rem] px-5 text-[0.95rem]",
        icon: "size-9",
        "icon-xs": "size-6 rounded-[0.45rem] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-[0.6rem]",
        "icon-lg": "size-11 rounded-[0.8rem]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
