"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Check, Clock, Laptop, Loader2, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel?: () => void;
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  isLoading?: boolean;
  detailLabel?: string;
  detailValue?: string;
  variant?: "primary" | "danger" | "warning" | "default";
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  title,
  description,
  confirmText,
  cancelText,
  isLoading = false,
  detailLabel,
  detailValue,
  variant = "primary",
}: ConfirmationModalProps) {
  const isDanger = variant === "danger";

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent className="max-w-md p-4 sm:p-6">
        <AlertDialogHeader className="flex flex-row items-start gap-4 text-left">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
              isDanger
                ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                : "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
            )}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex flex-col gap-1 min-w-0 flex-1 pt-0.5">
            <AlertDialogTitle className="text-base font-semibold text-foreground">
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>

        {detailLabel && detailValue && (
          <div className="rounded-lg border border-border/60 bg-muted/40 p-3.5 my-1">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground border border-border/50">
                {isDanger ? (
                  <Laptop className="h-4 w-4" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {detailLabel}
                </p>
                <p className="truncate text-sm font-semibold text-foreground mt-0.5">
                  {detailValue}
                </p>
              </div>
            </div>
          </div>
        )}

        <AlertDialogFooter className="mt-2 gap-2 sm:gap-2">
          <AlertDialogCancel
            onClick={() => {
              if (onCancel) {
                onCancel();
                return;
              }
              onClose();
            }}
            disabled={isLoading}
            className="h-10 px-4 max-md:h-(--control-h)"
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className={cn(
              "h-10 px-4 max-md:h-(--control-h) font-medium transition-colors",
              isDanger
                ? "bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                : "bg-blue-600 text-white hover:bg-blue-700"
            )}
          >
            {isLoading ? (
              <div className="flex items-center gap-2 text-white">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{confirmText}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-white">
                {isDanger ? (
                  <LogOut className="h-4 w-4" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <span>{confirmText}</span>
              </div>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

