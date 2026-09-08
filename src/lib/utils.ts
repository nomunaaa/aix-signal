import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper function to convert any CSS color to rgba
export const getRGBA = (
  cssColor: React.CSSProperties["color"],
  fallback: string = "rgba(180, 180, 180)"
): string => {
  if (typeof window === "undefined") return fallback;
  if (!cssColor) return fallback;

  try {
    // Handle CSS variables
    if (typeof cssColor === "string" && cssColor.startsWith("var(")) {
      const element = document.createElement("div");
      element.style.color = cssColor;
      document.body.appendChild(element);
      const computedColor = window.getComputedStyle(element).color;
      document.body.removeChild(element);
      return parseColorToRGBA(computedColor);
    }

    return parseColorToRGBA(cssColor as string);
  } catch {
    return fallback;
  }
};

// Parse color string to rgba format
const parseColorToRGBA = (color: string): string => {
  // Already in rgba format
  if (color.startsWith("rgba")) return color;

  // rgb format - convert to rgba
  if (color.startsWith("rgb(")) {
    return color.replace("rgb(", "rgba(").replace(")", ", 1)");
  }

  // hex format
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, 1)`;
  }

  // HSL format - convert using DOM
  if (color.startsWith("hsl")) {
    const element = document.createElement("div");
    element.style.color = color;
    document.body.appendChild(element);
    const computedColor = window.getComputedStyle(element).color;
    document.body.removeChild(element);
    // computedColor will be in rgb format
    if (computedColor.startsWith("rgb(")) {
      return computedColor.replace("rgb(", "rgba(").replace(")", ", 1)");
    }
    return computedColor;
  }

  return color;
};

// Helper function to add opacity to an RGB color string
export const colorWithOpacity = (color: string, opacity: number): string => {
  if (!color.startsWith("rgb")) return color;

  // Extract RGB values
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return color;

  const [, r, g, b] = match;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};
