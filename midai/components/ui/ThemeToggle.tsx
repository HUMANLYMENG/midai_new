'use client';

import { useEffect } from 'react';
import { useThemeStore, initTheme } from '@/lib/theme';
import { Sun, Moon, Monitor } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  useEffect(() => {
    initTheme();
  }, []);

  const themes: Array<{ value: typeof theme; icon: React.ReactNode; label: string }> = [
    { value: 'light', icon: <Sun size={16} />, label: 'Light' },
    { value: 'dark', icon: <Moon size={16} />, label: 'Dark' },
    { value: 'system', icon: <Monitor size={16} />, label: 'Auto' },
  ];

  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-full bg-background-tertiary/50">
      {themes.map((t) => (
        <button
          key={t.value}
          onClick={() => setTheme(t.value)}
          className={`p-2 rounded-full transition-all duration-200 ${
            theme === t.value
              ? 'bg-accent text-white shadow-sm'
              : 'text-foreground-secondary hover:text-foreground-primary hover:bg-background-elevated'
          }`}
          title={t.label}
        >
          {t.icon}
        </button>
      ))}
    </div>
  );
}
