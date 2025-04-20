"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:font-bold group-[.toaster]:text-lg group-[.toaster]:bg-black group-[.toaster]:text-[#00FF88] group-[.toaster]:border-[1px] group-[.toaster]:border-[#00FF88] group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-[#AAAAAA] group-[.toaster]:text-sm",
          actionButton:
            "group-[.toast]:bg-[#00FF88] group-[.toast]:text-black",
          cancelButton:
            "group-[.toast]:bg-[#00FF88] group-[.toast]:text-black",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
