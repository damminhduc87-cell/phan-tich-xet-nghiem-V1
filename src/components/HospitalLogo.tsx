import React from "react";

interface HospitalLogoProps {
  className?: string;
  showText?: boolean;
}

export const HospitalLogo: React.FC<HospitalLogoProps> = ({ className = "h-10 w-10", showText = false }) => {
  return (
    <div className={`flex items-center gap-3 ${showText ? "" : "inline-block"}`} id="hospital_logo_container">
      {/* SVG Emblem of Bệnh viện Y học Cổ truyền Lạng Sơn */}
      <svg
        viewBox="0 0 200 200"
        className={`${className} shrink-0 select-none`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        id="hospital_emblem_svg"
      >
        {/* Background base circle */}
        <circle cx="100" cy="100" r="92" fill="#ffffff" stroke="#1e3a8a" strokeWidth="2" />

        {/* Yin-Yang S-Curve division background */}
        <path
          d="M 100,12 C 55,55 145,145 100,188 A 88,88 0 0,1 100,12 Z"
          fill="#f1f5f9"
        />

        {/* Yin-Yang division line */}
        <path
          d="M 100,12 C 55,55 145,145 100,188"
          stroke="#cbd5e1"
          strokeWidth="1.5"
          fill="none"
        />

        {/* 8-Petal Anise Flower (Hoa Hồi Lạng Sơn) in upper right */}
        <g transform="translate(132, 68)" id="anise_flower_group">
          {/* 8 Petals */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <g key={angle} transform={`rotate(${angle})`}>
              {/* Main petal body */}
              <path
                d="M 0,0 C -5,-11 -10,-17 0,-30 C 10,-17 5,-11 0,0"
                fill="#be123c"
                stroke="#4c0519"
                strokeWidth="0.8"
              />
              {/* Petal center line / crease */}
              <line x1="0" y1="0" x2="0" y2="-28" stroke="#f43f5e" strokeWidth="1" />
            </g>
          ))}
          {/* Flower central disc */}
          <circle cx="0" cy="0" r="4" fill="#881337" stroke="#4c0519" strokeWidth="0.5" />
          <circle cx="0" cy="0" r="1.5" fill="#fca5a5" />
        </g>

        {/* Green Mountains at the bottom (Vùng núi Lạng Sơn) */}
        <g id="mountain_group">
          {/* Far mountain */}
          <path
            d="M 35,148 L 75,115 L 110,145 L 145,105 L 180,152 Z"
            fill="#15803d"
          />
          {/* Mountain highlights / peaks */}
          <path
            d="M 75,115 L 60,132 L 75,128 L 90,136 Z"
            fill="#22c55e"
            opacity="0.75"
          />
          <path
            d="M 145,105 L 130,122 L 145,118 L 158,126 Z"
            fill="#22c55e"
            opacity="0.75"
          />
          {/* Front mountain overlay for depth */}
          <path
            d="M 55,152 L 92,122 L 122,148 L 165,115 L 175,148 Z"
            fill="#166534"
          />
          {/* Base shadow lines */}
          <path
            d="M 35,148 Q 100,172 180,152"
            stroke="#14532d"
            strokeWidth="1.5"
            fill="none"
          />
        </g>

        {/* Elegant Crescent on the Left (Crescent Border) */}
        <path
          d="M 100,10 A 90,90 0 0,0 20,120 A 90,90 0 0,0 100,190 A 76,76 0 0,1 42,120 A 76,76 0 0,1 100,10 Z"
          fill="#0f2b93"
          id="blue_crescent_path"
        />

        {/* Text along the crescent path */}
        <path
          id="crescent_text_track"
          d="M 98,181 A 81,81 0 0,1 29,118 A 81,81 0 0,1 98,19"
          fill="none"
          stroke="transparent"
        />
        <text fill="#ffffff" fontSize="9" fontWeight="800" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="0.8">
          <textPath href="#crescent_text_track" startOffset="4%">
            LANG SON TRADITIONAL MEDICINE HOSPITAL
          </textPath>
        </text>

        {/* "Since 1982" Text at the bottom */}
        <text
          x="100"
          y="173"
          fill="#0f2b93"
          fontSize="9"
          fontWeight="bold"
          fontFamily="system-ui, -apple-system, sans-serif"
          textAnchor="middle"
          letterSpacing="0.2"
          id="since_1982_text"
        >
          Since 1982
        </text>
      </svg>

      {showText && (
        <div className="flex flex-col" id="hospital_text_brand">
          <span className="text-xs font-black uppercase text-blue-900 dark:text-blue-100 font-title tracking-tight leading-tight">
            Bệnh Viện Y Học Cổ Truyền
          </span>
          <span className="text-sm font-black uppercase text-blue-700 dark:text-blue-400 font-title tracking-wide leading-none">
            Lạng Sơn
          </span>
        </div>
      )}
    </div>
  );
};
