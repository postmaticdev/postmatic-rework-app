"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

// Width tiers shared by every modal. On mobile all tiers fill the screen
// minus a 16px gutter on each side.
const dialogSizes = {
  sm: "max-w-md", // confirmations, short single-column forms
  md: "max-w-xl", // simple forms / actions
  default: "max-w-2xl", // standard forms
  lg: "max-w-4xl", // two-column content, lists with previews
  xl: "max-w-5xl", // wide editors / summaries
} as const;

type DialogSize = keyof typeof dialogSizes;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    size?: DialogSize;
  }
>(({ className, children, size = "default", ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "z-50 fixed left-[50%] top-[50%] flex w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] translate-x-[-50%] translate-y-[-50%] flex-col overflow-y-auto rounded-xl border bg-card p-0 shadow-lg duration-200 dark:bg-background sm:max-h-[90vh] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
        dialogSizes[size],
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-md opacity-70 ring-offset-background transition-opacity hover:bg-accent hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none sm:right-4 sm:top-4 sm:size-8">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 border-b px-4 pb-4 pt-4 flex-shrink-0 sm:px-6 sm:pt-6",
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

// Standard footer layout: buttons stack full-width on mobile (primary on top),
// sit right-aligned at their natural width from `sm` up.
const dialogFooterLayout =
  "flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end [&>button]:w-full sm:[&>button]:w-auto sm:[&>button]:min-w-28";

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "border-t px-4 py-4 flex-shrink-0 sm:px-6",
      dialogFooterLayout,
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

interface DialogFooterWithButtonProps {
  buttonMessage: string;
  onClick: () => void;
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
}

const DialogFooterWithButton = ({
  buttonMessage,
  onClick,
  className,
  children,
  disabled,
}: DialogFooterWithButtonProps) => (
  <DialogFooter className={className}>
    {children}
    <Button onClick={onClick} disabled={disabled}>
      {buttonMessage}
    </Button>
  </DialogFooter>
);
DialogFooterWithButton.displayName = "DialogFooterWithButton";

interface DialogFooterWithTwoButtonsProps {
  primaryButton: {
    message: string;
    onClick: () => void;
    icon?: React.ReactNode;
    className?: string;
    variant?:
    | "default"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "destructive";
  };
  secondaryButton: {
    message: string;
    onClick: () => void;
    icon?: React.ReactNode;
    className?: string;
    variant?:
    | "default"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "destructive";
  };
  className?: string;
}

// Secondary is rendered first so it sits left of the primary action on
// desktop and below it on mobile (see dialogFooterLayout).
const DialogFooterWithTwoButtons = ({
  primaryButton,
  secondaryButton,
  className,
}: DialogFooterWithTwoButtonsProps) => (
  <DialogFooter className={className}>
    <Button
      variant={secondaryButton.variant || "outline"}
      onClick={secondaryButton.onClick}
      className={secondaryButton.className}
    >
      {secondaryButton.icon}
      {secondaryButton.message}
    </Button>
    <Button
      variant={primaryButton.variant}
      onClick={primaryButton.onClick}
      className={primaryButton.className}
    >
      {primaryButton.icon}
      {primaryButton.message}
    </Button>
  </DialogFooter>
);
DialogFooterWithTwoButtons.displayName = "DialogFooterWithTwoButtons";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "pr-10 text-xl font-bold leading-tight tracking-tight sm:text-2xl sm:leading-none",
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm mt-2 text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogFooterWithButton,
  DialogFooterWithTwoButtons,
  DialogTitle,
  DialogDescription,
  dialogFooterLayout,
};
export type { DialogSize };
