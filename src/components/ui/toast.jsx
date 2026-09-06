import * as React from "react";
import { cva } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const ToastProvider = React.forwardRef(({ ...props }, ref) => (
  <div
    ref={ref}
    className="fixed pointer-events-none top-3 right-3 sm:top-auto sm:bottom-4 sm:right-4 z-[99999] flex max-h-[85vh] w-auto max-w-[calc(100vw-24px)] sm:max-w-[360px] flex-col gap-2"
    {...props}
  />
));
ToastProvider.displayName = "ToastProvider";

const ToastViewport = React.forwardRef(({ ...props }, ref) => (
  <div
    ref={ref}
    className="fixed pointer-events-none top-3 right-3 sm:top-auto sm:bottom-4 sm:right-4 z-[99999] flex max-h-[85vh] w-auto max-w-[calc(100vw-24px)] sm:max-w-[360px] flex-col gap-2"
    {...props}
  />
));
ToastViewport.displayName = "ToastViewport";

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-start justify-between space-x-3 overflow-hidden rounded-2xl border p-3.5 pr-8 shadow-xl transition-all duration-300 data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-4 data-[state=open]:sm:slide-in-from-bottom-4",
  {
    variants: {
      variant: {
        default: "border-slate-200/90 bg-white/95 text-slate-900 shadow-slate-900/10 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-100",
        destructive:
          "destructive group border-red-200 bg-red-50/95 text-red-900 shadow-red-500/10 backdrop-blur-md dark:border-red-900 dark:bg-red-950/95 dark:text-red-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Toast = React.forwardRef(({ className, variant, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  );
});
Toast.displayName = "Toast";

const ToastAction = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex h-7 shrink-0 items-center justify-center rounded-lg border bg-transparent px-2.5 text-xs font-semibold ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
));
ToastAction.displayName = "ToastAction";

const ToastClose = React.forwardRef(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "absolute right-2.5 top-2.5 rounded-lg p-1 text-slate-400 opacity-80 transition-all hover:bg-slate-100 hover:text-slate-700 hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-slate-300 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200 group-[.destructive]:text-red-400 group-[.destructive]:hover:bg-red-100 group-[.destructive]:hover:text-red-700",
      className
    )}
    toast-close=""
    type="button"
    aria-label="Tutup notifikasi"
    {...props}
  >
    <X className="h-3.5 w-3.5" />
  </button>
));
ToastClose.displayName = "ToastClose";

const ToastTitle = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-xs sm:text-sm font-bold tracking-tight", className)}
    {...props}
  />
));
ToastTitle.displayName = "ToastTitle";

const ToastDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-snug mt-0.5", className)}
    {...props}
  />
));
ToastDescription.displayName = "ToastDescription";

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};