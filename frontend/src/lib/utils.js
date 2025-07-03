// ~/Project/frontend/src/lib/utils.js

import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { useEffect, useState } from "react";

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Hook para obtener el ancho de la ventana
export function useWindowWidth() {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return width;
}

// Breakpoints personalizados de Tailwind CSS
export const BREAKPOINTS = {
  xs: 640,
  sm: 850,
  md: 1040,
  lg: 1200,
  xl: 1390,
  xxl: 1540,
};