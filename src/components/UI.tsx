import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Inbox, LoaderCircle, X, type LucideIcon } from 'lucide-react';
import { initials } from '../lib/format';

export function Avatar({ name, size = 'medium' }: { name: string; size?: 'small' | 'medium' | 'large' }) {
  const palette = Math.abs([...name].reduce((total, character) => total + character.charCodeAt(0), 0)) % 5;
  return <span className={`avatar avatar-${size} avatar-color-${palette}`} aria-hidden="true">{initials(name)}</span>;
}

export function PageHeader({ eyebrow, title, description, actions }: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <div className="page-eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function Modal({ title, description, onClose, children, size = 'medium' }: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  size?: 'small' | 'medium' | 'large';
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <div>
            <h2 id="modal-title">{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
        </div>
        {children}
      </section>
    </div>,
    document.body,
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`toggle ${checked ? 'toggle-on' : ''}`}
      onClick={onChange}
    >
      <span />
    </button>
  );
}

export function PageLoader() {
  return <div className="page-loader"><LoaderCircle className="spin" size={28} /><span>Chargement de votre espace…</span></div>;
}

export function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="state-card error-state">
      <AlertCircle size={28} />
      <h2>Un petit contretemps</h2>
      <p>{message}</p>
      <button className="button button-secondary" onClick={retry}>Réessayer</button>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon size={25} /></div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function SubmitButton({ saving, children }: { saving: boolean; children: ReactNode }) {
  return <button className="button button-primary" type="submit" disabled={saving}>{saving && <LoaderCircle className="spin" size={17} />}{saving ? 'Enregistrement…' : children}</button>;
}
