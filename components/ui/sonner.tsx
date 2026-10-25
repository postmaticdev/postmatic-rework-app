"use client"

import { useTheme } from "next-themes"
import { CircleCheck, CircleX, Info, LoaderCircle, TriangleAlert, X } from "lucide-react"
import { Toaster as Sonner, ToasterProps } from "sonner"

import { cn } from "@/lib/utils"

const iconWrapper = "flex size-8 shrink-0 items-center justify-center rounded-full [&>svg]:size-[18px]"

// Toast kanan bawah: ikon berwarna menandai status, judul tegas, pesan detail di bawahnya.
const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme()

  return (
    <Sonner
      theme={(resolvedTheme ?? "light") as ToasterProps["theme"]}
      position="bottom-right"
      closeButton
      visibleToasts={3}
      gap={10}
      offset={{ bottom: 20, right: 20 }}
      mobileOffset={{ bottom: 16, left: 12, right: 12 }}
      icons={{
        success: (
          <span className={cn(iconWrapper, "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400")}>
            <CircleCheck />
          </span>
        ),
        error: (
          <span className={cn(iconWrapper, "bg-red-500/12 text-red-600 dark:text-red-400")}>
            <CircleX />
          </span>
        ),
        warning: (
          <span className={cn(iconWrapper, "bg-amber-500/15 text-amber-600 dark:text-amber-400")}>
            <TriangleAlert />
          </span>
        ),
        info: (
          <span className={cn(iconWrapper, "bg-primary/12 text-primary")}>
            <Info />
          </span>
        ),
        loading: (
          <span className={cn(iconWrapper, "bg-primary/12 text-primary")}>
            <LoaderCircle className="animate-spin" />
          </span>
        ),
        close: <X />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "group relative flex w-full items-start gap-3 rounded-xl border border-border bg-popover p-3.5 pr-10 text-popover-foreground shadow-lg shadow-black/5 sm:w-(--width)",
          content: "flex min-w-0 flex-1 flex-col gap-0.5 pt-1",
          title: "text-sm font-semibold leading-snug text-popover-foreground!",
          // "!": sonner mewarnai deskripsi sendiri saat tema gelap.
          description: "text-[13px] leading-snug text-muted-foreground!",
          icon: "shrink-0",
          // "!" diperlukan karena gaya bawaan sonner untuk tombol tutup lebih spesifik.
          closeButton:
            "absolute! left-auto! right-2! top-2! flex size-7! translate-0! items-center justify-center rounded-md! border-0! bg-transparent! text-muted-foreground! transition-colors hover:bg-accent! hover:text-foreground! [&>svg]:size-4",
          actionButton:
            "shrink-0 self-center rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary/90",
          cancelButton:
            "shrink-0 self-center rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
