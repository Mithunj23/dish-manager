import React, { useState, useEffect, useRef } from 'react';
import styles from './Toast.module.css';

let _addToast = null;
export const toast = {
  show: (msg, type = 'info') => _addToast?.({ msg, type, id: Date.now() }),
  pub:  (msg) => toast.show(msg, 'pub'),
  unpub:(msg) => toast.show(msg, 'unpub'),
  sync: (msg) => toast.show(msg, 'sync'),
};

export function ToastProvider() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    _addToast = (t) => {
      setToasts(prev => [t, ...prev].slice(0, 5));
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 3500);
    };
    return () => { _addToast = null; };
  }, []);

  return (
    <div className={styles.wrap}>
      {toasts.map(t => <ToastItem key={t.id} {...t} />)}
    </div>
  );
}

function ToastItem({ msg, type }) {
  const icons = { pub: '✓', unpub: '◎', sync: '⟳', info: 'ℹ' };
  return (
    <div className={`${styles.toast} ${styles[type] || ''}`}>
      <span className={styles.icon}>{icons[type] || icons.info}</span>
      <span className={styles.msg}>{msg}</span>
    </div>
  );
}
