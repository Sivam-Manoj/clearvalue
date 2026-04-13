"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CssBaseline,
  GlobalStyles,
  ThemeProvider,
  alpha,
  createTheme,
} from "@mui/material";

type ColorMode = "light" | "dark";

type ColorModeContextValue = {
  mode: ColorMode;
  resolvedTheme: ColorMode;
  setMode: (mode: ColorMode) => void;
  toggleMode: () => void;
};

const STORAGE_KEY = "cv-color-mode";

const ColorModeContext = createContext<ColorModeContextValue | undefined>(
  undefined
);

function getSystemMode(): ColorMode {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ColorModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mode, setModeState] = useState<ColorMode>("light");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? (window.localStorage.getItem(STORAGE_KEY) as ColorMode | null)
        : null;
    const nextMode =
      stored === "dark" || stored === "light" ? stored : getSystemMode();
    setModeState(nextMode);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.dataset.theme = mode;
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [hydrated, mode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setModeState(media.matches ? "dark" : "light");
      }
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const setMode = (nextMode: ColorMode) => setModeState(nextMode);
  const toggleMode = () =>
    setModeState((current) => (current === "light" ? "dark" : "light"));

  const theme = useMemo(() => {
    const isDark = mode === "dark";

    return createTheme({
      palette: {
        mode,
        primary: {
          main: isDark ? "#fb7185" : "#e11d48",
          light: isDark ? "#fda4af" : "#fb7185",
          dark: isDark ? "#be123c" : "#9f1239",
        },
        secondary: {
          main: isDark ? "#60a5fa" : "#2563eb",
        },
        success: {
          main: isDark ? "#4ade80" : "#059669",
        },
        warning: {
          main: isDark ? "#fbbf24" : "#d97706",
        },
        error: {
          main: isDark ? "#f87171" : "#dc2626",
        },
        background: {
          default: isDark ? "#07111f" : "#eef3f9",
          paper: isDark ? "#0f1b2d" : "#ffffff",
        },
        text: {
          primary: isDark ? "#e5eefc" : "#0f172a",
          secondary: isDark ? "#94a3b8" : "#475569",
        },
        divider: isDark
          ? "rgba(148, 163, 184, 0.16)"
          : "rgba(15, 23, 42, 0.08)",
      },
      shape: {
        borderRadius: 20,
      },
      typography: {
        fontFamily:
          "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
        h1: {
          fontWeight: 800,
          letterSpacing: "-0.04em",
        },
        h2: {
          fontWeight: 800,
          letterSpacing: "-0.03em",
        },
        h3: {
          fontWeight: 700,
          letterSpacing: "-0.02em",
        },
        button: {
          fontWeight: 700,
          textTransform: "none",
        },
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body: {
              backgroundColor: "var(--app-bg)",
              color: "var(--app-text)",
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: "none",
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 16,
              boxShadow: "none",
            },
          },
        },
        MuiDrawer: {
          styleOverrides: {
            paper: {
              backgroundImage: "none",
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: {
              borderRadius: 999,
            },
          },
        },
        MuiOutlinedInput: {
          styleOverrides: {
            root: {
              borderRadius: 16,
            },
          },
        },
      },
    });
  }, [mode]);

  const contextValue = useMemo<ColorModeContextValue>(
    () => ({
      mode,
      resolvedTheme: mode,
      setMode,
      toggleMode,
    }),
    [mode]
  );

  return (
    <ColorModeContext.Provider value={contextValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles
          styles={{
            ":root": {
              colorScheme: mode,
              "--app-bg": mode === "dark" ? "#07111f" : "#eef3f9",
              "--app-panel": mode === "dark" ? "#0f1b2d" : "#ffffff",
              "--app-panel-alt": mode === "dark" ? "#132238" : "#f8fafc",
              "--app-panel-soft":
                mode === "dark"
                  ? "rgba(15, 27, 45, 0.78)"
                  : "rgba(255, 255, 255, 0.82)",
              "--app-text": mode === "dark" ? "#e5eefc" : "#0f172a",
              "--app-text-muted": mode === "dark" ? "#94a3b8" : "#475569",
              "--app-border":
                mode === "dark"
                  ? "rgba(148, 163, 184, 0.16)"
                  : "rgba(15, 23, 42, 0.08)",
              "--app-accent": mode === "dark" ? "#fb7185" : "#e11d48",
              "--app-accent-soft":
                mode === "dark"
                  ? "rgba(251, 113, 133, 0.16)"
                  : "rgba(225, 29, 72, 0.08)",
              "--app-shadow-shell":
                mode === "dark"
                  ? "0 22px 70px rgba(2, 6, 23, 0.48)"
                  : "0 20px 60px rgba(15, 23, 42, 0.08)",
              "--app-shadow-card":
                mode === "dark"
                  ? "0 20px 45px rgba(2, 6, 23, 0.36)"
                  : "0 16px 40px rgba(15, 23, 42, 0.08)",
              "--app-shadow-modal":
                mode === "dark"
                  ? "0 30px 90px rgba(2, 6, 23, 0.58)"
                  : "0 28px 90px rgba(15, 23, 42, 0.18)",
              "--app-overlay":
                mode === "dark"
                  ? "linear-gradient(180deg, rgba(7,17,31,0.96) 0%, rgba(7,17,31,0.78) 100%)"
                  : "linear-gradient(180deg, rgba(255,255,255,0.84) 0%, rgba(238,243,249,0.94) 100%)",
            },
            "*": {
              scrollbarWidth: "thin",
              scrollbarColor:
                mode === "dark"
                  ? "rgba(148,163,184,0.3) transparent"
                  : "rgba(148,163,184,0.4) transparent",
            },
            "::-webkit-scrollbar": {
              width: 10,
              height: 10,
            },
            "::-webkit-scrollbar-thumb": {
              backgroundColor:
                mode === "dark"
                  ? "rgba(148,163,184,0.22)"
                  : "rgba(148,163,184,0.38)",
              borderRadius: 999,
            },
            "::selection": {
              backgroundColor: alpha(
                mode === "dark" ? "#fb7185" : "#e11d48",
                0.28
              ),
            },
          }}
        />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export function useColorMode() {
  const context = useContext(ColorModeContext);
  if (!context) {
    throw new Error("useColorMode must be used within ColorModeProvider");
  }
  return context;
}
