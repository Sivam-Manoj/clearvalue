"use client";

import { Box, type SxProps, type Theme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  buildingIcon,
  carIcon,
  chartIcon,
  dollarIcon,
  packageIcon,
} from "@/lib/icons3d";

type IconName = "building" | "car" | "chart" | "dollar" | "package";

const icons: Record<IconName, string> = {
  building: buildingIcon,
  car: carIcon,
  chart: chartIcon,
  dollar: dollarIcon,
  package: packageIcon,
};

export function AppIcon({
  name,
  size = 56,
  accent = "#e11d48",
  sx,
}: {
  name: IconName;
  size?: number;
  accent?: string;
  sx?: SxProps<Theme>;
}) {
  return (
    <Box
      sx={[
        {
          width: size,
          height: size,
          borderRadius: "20px",
          display: "grid",
          placeItems: "center",
          color: accent,
          background: `linear-gradient(135deg, ${alpha(accent, 0.22)}, ${alpha(
            accent,
            0.08
          )})`,
          border: `1px solid ${alpha(accent, 0.18)}`,
          boxShadow: `inset 0 1px 0 ${alpha(
            "#ffffff",
            0.14
          )}, 0 12px 30px ${alpha(accent, 0.22)}`,
          "& svg": {
            width: size * 0.52,
            height: size * 0.52,
            display: "block",
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      dangerouslySetInnerHTML={{ __html: icons[name] }}
    />
  );
}
