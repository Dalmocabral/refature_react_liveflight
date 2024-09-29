// src/components/ZuluClock.jsx
import React, { useEffect, useState } from 'react';

const ZuluClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const formatTime = (date) => {
    return date.toUTCString().split(' ')[4];
  };

  return (
    <div className="zulu-clock">
      <p><strong>{formatTime(time)} UTC</strong></p>
    </div>
  );
};

export default ZuluClock;
