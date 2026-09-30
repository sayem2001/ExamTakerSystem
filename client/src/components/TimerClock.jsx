import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';

export const TimerClock = ({ durationMinutes = 60, startedAt, onTimeUp }) => {
  const totalSeconds = durationMinutes * 60;

  const calculateRemainingSeconds = () => {
    if (!startedAt) return totalSeconds;
    const startMs = new Date(startedAt).getTime();
    const elapsedSeconds = Math.floor((Date.now() - startMs) / 1000);
    const rem = totalSeconds - elapsedSeconds;
    return Math.max(0, rem);
  };

  const [remainingSeconds, setRemainingSeconds] = useState(calculateRemainingSeconds);

  useEffect(() => {
    const timer = setInterval(() => {
      const rem = calculateRemainingSeconds();
      setRemainingSeconds(rem);

      if (rem <= 0) {
        clearInterval(timer);
        if (onTimeUp) {
          onTimeUp();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [durationMinutes, startedAt, onTimeUp]);

  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  const isUrgent = remainingSeconds <= 300; // Under 5 minutes
  const isCritical = remainingSeconds <= 60; // Under 1 minute

  const formatDigits = (n) => (n < 10 ? `0${n}` : `${n}`);

  const formattedTime =
    hours > 0
      ? `${formatDigits(hours)}:${formatDigits(minutes)}:${formatDigits(seconds)}`
      : `${formatDigits(minutes)}:${formatDigits(seconds)}`;

  return (
    <div
      className="timer-clock-badge"
      style={{
        background: isCritical
          ? 'rgba(244, 63, 94, 0.25)'
          : isUrgent
          ? 'rgba(245, 158, 11, 0.2)'
          : 'rgba(255, 255, 255, 0.05)',
        border: `1px solid ${
          isCritical
            ? '#f43f5e'
            : isUrgent
            ? '#f59e0b'
            : 'var(--border-subtle)'
        }`,
        color: isCritical ? '#f43f5e' : isUrgent ? '#fbbf24' : '#f8fafc',
        boxShadow: isCritical ? '0 0 15px rgba(244, 63, 94, 0.4)' : 'none',
      }}
    >
      <Clock size={15} className={isCritical ? 'animate-pulse' : ''} />
      <span>{formattedTime}</span>
      {isUrgent && (
        <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {isCritical ? 'CRITICAL' : 'EXPIRING'}
        </span>
      )}
    </div>
  );
};

export default TimerClock;
