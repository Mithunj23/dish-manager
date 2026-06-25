import React, { useState } from 'react';
import styles from './DishCard.module.css';

export default function DishCard({ dish, isToggling, onToggle }) {
  const [imgErr, setImgErr] = useState(false);

  return (
    <div className={`${styles.card} ${dish.isPublished ? '' : styles.unpublished}`}>
      <div className={styles.imageWrap}>
        {!imgErr
          ? <img src={dish.imageUrl} alt={dish.dishName} className={styles.image} onError={() => setImgErr(true)} />
          : <div className={styles.imgFallback}>🍽</div>
        }
        <span className={`${styles.badge} ${dish.isPublished ? styles.badgeLive : styles.badgeDraft}`}>
          <span className={styles.badgeDot} />
          {dish.isPublished ? 'Live' : 'Draft'}
        </span>
      </div>

      <div className={styles.body}>
        <div className={styles.meta}>
          <h3 className={styles.name}>{dish.dishName}</h3>
          <code className={styles.id}>{dish.dishId}</code>
        </div>

        <button
          className={`${styles.toggleBtn} ${isToggling ? styles.toggling : ''} ${dish.isPublished ? styles.btnUnpublish : styles.btnPublish}`}
          onClick={() => onToggle(dish.dishId)}
          disabled={isToggling}
        >
          {isToggling
            ? <><span className={styles.spinner} /> Updating…</>
            : dish.isPublished
              ? <><EyeOff /> Unpublish</>
              : <><Eye /> Publish</>
          }
        </button>
      </div>
    </div>
  );
}

function Eye() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function EyeOff() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}
