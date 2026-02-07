'use client';

import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { SelectHTMLAttributes, forwardRef } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-medium text-foreground-secondary mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              'w-full px-3 py-2 pr-10 rounded-lg appearance-none',
              'bg-background-tertiary border border-border-color',
              'text-foreground-primary text-sm',
              'transition-all duration-150',
              'focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50',
              'hover:border-accent/30',
              className
            )}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none"
          />
        </div>
      </div>
    );
  }
);

Select.displayName = 'Select';
