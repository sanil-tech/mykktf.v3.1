import React from 'react';

export function KKTFLogo({ className = "w-10 h-10", showText = true }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full shrink-0"
      >
        {/* White background rounded backing */}
        <rect width="200" height="200" rx="24" fill="white" />

        {/* Green House Outline */}
        {/* Chimney */}
        <rect x="56" y="24" width="16" height="34" fill="#84CC16" />
        {/* Roof Left */}
        <path
          d="M32 78L104 22L176 78L166 90L104 42L42 90L32 78Z"
          fill="#84CC16"
        />
        {/* Left Wall & Base */}
        <path
          d="M40 84H54V168H176V182H40V84Z"
          fill="#84CC16"
        />
        {/* Right Wall */}
        <path
          d="M162 84H176V172H162V84Z"
          fill="#84CC16"
        />

        {/* Brown Intersecting Geometric Ribbons */}
        <path
          d="M18 132L108 190L122 176L46 128L80 74L66 64L18 132Z"
          fill="#8A5A2B"
        />
        <path
          d="M112 56L184 26L192 40L126 68L112 56Z"
          fill="#8A5A2B"
        />

        {/* Center Text inside Logo */}
        <text
          x="105"
          y="88"
          textAnchor="middle"
          fill="#1E293B"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="18"
          fontWeight="400"
          letterSpacing="2"
        >
          KOLEJ
        </text>
        <text
          x="105"
          y="108"
          textAnchor="middle"
          fill="#1E293B"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="18"
          fontWeight="400"
          letterSpacing="2"
        >
          KEDIAMAN
        </text>
        <text
          x="105"
          y="136"
          textAnchor="middle"
          fill="#0F172A"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="24"
          fontWeight="800"
          letterSpacing="1.5"
        >
          TUN FUAD
        </text>
        <text
          x="105"
          y="152"
          textAnchor="middle"
          fill="#64748B"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="8.5"
          fontWeight="600"
          letterSpacing="1"
        >
          UNIVERSITI MALAYSIA SABAH
        </text>
      </svg>
    </div>
  );
}

export function UMSLogo({ className = "h-8", variant = "light" }) {
  const isDark = variant === "dark";
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full aspect-square shrink-0"
      >
        {/* Outer Circle Ring */}
        <circle cx="50" cy="50" r="48" fill="white" stroke="#CBD5E1" strokeWidth="2" />
        <circle cx="50" cy="50" r="44" fill="none" stroke="#0F172A" strokeWidth="1.5" />
        
        {/* Inner Crest Shield */}
        <path d="M30 26H70V58C70 70 50 82 50 82C50 82 30 70 30 58V26Z" fill="#1E3A8A" stroke="#B45309" strokeWidth="1.5" />
        
        {/* Red Upper Section */}
        <path d="M30 26H70V44H30V26Z" fill="#DC2626" />
        
        {/* Yellow Chevron & Flower */}
        <path d="M30 54L50 68L70 54V58C70 70 50 82 50 82C50 82 30 70 30 58V54Z" fill="#F59E0B" />
        
        {/* Open Book in Red Section */}
        <path d="M40 34C44 32 48 33 50 35C52 33 56 32 60 34V40C56 38 52 39 50 41C48 39 44 38 40 40V34Z" fill="#FEF08A" />
        
        {/* Hibiscus in Shield Center */}
        <circle cx="50" cy="62" r="5" fill="#DC2626" />
        
        {/* Arc Text */}
        <path id="ums-arc" d="M 18,50 A 32,32 0 1,1 82,50" fill="none" />
        <text fontSize="7" fontWeight="bold" fill="#0F172A" letterSpacing="1">
          <textPath href="#ums-arc" startOffset="50%" textAnchor="middle">
            UNIVERSITI MALAYSIA SABAH
          </textPath>
        </text>
        <text x="50" y="93" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#0F172A" letterSpacing="0.8">
          SABAH
        </text>
      </svg>

      <div className="flex flex-col justify-center leading-none">
        <span className={`text-base font-serif font-black tracking-wider ${isDark ? 'text-slate-900' : 'text-white'}`}>
          UMS
        </span>
        <span className={`text-[8.5px] font-sans font-bold uppercase tracking-tight mt-0.5 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>
          Universiti Malaysia Sabah
        </span>
      </div>
    </div>
  );
}

export default { KKTFLogo, UMSLogo };
