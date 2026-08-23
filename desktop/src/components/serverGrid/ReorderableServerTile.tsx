import type { ReactNode } from 'react';
import { ServerReorderControls } from '@/components/serverGrid/ServerGridChrome';

export function ReorderableServerTile({
  variant,
  onReorder,
  canMoveUp,
  canMoveDown,
  moveUpTitle,
  moveDownTitle,
  children,
}: {
  variant: 'card' | 'list';
  onReorder: (direction: 'up' | 'down') => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  moveUpTitle: string;
  moveDownTitle: string;
  children: ReactNode;
}) {
  const controls = (
    <ServerReorderControls
      variant={variant}
      onReorder={onReorder}
      canMoveUp={canMoveUp}
      canMoveDown={canMoveDown}
      moveUpTitle={moveUpTitle}
      moveDownTitle={moveDownTitle}
    />
  );

  return (
    <div className="relative group">
      {variant === 'list' ? controls : null}
      {children}
      {variant === 'card' ? controls : null}
    </div>
  );
}
