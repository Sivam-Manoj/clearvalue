"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Drawer,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  ChevronLeftRounded,
  ChevronRightRounded,
  DarkModeRounded,
  DashboardRounded,
  DescriptionRounded,
  LightModeRounded,
  MenuRounded,
  PersonRounded,
  ScheduleRounded,
  VisibilityRounded,
} from "@mui/icons-material";
import { useColorMode } from "@/components/providers/ColorModeProvider";
import { useAuthContext } from "@/context/AuthContext";

const InputsHistoryModal = dynamic(
  () => import("@/components/modals/InputsHistoryModal"),
  { ssr: false }
);

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: DashboardRounded },
  { label: "Previews", href: "/previews", icon: VisibilityRounded },
  { label: "Reports", href: "/reports", icon: DescriptionRounded },
  { label: "Settings", href: "/settings", icon: PersonRounded },
];

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/previews": "Previews",
  "/reports": "Reports",
  "/settings": "Settings",
};

function NavLinkItem({
  collapsed,
  active,
  href,
  label,
  icon: Icon,
  onClick,
}: {
  collapsed: boolean;
  active: boolean;
  href: string;
  label: string;
  icon: typeof DashboardRounded;
  onClick?: () => void;
}) {
  return (
    <Link href={href} onClick={onClick}>
      <Stack
        direction="row"
        spacing={collapsed ? 0 : 1.5}
        sx={{
          px: collapsed ? 1 : 1.5,
          py: 1.25,
          borderRadius: 4,
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          color: active ? "var(--app-accent)" : "var(--app-text-muted)",
          bgcolor: active ? "var(--app-accent-soft)" : "transparent",
          border: active
            ? "1px solid rgba(244, 63, 94, 0.16)"
            : "1px solid transparent",
          transition: "all 180ms ease",
          "&:hover": {
            bgcolor: active
              ? "var(--app-accent-soft)"
              : "rgba(148, 163, 184, 0.08)",
            color: active ? "var(--app-accent)" : "var(--app-text)",
          },
        }}
      >
        <Avatar
          variant="rounded"
          sx={{
            width: 38,
            height: 38,
            borderRadius: 3,
            bgcolor: active
              ? alpha("#e11d48", 0.14)
              : "rgba(148, 163, 184, 0.08)",
            color: "inherit",
          }}
        >
          <Icon fontSize="small" />
        </Avatar>
        {!collapsed ? (
          <Typography sx={{ fontWeight: active ? 800 : 700 }}>{label}</Typography>
        ) : null}
      </Stack>
    </Link>
  );
}

export default function Navbar({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up("lg"));
  const { resolvedTheme, toggleMode } = useColorMode();
  const { user } = useAuthContext();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showInputsHistory, setShowInputsHistory] = useState(false);

  const railWidth = collapsed ? 92 : 304;
  const title =
    Object.entries(pageTitles).find(([route]) => pathname?.startsWith(route))?.[1] ||
    "Workspace";
  const userLabel = user?.username || user?.email || "Account";
  const initial = userLabel.charAt(0).toUpperCase();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const sidebar = (
    <Stack sx={{ height: "100%" }}>
      <Stack
        direction="row"
        spacing={collapsed && desktop ? 0 : 1.5}
        sx={{
          px: collapsed && desktop ? 1.5 : 2.5,
          pt: 2.5,
          pb: 2,
          alignItems: "center",
          justifyContent: collapsed && desktop ? "center" : "space-between",
        }}
      >
        <Stack
          direction="row"
          spacing={collapsed && desktop ? 0 : 1.5}
          sx={{
            alignItems: "center",
            justifyContent: collapsed && desktop ? "center" : "flex-start",
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 4,
              display: "grid",
              placeItems: "center",
              bgcolor: "rgba(255,255,255,0.9)",
              border: "1px solid var(--app-border)",
              boxShadow: "var(--app-shadow-card)",
            }}
          >
            <Image
              src="/icon.png"
              alt="Asset Insight"
              width={52}
              height={52}
              className="h-10 w-auto"
            />
          </Box>
          {!collapsed || !desktop ? (
            <Box>
              <Typography sx={{ fontWeight: 800, color: "var(--app-text)" }}>
                Asset Insight
              </Typography>
              <Typography variant="body2" sx={{ color: "var(--app-text-muted)" }}>
                Enterprise workspace
              </Typography>
            </Box>
          ) : null}
        </Stack>
        {desktop ? (
          <Tooltip title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <IconButton
              onClick={() => setCollapsed((value) => !value)}
              sx={{
                border: "1px solid var(--app-border)",
                bgcolor: "var(--app-panel)",
              }}
            >
              {collapsed ? <ChevronRightRounded /> : <ChevronLeftRounded />}
            </IconButton>
          </Tooltip>
        ) : null}
      </Stack>

      <Box sx={{ px: collapsed && desktop ? 1.5 : 2 }}>
        <Typography
          variant="overline"
          sx={{
            px: collapsed && desktop ? 0 : 1.5,
            color: "var(--app-text-muted)",
            letterSpacing: "0.18em",
          }}
        >
          {!collapsed || !desktop ? "Navigation" : ""}
        </Typography>
        <Stack spacing={1} sx={{ mt: 1 }}>
          {navItems.map((item) => (
            <NavLinkItem
              key={item.href}
              collapsed={collapsed && desktop}
              active={pathname === item.href || pathname?.startsWith(item.href + "/")}
              href={item.href}
              label={item.label}
              icon={item.icon}
              onClick={!desktop ? () => setMobileOpen(false) : undefined}
            />
          ))}
        </Stack>
      </Box>

      <Box sx={{ mt: 2, px: collapsed && desktop ? 1.5 : 2 }}>
        <Stack
          spacing={1}
          sx={{
            p: collapsed && desktop ? 1 : 1.5,
            borderRadius: 5,
            border: "1px solid var(--app-border)",
            bgcolor: "rgba(148, 163, 184, 0.06)",
          }}
        >
          <Stack
            direction="row"
            spacing={collapsed && desktop ? 0 : 1.5}
            sx={{
              px: collapsed && desktop ? 0 : 1,
              py: 1.1,
              borderRadius: 4,
              cursor: "pointer",
              alignItems: "center",
              justifyContent: collapsed && desktop ? "center" : "flex-start",
              color: "var(--app-text-muted)",
              "&:hover": { bgcolor: "rgba(148, 163, 184, 0.08)" },
            }}
            onClick={() => {
              setShowInputsHistory(true);
              if (!desktop) setMobileOpen(false);
            }}
          >
            <Avatar
              variant="rounded"
              sx={{
                width: 38,
                height: 38,
                borderRadius: 3,
                bgcolor: "rgba(37, 99, 235, 0.12)",
                color: "#2563eb",
              }}
            >
              <ScheduleRounded fontSize="small" />
            </Avatar>
            {!collapsed || !desktop ? (
              <Box>
                <Typography sx={{ fontWeight: 700 }}>Draft inputs</Typography>
                <Typography variant="body2" sx={{ color: "var(--app-text-muted)" }}>
                  Resume saved work
                </Typography>
              </Box>
            ) : null}
          </Stack>

          <Stack
            direction="row"
            spacing={collapsed && desktop ? 0 : 1.5}
            sx={{
              px: collapsed && desktop ? 0 : 1,
              py: 1.1,
              borderRadius: 4,
              cursor: "pointer",
              alignItems: "center",
              justifyContent: collapsed && desktop ? "center" : "flex-start",
              color: "var(--app-text-muted)",
              "&:hover": { bgcolor: "rgba(148, 163, 184, 0.08)" },
            }}
            onClick={toggleMode}
          >
            <Avatar
              variant="rounded"
              sx={{
                width: 38,
                height: 38,
                borderRadius: 3,
                bgcolor:
                  resolvedTheme === "dark"
                    ? "rgba(251,191,36,0.12)"
                    : "rgba(15, 23, 42, 0.08)",
                color: resolvedTheme === "dark" ? "#fbbf24" : "#0f172a",
              }}
            >
              {resolvedTheme === "dark" ? (
                <LightModeRounded fontSize="small" />
              ) : (
                <DarkModeRounded fontSize="small" />
              )}
            </Avatar>
            {!collapsed || !desktop ? (
              <Box>
                <Typography sx={{ fontWeight: 700 }}>
                  {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
                </Typography>
                <Typography variant="body2" sx={{ color: "var(--app-text-muted)" }}>
                  Toggle appearance
                </Typography>
              </Box>
            ) : null}
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ mt: "auto", p: collapsed && desktop ? 1.5 : 2 }}>
        <Stack
          direction="row"
          spacing={collapsed && desktop ? 0 : 1.5}
          sx={{
            p: 1.25,
            alignItems: "center",
            justifyContent: collapsed && desktop ? "center" : "flex-start",
            borderRadius: 5,
            border: "1px solid var(--app-border)",
            bgcolor: "var(--app-panel-soft)",
            boxShadow: "var(--app-shadow-card)",
          }}
        >
          <Avatar sx={{ bgcolor: "var(--app-accent)", width: 42, height: 42 }}>
            {initial}
          </Avatar>
          {!collapsed || !desktop ? (
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontWeight: 800,
                  color: "var(--app-text)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {userLabel}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "var(--app-text-muted)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user?.email}
              </Typography>
            </Box>
          ) : null}
        </Stack>
      </Box>
    </Stack>
  );

  return (
    <>
      <Box sx={{ minHeight: "100vh", display: "flex" }}>
        <Box
          sx={{
            display: { xs: "none", lg: "block" },
            width: railWidth,
            flexShrink: 0,
            p: 2,
            transition: "width 180ms ease",
          }}
        >
          <Box
            sx={{
              position: "sticky",
              top: 16,
              height: "calc(100vh - 32px)",
              borderRadius: 7,
              border: "1px solid var(--app-border)",
              background: "var(--app-overlay)",
              backdropFilter: "blur(20px)",
              boxShadow: "var(--app-shadow-shell)",
              overflow: "hidden",
            }}
          >
            {sidebar}
          </Box>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, pb: 4 }}>
          <Stack
            direction="row"
            sx={{
              display: { xs: "flex", lg: "none" },
              position: "sticky",
              top: 0,
              zIndex: 30,
              px: 2,
              py: 1.5,
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid var(--app-border)",
              bgcolor: "var(--app-panel-soft)",
              backdropFilter: "blur(18px)",
            }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <IconButton
                onClick={() => setMobileOpen(true)}
                sx={{
                  border: "1px solid var(--app-border)",
                  bgcolor: "var(--app-panel)",
                }}
              >
                <MenuRounded />
              </IconButton>
              <Box>
                <Typography variant="body2" sx={{ color: "var(--app-text-muted)" }}>
                  Asset Insight
                </Typography>
                <Typography sx={{ fontWeight: 800, color: "var(--app-text)" }}>
                  {title}
                </Typography>
              </Box>
            </Stack>
            <IconButton
              onClick={toggleMode}
              sx={{
                border: "1px solid var(--app-border)",
                bgcolor: "var(--app-panel)",
              }}
            >
              {resolvedTheme === "dark" ? (
                <LightModeRounded />
              ) : (
                <DarkModeRounded />
              )}
            </IconButton>
          </Stack>

          <Box sx={{ px: { xs: 2, md: 3 }, pt: { xs: 2, md: 3 } }}>{children}</Box>
        </Box>
      </Box>

      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: "min(86vw, 320px)",
              bgcolor: "var(--app-panel)",
              backgroundImage:
                "radial-gradient(circle at top left, rgba(225,29,72,0.08), transparent 26%), radial-gradient(circle at bottom right, rgba(37,99,235,0.08), transparent 24%)",
            },
          },
        }}
      >
        {sidebar}
      </Drawer>

      <InputsHistoryModal
        isOpen={showInputsHistory}
        onClose={() => setShowInputsHistory(false)}
        onLoadInput={() => {}}
      />
    </>
  );
}
