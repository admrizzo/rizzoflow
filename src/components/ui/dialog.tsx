import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

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
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  hideCloseButton?: boolean;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, hideCloseButton, onPointerDownOutside, onInteractOutside, onFocusOutside, ...props }, ref) => {
  /**
   * Track the container to prevent "removeChild" errors when closing.
   * The issue occurs when Radix tries to remove a portal that's already been
   * removed from the DOM by React's reconciliation.
   */
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={(node) => {
          containerRef.current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
          className,
        )}
        onInteractOutside={(e) => {
          // Prevent closing when interacting with portaled popovers/selects inside the dialog
          const target = e.target as HTMLElement;
          if (
            target?.closest('[data-radix-popper-content-wrapper]') ||
            target?.closest('[role="listbox"]') ||
            target?.closest('[role="menu"]') ||
            target?.closest('[data-radix-select-content]') ||
            target?.closest('[data-radix-popover-content]') ||
            target?.closest('[data-radix-alert-dialog-content]') ||
            target?.closest('[role="alertdialog"]') ||
            target?.closest('[role="dialog"]')
          ) {
            e.preventDefault();
            return;
          }
          onInteractOutside?.(e);
        }}
        onFocusOutside={(e) => {
          // Prevent focus leaving when focus moves to portaled content
          const target = e.target as HTMLElement;
          const related = (e as any).relatedTarget as HTMLElement | null;

          if (
            target?.closest('[data-radix-popper-content-wrapper]') ||
            related?.closest('[data-radix-popper-content-wrapper]') ||
            target?.closest('[role="listbox"]') ||
            related?.closest('[role="listbox"]') ||
            target?.closest('[role="menu"]') ||
            related?.closest('[role="menu"]') ||
            target?.closest('[data-radix-select-content]') ||
            related?.closest('[data-radix-select-content]') ||
            target?.closest('[data-radix-alert-dialog-content]') ||
            related?.closest('[data-radix-alert-dialog-content]') ||
            target?.closest('[role="alertdialog"]') ||
            related?.closest('[role="alertdialog"]')
          ) {
            e.preventDefault();
            return;
          }

          onFocusOutside?.(e);
        }}
        onPointerDownOutside={(e) => {
          // Prevent closing when clicking on elements inside portals
          const target = e.target as HTMLElement;
          if (
            target?.closest('[data-radix-popper-content-wrapper]') || 
            target?.closest('[role="listbox"]') ||
            target?.closest('[role="menu"]') ||
            target?.closest('[data-radix-select-content]') ||
            target?.closest('[data-radix-popover-content]') ||
            target?.closest('[data-radix-alert-dialog-content]') ||
            target?.closest('[role="alertdialog"]') ||
            target?.closest('[role="dialog"]')
          ) {
            e.preventDefault();
            return;
          }
          onPointerDownOutside?.(e);
        }}
        {...props}
      >
        {children}
        {!hideCloseButton && (
          <DialogPrimitive.Close className="absolute right-4 top-4 z-[60] rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
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
  DialogTitle,
  DialogDescription,
};
