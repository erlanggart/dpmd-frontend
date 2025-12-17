// src/components/AnimatedIcon.jsx
import React from 'react';
import './AnimatedIcon.css';

const AnimatedIcon = ({ type, isActive, isHovered, className = "w-5 h-5" }) => {
  // Emoji mapping untuk setiap tipe icon
  const emojiMap = {
    dashboard: String.fromCodePoint(0x1F4CA),
    users: String.fromCodePoint(0x1F465),
    briefcase: String.fromCodePoint(0x1F4BC),
    dollar: String.fromCodePoint(0x1F4B0),
    trending: String.fromCodePoint(0x1F4C8),
    logout: String.fromCodePoint(0x1F6AA)
  };

  const emoji = emojiMap[type] || String.fromCodePoint(0x2B50);

  return (
    <div className="inline-flex items-center justify-center">
      <div 
        className={`
          ${className} 
          flex items-center justify-center
          text-[1.2em]
          transition-all duration-300
          ${(isActive || isHovered) ? 'animate-emoji-bounce' : ''}
        `}
        style={{
          filter: isActive ? 'drop-shadow(0 0 8px currentColor)' : 'none'
        }}
      >
        {emoji}
      </div>
    </div>
  );
};

export default AnimatedIcon;
