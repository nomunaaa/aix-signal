/**
 * FontAwesome Icon Wrapper Component (Lucide-based)
 * Provides backward compatibility with FA-style API using Lucide icons
 */

import { getLucideIcon } from '@/lib/fontawesome';
import { cn } from '@/lib/utils';
import { HelpCircle } from 'lucide-react';

export interface FAIconProps {
  icon: string;
  type?: 'solid' | 'brand';
  color?: 'default' | 'muted' | 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'bull' | 'bear' | 'neutral';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
  spin?: boolean;
  pulse?: boolean;
}

export const FAIcon = ({ 
  icon, 
  color = 'default',
  size = 'md',
  className,
  spin,
  pulse
}: FAIconProps) => {
  const LucideIcon = getLucideIcon(icon);

  // Fallback to HelpCircle if icon not found
  const IconComponent = LucideIcon || HelpCircle;
  
  // Map color prop to Tailwind classes
  const colorClass = {
    'default': 'text-foreground',
    'muted': 'text-muted-foreground',
    'primary': 'text-primary',
    'secondary': 'text-secondary',
    'success': 'text-semantic-bull',
    'danger': 'text-semantic-bear',
    'warning': 'text-yellow-500',
    'info': 'text-blue-500',
    'bull': 'text-semantic-bull',
    'bear': 'text-semantic-bear',
    'neutral': 'text-muted-foreground',
  }[color];
  
  // Map size prop to Tailwind classes
  const sizeClass = {
    'xs': 'h-3 w-3',
    'sm': 'h-4 w-4',
    'md': 'h-5 w-5',
    'lg': 'h-6 w-6',
    'xl': 'h-8 w-8',
    '2xl': 'h-10 w-10',
    '3xl': 'h-12 w-12',
  }[size];
  
  const classes = cn(
    colorClass,
    sizeClass,
    spin && 'animate-spin',
    pulse && 'animate-pulse',
    className
  );

  if (!IconComponent) {
    console.warn(`Icon "${icon}" not found in Lucide mapping`);
    return <HelpCircle className={classes} aria-hidden="true" />;
  }

  return <IconComponent className={classes} aria-hidden="true" />;
};

// Preset color variants for convenience
export const FAIconPrimary = (props: Omit<FAIconProps, 'color'>) => 
  <FAIcon {...props} color="primary" />;

export const FAIconSuccess = (props: Omit<FAIconProps, 'color'>) => 
  <FAIcon {...props} color="success" />;

export const FAIconWarning = (props: Omit<FAIconProps, 'color'>) => 
  <FAIcon {...props} color="warning" />;

export const FAIconDanger = (props: Omit<FAIconProps, 'color'>) => 
  <FAIcon {...props} color="danger" />;

export const FAIconMuted = (props: Omit<FAIconProps, 'color'>) => 
  <FAIcon {...props} color="muted" />;
