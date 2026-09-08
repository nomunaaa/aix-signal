import { cn } from "@/lib/utils"
import React from "react"

const Skeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((
  { className, ...props },
  ref,
) => (
  <div
    ref={ref}
    className={cn("animate-pulse rounded-md bg-muted", className)}
    aria-hidden="true"
    {...props}
  />
))
Skeleton.displayName = "Skeleton"

export { Skeleton }
