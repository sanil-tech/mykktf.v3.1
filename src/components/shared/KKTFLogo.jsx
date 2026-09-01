import React from 'react';

/**
 * Exact Official UMS Logo (Universiti Malaysia Sabah)
 * Using the exact authentic logo image provided by UMS.
 */
export function UMSLogo({ className = "h-10" }) {
  return (
    <div className={`flex items-center bg-white/95 rounded-xl px-2.5 py-1 shadow-sm border border-white/60 shrink-0 ${className}`}>
      <img
        src="/logos/ums-logo.png"
        alt="Universiti Malaysia Sabah Logo"
        className="h-full w-auto object-contain max-h-10"
      />
    </div>
  );
}

/**
 * Exact Official KKTF Logo (Kolej Kediaman Tun Fuad)
 * Using the exact authentic logo image provided.
 */
export function KKTFLogo({ className = "h-10" }) {
  return (
    <div className={`flex items-center bg-white/95 rounded-xl px-2.5 py-1 shadow-sm border border-white/60 shrink-0 ${className}`}>
      <img
        src="/logos/kktf-logo.jpg"
        alt="Kolej Kediaman Tun Fuad Logo"
        className="h-full w-auto object-contain max-h-10"
      />
    </div>
  );
}

/**
 * Protocol Institutional Header:
 * 1st: Official UMS Logo (University Parent Body - Left)
 * 2nd: Official KKTF Logo (Hostel College - Right / Bergandingan)
 */
export function InstitutionalDualLogo({ className = "" }) {
  return (
    <div className={`flex items-center gap-2 sm:gap-3 ${className}`}>
      {/* 1. Official UMS Logo (Leading First) */}
      <div className="bg-white rounded-xl px-2.5 py-1 shadow-md border border-white/80 flex items-center justify-center h-11">
        <img
          src="/logos/ums-logo.png"
          alt="Universiti Malaysia Sabah (UMS)"
          className="h-8 sm:h-9 w-auto object-contain"
        />
      </div>

      {/* Subtle Protocol Separator */}
      <div className="h-7 w-[1.5px] bg-white/20 shrink-0 hidden xs:block" />

      {/* 2. Official KKTF Logo (Bergandingan) */}
      <div className="bg-white rounded-xl px-2 py-1 shadow-md border border-white/80 flex items-center justify-center h-11">
        <img
          src="/logos/kktf-logo.jpg"
          alt="Kolej Kediaman Tun Fuad (KKTF)"
          className="h-8 sm:h-9 w-auto object-contain"
        />
      </div>
    </div>
  );
}

export default { UMSLogo, KKTFLogo, InstitutionalDualLogo };
