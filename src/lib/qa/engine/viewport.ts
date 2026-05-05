import type { AuditViewport } from "@/lib/qa/types";

export const VIEWPORTS: Record<AuditViewport, { width: number; height: number }> = {
  desktop: { width: 1440, height: 960 },
  mobile: { width: 390, height: 844 },
};
