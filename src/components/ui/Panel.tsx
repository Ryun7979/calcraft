import React from 'react';
import { cn } from '../../lib/utils';

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Panel: React.FC<PanelProps> = ({ children, className, ...props }) => {
  return (
    <div className={cn('mc-panel', className)} {...props}>
      {children}
    </div>
  );
};
