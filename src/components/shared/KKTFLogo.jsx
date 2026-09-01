import React from 'react';

/**
 * Official UMS Logo (Universiti Malaysia Sabah)
 * Protocol: Parent University (Always placed first on the left)
 */
export function UMSLogo({ className = "h-9", variant = "light" }) {
  const isDark = variant === "dark";
  
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Official UMS Crest Seal */}
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full aspect-square shrink-0 filter drop-shadow-sm"
      >
        {/* Outer Circular White Base */}
        <circle cx="60" cy="60" r="58" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2.5" />
        <circle cx="60" cy="60" r="52" fill="none" stroke="#0F172A" strokeWidth="1" />
        
        {/* Arching Circular Text */}
        <path id="ums-circle-arc" d="M 22,60 A 38,38 0 1,1 98,60" fill="none" />
        <text fontSize="8.5" fontWeight="900" fill="#0F172A" letterSpacing="1.2" fontFamily="Arial, Helvetica, sans-serif">
          <textPath href="#ums-circle-arc" startOffset="50%" textAnchor="middle">
            UNIVERSITI MALAYSIA
          </textPath>
        </text>
        <text x="60" y="104" textAnchor="middle" fontSize="9" fontWeight="900" fill="#0F172A" letterSpacing="1.5" fontFamily="Arial, Helvetica, sans-serif">
          SABAH
        </text>

        {/* Shield Border */}
        <path
          d="M38 32H82V68C82 82 60 92 60 92C60 92 38 82 38 68V32Z"
          fill="#1E3A8A"
          stroke="#0F172A"
          strokeWidth="2"
        />

        {/* Red Upper Section */}
        <path d="M38 32H82V50H38V32Z" fill="#DC2626" />

        {/* Open White & Yellow Book */}
        <path
          d="M48 38C53 36 57 37 60 39C63 37 67 36 72 38V46C67 44 63 45 60 47C57 45 53 44 48 46V38Z"
          fill="#FFFFFF"
          stroke="#0F172A"
          strokeWidth="1"
        />

        {/* Gold Chevron */}
        <path
          d="M38 60L60 72L82 60V66C82 80 60 90 60 90C60 90 38 80 38 66V60Z"
          fill="#F59E0B"
        />

        {/* Red Central Flower Icon */}
        <circle cx="60" cy="74" r="5" fill="#DC2626" stroke="#0F172A" strokeWidth="1" />
      </svg>

      {/* Official UMS Typography */}
      <div className="flex flex-col justify-center leading-none select-none">
        <span className={`text-[17px] font-serif font-black tracking-tight ${isDark ? 'text-slate-900' : 'text-white'}`}>
          UMS
        </span>
        <span className={`text-[7.5px] font-sans font-extrabold uppercase tracking-tight mt-0.5 ${isDark ? 'text-slate-700' : 'text-slate-200'}`}>
          UNIVERSITI MALAYSIA SABAH
        </span>
      </div>
    </div>
  );
}

/**
 * Official KKTF Logo (Kolej Kediaman Tun Fuad)
 * Protocol: Constituent College (Placed second, side-by-side with UMS)
 */
export function KKTFLogo({ className = "h-9" }) {
  return (
    <div className={`flex items-center gap-2 bg-white/95 rounded-xl px-2 py-1 shadow-sm border border-white/40 ${className}`}>
      <svg
        viewBox="0 0 220 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full aspect-square shrink-0"
      >
        {/* Green House Outline */}
        {/* Chimney on left */}
        <rect x="54" y="24" width="18" height="36" fill="#84CC16" rx="2" />
        
        {/* Roof structure */}
        <path
          d="M28 82L108 20L188 82L176 96L108 42L40 96L28 82Z"
          fill="#84CC16"
        />
        {/* Left & Bottom wall */}
        <path
          d="M38 90H54V172H182V188H38V90Z"
          fill="#84CC16"
        />
        {/* Right wall & Door gap */}
        <path
          d="M166 90H182V178H166V90Z"
          fill="#84CC16"
        />

        {/* Brown Intersecting Geometric Bands */}
        <path
          d="M12 136L112 196L126 182L44 132L78 72L62 62L12 136Z"
          fill="#8A5A2B"
        />
        <path
          d="M116 54L194 22L204 38L132 70L116 54Z"
          fill="#8A5A2B"
        />

        {/* Central Official Typography inside house */}
        <text
          x="110"
          y="90"
          textAnchor="middle"
          fill="#1E293B"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="18"
          fontWeight="400"
          letterSpacing="2.5"
        >
          KOLEJ
        </text>
        <text
          x="110"
          y="112"
          textAnchor="middle"
          fill="#1E293B"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="18"
          fontWeight="400"
          letterSpacing="2.5"
        >
          KEDIAMAN
        </text>
        <text
          x="110"
          y="142"
          textAnchor="middle"
          fill="#0F172A"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="25"
          fontWeight="900"
          letterSpacing="2"
        >
          TUN FUAD
        </text>
        <text
          x="110"
          y="158"
          textAnchor="middle"
          fill="#64748B"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="9.5"
          fontWeight="700"
          letterSpacing="1"
        >
          UNIVERSITI MALAYSIA SABAH
        </text>
      </svg>
    </div>
  );
}

/**
 * Protocol Combined Institutional Header:
 * 1st: UMS (Universiti Malaysia Sabah - Induk)
 * 2nd: KKTF (Kolej Kediaman Tun Fuad - Bergandingan)
 */
export function InstitutionalDualLogo({ className = "" }) {
  return (
    <div className={`flex items-center gap-2.5 sm:gap-3.5 ${className}`}>
      {/* 1. UMS Official Logo (First / Protokol Utama) */}
      <UMSLogo className="h-10" variant="light" />

      {/* Elegant Vertical Divider */}
      <div className="h-8 w-[1.5px] bg-gradient-to-b from-transparent via-white/30 to-transparent shrink-0" />

      {/* 2. KKTF Logo (Second / Bergandingan) */}
      <KKTFLogo className="h-10" />
    </div>
  );
}

export default { UMSLogo, KKTFLogo, InstitutionalDualLogo };
