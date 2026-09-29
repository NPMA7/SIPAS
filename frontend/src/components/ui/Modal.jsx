import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'max-w-lg',
  closeOnBackdrop = false
}) {
  const [shaking, setShaking] = useState(false);
  const shakeTimeoutRef = useRef(null);

  if (!open) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      if (closeOnBackdrop) {
        onClose?.();
      } else {
        // Feedback visual saat klik di luar modal agar user tahu modal tetap terkunci
        setShaking(true);
        if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
        shakeTimeoutRef.current = setTimeout(() => setShaking(false), 300);
      }
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop backdrop-blur-sm animate-fadeIn"
      onClick={handleBackdropClick}
    >
      <div
        className={`w-full ${maxWidth} max-h-[90vh] flex flex-col modal-box rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 ${
          shaking ? 'scale-[1.02] ring-2 ring-blue-500/60 shadow-blue-500/20' : 'animate-scaleIn'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 modal-header">
          <h3 className="text-base font-bold modal-title">{title}</h3>
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded-lg modal-close-btn transition-colors cursor-pointer"
            onClick={onClose}
            title="Tutup (Esc)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 modal-body">{children}</div>
        {footer && <div className="flex items-center justify-end gap-3 px-6 py-4 modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
