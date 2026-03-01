import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const isRenderableChild = (child: React.ReactNode): boolean => {
  if (child === null || child === undefined || typeof child === "boolean") {
    return false;
  }

  if (typeof child === "string") {
    return child.trim().length > 0;
  }

  return true;
};

export const getRenderableChildren = (children: React.ReactNode): React.ReactNode[] => {
  return React.Children.toArray(children).filter(isRenderableChild);
};

export const getSingleRenderableChild = (children: React.ReactNode): React.ReactNode | null => {
  const renderable = getRenderableChildren(children);
  return renderable.length === 1 ? renderable[0] : null;
};
