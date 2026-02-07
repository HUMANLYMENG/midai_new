'use client';

import { cn } from '@/lib/utils';
import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-medium text-foreground-secondary mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-3 py-2 rounded-lg',
            'bg-background-tertiary border border-border-color',
            'text-foreground-primary text-sm placeholder:text-foreground-muted',
            'transition-all duration-150',
            'focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50',
            'hover:border-accent/30',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = 'Input';
