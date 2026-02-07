import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'dark' | 'light' | 'system';

interface ThemeState {
  theme: Theme;
  resolvedTheme: 'dark' | 'light';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

// 监听系统主题变化
function getSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      resolvedTheme: 'dark',
      
      setTheme: (theme) => {
        const resolved = theme === 'system' ? getSystemTheme() : theme;
        set({ theme, resolvedTheme: resolved });
        
        // 应用到 document
        if (typeof document !== 'undefined') {
          const root = document.documentElement;
          if (resolved === 'dark') {
            root.classList.add('dark');
            root.classList.remove('light');
          } else {
            root.classList.add('light');
            root.classList.remove('dark');
          }
        }
      },
      
      toggleTheme: () => {
        const current = get().theme;
        const next = current === 'dark' ? 'light' : 'dark';
        get().setTheme(next);
      },
    }),
    {
      name: 'midai-theme',
      onRehydrateStorage: () => (state) => {
        // 恢复时重新应用主题
        if (state) {
          state.setTheme(state.theme);
        }
      },
    }
  )
);

// 初始化主题
export function initTheme() {
  if (typeof document === 'undefined') return;
  
  const stored = localStorage.getItem('midai-theme');
  const theme = stored ? JSON.parse(stored).state.theme as Theme : 'dark';
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.add('light');
  }
}
