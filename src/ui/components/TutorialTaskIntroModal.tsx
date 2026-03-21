import React, { useEffect, useRef, useState } from 'react';
import './TutorialTaskIntroModal.css';

interface TutorialTaskIntroModalProps {
  setupText: string;      // "Turtle wanted..."
  objectiveText: string;  // "Do this..."
  dismissLabel: string;
  getFlyToRect?: () => DOMRect | null;
  onDismissed: () => void;
}

export const TutorialTaskIntroModal: React.FC<TutorialTaskIntroModalProps> = ({
  setupText,
  objectiveText,
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
  }, [setupText, objectiveText]);

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
        aria-labelledby="tutorial-intro-setup"
      >
        <div className="tutorial-intro-setup" id="tutorial-intro-setup">
          {setupText}
        </div>

        <div className="tutorial-intro-objective">
          {objectiveText}
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