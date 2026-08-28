import type { ReactNode } from 'react';
import Icon, { type IconName } from './Icon';

type Variant = 'danger' | 'success' | 'primary';

interface Props {
  icon?: IconName;
  variant?: Variant;
  title: string;
  text?: ReactNode;
  note?: string;
  confirmLabel: string;
  onConfirm: () => void;
  confirmVariant?: 'primary' | 'danger';
  cancelLabel?: string;
  onCancel?: () => void;
}

// Customowe okno dialogowe (zamiast systemowych alert/confirm), styl 1:1 z apką.
export default function AppDialog({
  icon, variant = 'primary', title, text, note,
  confirmLabel, onConfirm, confirmVariant = 'primary', cancelLabel, onCancel,
}: Props) {
  return (
    <div className="dialog-back" onClick={onCancel}>
      <div className="dialog-card" onClick={(e) => e.stopPropagation()}>
        {icon && (
          <div className={`dialog-ic ${variant}`}>
            <Icon name={icon} size={28} color={variant === 'success' ? '#fff' : undefined} />
          </div>
        )}
        <h3>{title}</h3>
        {text && <p>{text}</p>}
        {note && <p className="dialog-note">{note}</p>}
        <div className="dialog-actions">
          <button className={`btn block ${confirmVariant === 'danger' ? 'danger' : ''}`} onClick={onConfirm}>{confirmLabel}</button>
          {cancelLabel && onCancel && <button className="btn ghost block" onClick={onCancel}>{cancelLabel}</button>}
        </div>
      </div>
    </div>
  );
}
