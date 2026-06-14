import { create } from 'zustand';

const STORAGE_KEY = 'erd-designer-theme';

function getInitialTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {}
  // Default to light
  return 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {}
}

const useThemeStore = create((set) => {
  const initial = getInitialTheme();
  // Apply immediately on load
  applyTheme(initial);

  return {
    theme: initial,

    toggleTheme: () => {
      set((state) => {
        const next = state.theme === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        return { theme: next };
      });
    },

    setTheme: (theme) => {
      applyTheme(theme);
      set({ theme });
    },
  };
});

export default useThemeStore;
