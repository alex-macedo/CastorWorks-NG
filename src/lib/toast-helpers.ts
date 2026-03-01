import { toast as sonnerToast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";
import { createElement } from "react";

export const toast = {
  success: (message: string, description?: string) => {
    sonnerToast.success(message, {
      description,
      icon: createElement(CheckCircle2, { className: "h-5 w-5" }),
      className: "bg-success/10 border-success/20",
    });
  },

  error: (message: string, description?: string) => {
    sonnerToast.error(message, {
      description,
      icon: createElement(XCircle, { className: "h-5 w-5" }),
      className: "bg-destructive/10 border-destructive/20",
    });
  },

  warning: (message: string, description?: string) => {
    sonnerToast.warning(message, {
      description,
      icon: createElement(AlertTriangle, { className: "h-5 w-5" }),
      className: "bg-warning/10 border-warning/20",
    });
  },

  info: (message: string, description?: string) => {
    sonnerToast.info(message, {
      description,
      icon: createElement(Info, { className: "h-5 w-5" }),
      className: "bg-primary/10 border-primary/20",
    });
  },

  promise: <T,>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return sonnerToast.promise(promise, options);
  },
};