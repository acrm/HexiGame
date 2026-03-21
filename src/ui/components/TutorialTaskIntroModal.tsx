import React, { useEffect, useRef, useState } from 'react';
import './TutorialTaskIntroModal.css';

interface TutorialTaskIntroModalProps {
  title: string;
  taskLabel: string;
  taskText: string;
  goalLabel: string;
  goalText: string;
  dismissLabel: string;
  getFlyToRect?: () => DOMRect | null;
  onDismissed: () => void;
}

export const TutorialTaskIntroModal: React.FC<TutorialTaskIntroModalProps> = ({
  title,
  taskLabel,
  taskText,
  goalLabel,
  goalText,
  dismissLabel,
  getFlyToRect,
  onDismissed,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [flightStyle, setFlightStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    setIsClosing(false);
    setFlightStyle({});
  }, [title, taskText, goalText]);

  const handleDismiss = () => {
    if (isClosing) return;

    const cardRect = cardRef.current?.getBoundingClientRect();
    const targetRect = getFlyToRect?.() ?? null;

    if (cardRect) {
      const cardCenterX = cardRect.left + cardRect.width / 2;
      const cardCenterY = cardRect.top + cardRect.height / 2;

      let translateX = 0;
      let translateY = -Math.max(180, cardRect.top - 64);
      let scaleX = 0.2;
      let scaleY = 0.2;

      if (targetRect) {
        const targetCenterX = targetRect.left + targetRect.width / 2;
        const targetCenterY = targetRect.top + targetRect.height / 2;
        translateX = targetCenterX - cardCenterX;
        translateY = targetCenterY - cardCenterY;
        scaleX = Math.max(0.12, targetRect.width / cardRect.width);
        scaleY = Math.max(0.12, targetRect.height / cardRect.height);
      }

      setFlightStyle({
        ['--tutorial-intro-flight-x' as string]: `${translateX}px`,
        ['--tutorial-intro-flight-y' as string]: `${translateY}px`,
        ['--tutorial-intro-flight-scale-x' as string]: String(scaleX),
        ['--tutorial-intro-flight-scale-y' as string]: String(scaleY),
      });
    }

    setIsClosing(true);
  };

  return (
    <div
      className={`tutorial-intro-overlay ${isClosing ? 'closing' : ''}`}
      onClick={handleDismiss}
    >
      <div
        ref={cardRef}
        className={`tutorial-intro-card ${isClosing ? 'closing' : ''}`}
        style={flightStyle}
        onClick={(event) => event.stopPropagation()}
        onAnimationEnd={() => {
          if (isClosing) {
            onDismissed();
          }
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-intro-title"
      >
        <div className="tutorial-intro-header">
          <div className="tutorial-intro-badge">{title}</div>
          <h2 id="tutorial-intro-title" className="tutorial-intro-title">{taskText}</h2>
        </div>

        <div className="tutorial-intro-section">
          <div className="tutorial-intro-label">{taskLabel}</div>
          <div className="tutorial-intro-text">{taskText}</div>
        </div>

        <div className="tutorial-intro-section">
          <div className="tutorial-intro-label">{goalLabel}</div>
          <div className="tutorial-intro-text tutorial-intro-text-secondary">{goalText}</div>
        </div>

        <button
          type="button"
          className="tutorial-intro-dismiss"
          onClick={(event) => {
            event.stopPropagation();
            handleDismiss();
          }}
        >
          {dismissLabel}
        </button>
      </div>
    </div>
  );
};

export default TutorialTaskIntroModal;