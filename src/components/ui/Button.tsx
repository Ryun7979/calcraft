import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'green' | 'blue' | 'orange';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  className, 
  variant = 'default', 
  ...props 
}) => {
  const variantClasses = {
    default: '',
    green: 'mc-button-green',
    blue: 'mc-button-blue',
    orange: 'mc-button-orange',
  };

  return (
    <button
      className={cn(
        'mc-button',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
