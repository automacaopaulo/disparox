interface LogoProps {
  showText?: boolean;
  className?: string;
}

export function Logo({ showText = true, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Icon */}
      <svg 
        width="32" 
        height="32" 
        viewBox="0 0 32 32" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <path 
          d="M8 6L24 16L8 26V6Z" 
          fill="#3B82F6"
          className="transition-colors"
        />
      </svg>
      
      {/* Text */}
      {showText && (
        <span className="text-xl font-bold tracking-tight whitespace-nowrap">
          Disparo<span className="text-primary">X</span>
        </span>
      )}
    </div>
  );
}
