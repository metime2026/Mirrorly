/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export interface ToastProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: (id: string) => void;
  key?: string;
}

export default function Toast({ id, message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 3800);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  const bgClass = 
    type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
    type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
    'bg-blue-50 border-blue-200 text-blue-800';

  const Icon = 
    type === 'success' ? CheckCircle :
    type === 'error' ? AlertCircle :
    CheckCircle;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className={`flex items-center gap-3 px-4 py-3 border rounded-xl shadow-lg max-w-sm w-full ${bgClass} pointer-events-auto`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <p className="text-sm font-medium flex-1">{message}</p>
      <button 
        onClick={() => onClose(id)}
        className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer p-0.5 rounded-md hover:bg-black/5"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>;
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed bottom-20 left-4 right-4 md:bottom-6 md:right-6 md:left-auto flex flex-col gap-2 z-50 pointer-events-none items-center md:items-end">
      <AnimatePresence>
        {toasts.map(t => (
          <Toast id={t.id} key={t.id} message={t.message} type={t.type} onClose={onClose} />
        ))}
      </AnimatePresence>
    </div>
  );
}
