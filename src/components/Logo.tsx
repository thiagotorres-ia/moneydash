import React from 'react';

interface LogoProps {
  className?: string;
  classNamePath?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-6 h-6", classNamePath = "stroke-current" }) => {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      {/* Container / Card Shape */}
      <rect 
        x="2" 
        y="3" 
        width="20" 
        height="18" 
        rx="4" 
        className={classNamePath} 
        strokeWidth="2" 
      />
      
      {/* Dashboard Element 1: Bar Chart Left */}
      <path 
        d="M8 16V12" 
        className={classNamePath} 
        strokeWidth="2" 
        strokeLinecap="round" 
      />
      
      {/* Dashboard Element 2: Bar Chart Middle */}
      <path 
        d="M12 16V9" 
        className={classNamePath} 
        strokeWidth="2" 
        strokeLinecap="round" 
      />
      
      {/* Dashboard Element 3: Bar Chart Right (Growth) */}
      <path 
        d="M16 16V7" 
        className={classNamePath} 
        strokeWidth="2" 
        strokeLinecap="round" 
      />
      
      {/* Header Line / Status */}
      <circle 
        cx="17" 
        cy="7" 
        r="1" 
        className={classNamePath} 
        fill="currentColor"
      />
    </svg>
  );
};