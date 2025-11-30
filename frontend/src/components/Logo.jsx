function Logo({ size = "large" }) {
  const sizes = {
    small: "w-12 h-12",
    medium: "w-20 h-20",
    large: "w-32 h-32"
  };

  return (
    <div className={`${sizes[size]} relative`}>
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#3B82F6", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#1E40AF", stopOpacity: 1 }} />
          </linearGradient>
          <linearGradient id="gradient2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#60A5FA", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#3B82F6", stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="95" fill="url(#gradient1)" />
        <g transform="translate(100, 100)">
          <rect x="-35" y="10" width="70" height="60" fill="white" rx="4" />
          <path d="M -45 10 L 0 -40 L 45 10 Z" fill="url(#gradient2)" />
          <rect x="-15" y="-60" width="30" height="25" fill="white" rx="2" />
          <path d="M -20 -60 L 0 -75 L 20 -60 Z" fill="url(#gradient2)" />
          <rect x="-3" y="-95" width="6" height="25" fill="white" rx="1" />
          <rect x="-10" y="-85" width="20" height="6" fill="white" rx="1" />
          <rect x="-12" y="35" width="24" height="35" fill="url(#gradient2)" rx="12" />
          <circle cx="-20" cy="30" r="6" fill="url(#gradient2)" opacity="0.8" />
          <circle cx="20" cy="30" r="6" fill="url(#gradient2)" opacity="0.8" />
        </g>
        <circle cx="100" cy="100" r="95" fill="none" stroke="white" strokeWidth="3" opacity="0.3" />
      </svg>
    </div>
  );
}

export default Logo;
