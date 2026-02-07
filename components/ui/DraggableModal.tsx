'use client';

import { useRef, useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GripHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraggableModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function DraggableModal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className
}: DraggableModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // 关闭时重置位置
  useEffect(() => {
    if (!isOpen) {
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.close-btn')) return;
    
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;
      
      // 限制在视窗内
      const maxX = window.innerWidth - 400;
      const maxY = window.innerHeight - 500;
      
      const clampedX = Math.max(-200, Math.min(newX, maxX));
      const clampedY = Math.max(-50, Math.min(newY, maxY));
      
      setPosition({ x: clampedX, y: clampedY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />
          
          {/* Draggable Modal */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
            }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{ 
              position: 'fixed',
              left: `calc(50% + ${position.x}px)`,
              top: `calc(15% + ${position.y}px)`,
              transform: 'translateX(-50%)',
              zIndex: 50
            }}
            className={cn(
              'w-full max-w-md max-h-[80vh] overflow-auto',
              'glass-panel',
              isDragging && 'cursor-grabbing',
              className
            )}
          >
            {/* Drag Handle Header */}
            <div 
              className="flex items-center justify-between px-4 py-3 border-b border-border-color cursor-grab active:cursor-grabbing select-none"
              onMouseDown={handleMouseDown}
            >
              <div className="flex items-center gap-2 text-foreground-muted">
                <GripHorizontal size={18} />
                <span className="text-xs font-medium">DRAG TO MOVE</span>
              </div>
              
              {title && (
                <h2 className="text-base font-semibold text-foreground-primary absolute left-1/2 -translate-x-1/2">
                  {title}
                </h2>
              )}
              
              <button
                onClick={onClose}
                className="close-btn p-1.5 rounded-full text-foreground-muted hover:text-foreground-primary hover:bg-background-elevated transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
