import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type LayoutTheme = "classic" | "modern";

interface LayoutThemeContextType {
  theme: LayoutTheme;
  toggleTheme: () => void;
  setTheme: (theme: LayoutTheme) => void;
}

const LayoutThemeContext = createContext<LayoutThemeContextType | undefined>(undefined);

export function LayoutThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<LayoutTheme>(() => {
    const saved = localStorage.getItem("layout-theme");
    return (saved === "classic" || saved === "modern") ? saved : "modern";
  });

  useEffect(() => {
    localStorage.setItem("layout-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setThemeState(prev => prev === "classic" ? "modern" : "classic");
  };

  const setTheme = (newTheme: LayoutTheme) => {
    setThemeState(newTheme);
  };

  return (
    <LayoutThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </LayoutThemeContext.Provider>
  );
}

export function useLayoutTheme() {
  const context = useContext(LayoutThemeContext);
  if (!context) {
    throw new Error("useLayoutTheme must be used within LayoutThemeProvider");
  }
  return context;
}
