import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import {
  placeMultiServerDropdown,
  type MultiServerDropdownPlacement,
} from '@/services/multiServerDropdown';

export function useMultiServerDropdown(placement: MultiServerDropdownPlacement) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(event.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const toggle = (event: ReactMouseEvent) => {
    event.stopPropagation();
    if (!open && buttonRef.current) {
      setPosition(placeMultiServerDropdown(buttonRef.current.getBoundingClientRect(), {
        placement,
        viewportWidth: window.innerWidth,
      }));
    }
    setOpen((current) => !current);
  };

  const close = () => setOpen(false);

  return { open, close, panelRef, buttonRef, position, toggle };
}
