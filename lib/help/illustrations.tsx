// SVG Illustrations for Setup Wizard and Feature Showcase
// Simple, clean illustrations using app colors (blue, violet, emerald, amber)

export function WelcomeIllustration({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Sparkle background */}
      <circle cx="100" cy="80" r="60" fill="url(#welcome-grad)" opacity="0.15" />
      <circle cx="100" cy="80" r="40" fill="url(#welcome-grad)" opacity="0.1" />
      {/* Clipboard */}
      <rect x="70" y="40" width="60" height="80" rx="8" fill="white" stroke="#3B82F6" strokeWidth="2" />
      <rect x="88" y="34" width="24" height="12" rx="4" fill="#3B82F6" />
      <circle cx="100" cy="40" r="3" fill="white" />
      {/* Check lines */}
      <rect x="82" y="60" width="36" height="4" rx="2" fill="#93C5FD" />
      <rect x="82" y="72" width="28" height="4" rx="2" fill="#93C5FD" />
      <rect x="82" y="84" width="32" height="4" rx="2" fill="#BFDBFE" />
      <rect x="82" y="96" width="24" height="4" rx="2" fill="#BFDBFE" />
      {/* Sparkles */}
      <path d="M50 50l3 8 3-8 8-3-8-3-3-8-3 8-8 3 8 3z" fill="#8B5CF6" opacity="0.6" />
      <path d="M150 100l2 5 2-5 5-2-5-2-2-5-2 5-5 2 5 2z" fill="#3B82F6" opacity="0.5" />
      <path d="M155 55l2 4 2-4 4-2-4-2-2-4-2 4-4 2 4 2z" fill="#10B981" opacity="0.5" />
      <defs>
        <linearGradient id="welcome-grad" x1="40" y1="20" x2="160" y2="140">
          <stop stopColor="#3B82F6" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function VideoCallIllustration({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background */}
      <circle cx="100" cy="80" r="55" fill="#EDE9FE" opacity="0.5" />
      {/* Monitor */}
      <rect x="45" y="35" width="90" height="65" rx="8" fill="white" stroke="#8B5CF6" strokeWidth="2" />
      {/* Screen content - video grid */}
      <rect x="55" y="45" width="30" height="22" rx="4" fill="#C4B5FD" />
      <rect x="91" y="45" width="30" height="22" rx="4" fill="#A78BFA" />
      {/* Person silhouettes */}
      <circle cx="70" cy="52" r="5" fill="#7C3AED" opacity="0.5" />
      <circle cx="106" cy="52" r="5" fill="#7C3AED" opacity="0.7" />
      {/* Video controls */}
      <circle cx="75" cy="82" r="6" fill="#EF4444" opacity="0.8" />
      <circle cx="92" cy="82" r="6" fill="#22C55E" opacity="0.8" />
      <circle cx="109" cy="82" r="6" fill="#3B82F6" opacity="0.8" />
      {/* Stand */}
      <rect x="92" y="100" width="16" height="6" rx="1" fill="#DDD6FE" />
      <rect x="82" y="106" width="36" height="4" rx="2" fill="#C4B5FD" />
      {/* Signal waves */}
      <path d="M148 50c5-5 5-15 0-20" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <path d="M155 45c8-8 8-25 0-30" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" opacity="0.25" />
    </svg>
  )
}

export function LinkModeIllustration({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="80" r="55" fill="#ECFDF5" opacity="0.5" />
      {/* Chain link */}
      <path d="M80 70a15 15 0 010 20h-10a15 15 0 010-30h10" stroke="#10B981" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M120 70a15 15 0 000 20h10a15 15 0 000-30h-10" stroke="#10B981" strokeWidth="3" fill="none" strokeLinecap="round" />
      <line x1="90" y1="80" x2="110" y2="80" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
      {/* Small cards */}
      <rect x="55" y="110" width="35" height="20" rx="4" fill="white" stroke="#6EE7B7" strokeWidth="1.5" />
      <rect x="110" y="110" width="35" height="20" rx="4" fill="white" stroke="#6EE7B7" strokeWidth="1.5" />
      <rect x="60" y="116" width="18" height="3" rx="1.5" fill="#A7F3D0" />
      <rect x="60" y="122" width="12" height="3" rx="1.5" fill="#D1FAE5" />
      <rect x="115" y="116" width="18" height="3" rx="1.5" fill="#A7F3D0" />
      <rect x="115" y="122" width="12" height="3" rx="1.5" fill="#D1FAE5" />
    </svg>
  )
}

export function GoogleConnectIllustration({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="80" r="55" fill="#DBEAFE" opacity="0.4" />
      {/* Google "G" simplified */}
      <circle cx="100" cy="75" r="25" fill="white" stroke="#E5E7EB" strokeWidth="2" />
      <path d="M112 75h-14v0a14 14 0 1011 14.5" stroke="#4285F4" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M112 75h-14" stroke="#EA4335" strokeWidth="4" strokeLinecap="round" />
      {/* Arrows connect */}
      <path d="M60 75h-15m0 0l5-5m-5 5l5 5" stroke="#34A853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M140 75h15m0 0l-5-5m5 5l-5 5" stroke="#FBBC05" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Status */}
      <rect x="70" y="115" width="60" height="20" rx="10" fill="#DCFCE7" />
      <circle cx="85" cy="125" r="4" fill="#22C55E" />
      <rect x="93" y="123" width="28" height="4" rx="2" fill="#86EFAC" />
    </svg>
  )
}

export function ScheduleIllustration({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="80" r="55" fill="#FEF3C7" opacity="0.4" />
      {/* Clock */}
      <circle cx="100" cy="75" r="30" fill="white" stroke="#F59E0B" strokeWidth="2" />
      <circle cx="100" cy="75" r="2.5" fill="#F59E0B" />
      {/* Clock hands */}
      <line x1="100" y1="75" x2="100" y2="55" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="100" y1="75" x2="115" y2="70" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
      {/* Hour marks */}
      <line x1="100" y1="48" x2="100" y2="51" stroke="#FCD34D" strokeWidth="1.5" />
      <line x1="100" y1="99" x2="100" y2="102" stroke="#FCD34D" strokeWidth="1.5" />
      <line x1="73" y1="75" x2="76" y2="75" stroke="#FCD34D" strokeWidth="1.5" />
      <line x1="124" y1="75" x2="127" y2="75" stroke="#FCD34D" strokeWidth="1.5" />
      {/* Time range labels */}
      <rect x="55" y="118" width="35" height="18" rx="9" fill="#FEF3C7" />
      <text x="72.5" y="130" textAnchor="middle" fill="#D97706" fontSize="9" fontWeight="600">08:00</text>
      <rect x="110" y="118" width="35" height="18" rx="9" fill="#FEF3C7" />
      <text x="127.5" y="130" textAnchor="middle" fill="#D97706" fontSize="9" fontWeight="600">18:00</text>
      <line x1="92" y1="127" x2="108" y2="127" stroke="#FCD34D" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3" />
    </svg>
  )
}

export function ReadyIllustration({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="80" r="60" fill="url(#ready-grad)" opacity="0.12" />
      {/* Big checkmark circle */}
      <circle cx="100" cy="75" r="35" fill="white" stroke="#22C55E" strokeWidth="3" />
      <path d="M82 75l12 12 24-24" stroke="#22C55E" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {/* Celebration elements */}
      <circle cx="55" cy="45" r="4" fill="#F59E0B" opacity="0.6" />
      <circle cx="150" cy="50" r="3" fill="#8B5CF6" opacity="0.5" />
      <circle cx="145" cy="110" r="5" fill="#3B82F6" opacity="0.4" />
      <circle cx="60" cy="115" r="3" fill="#10B981" opacity="0.5" />
      <rect x="48" y="70" width="6" height="6" rx="1" fill="#F59E0B" opacity="0.4" transform="rotate(45 51 73)" />
      <rect x="148" y="80" width="5" height="5" rx="1" fill="#3B82F6" opacity="0.3" transform="rotate(30 150 82)" />
      {/* Text placeholder */}
      <rect x="65" y="122" width="70" height="8" rx="4" fill="#DCFCE7" />
      <defs>
        <linearGradient id="ready-grad" x1="40" y1="20" x2="160" y2="140">
          <stop stopColor="#22C55E" />
          <stop offset="1" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// Feature Showcase illustrations

export function RecordingIllustration({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="120" cy="90" r="70" fill="#DBEAFE" opacity="0.3" />
      {/* Microphone */}
      <rect x="108" y="40" width="24" height="44" rx="12" fill="white" stroke="#3B82F6" strokeWidth="2" />
      <path d="M96 72v8a24 24 0 0048 0v-8" stroke="#3B82F6" strokeWidth="2" fill="none" strokeLinecap="round" />
      <line x1="120" y1="104" x2="120" y2="116" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
      <line x1="108" y1="116" x2="132" y2="116" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
      {/* Sound waves */}
      <path d="M80 65c-4 8-4 22 0 30" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <path d="M72 58c-6 13-6 34 0 44" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      <path d="M160 65c4 8 4 22 0 30" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <path d="M168 58c6 13 6 34 0 44" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      {/* Waveform at bottom */}
      <rect x="60" y="132" width="120" height="24" rx="6" fill="white" stroke="#BFDBFE" strokeWidth="1.5" />
      <rect x="70" y="140" width="3" height="8" rx="1.5" fill="#3B82F6" opacity="0.4" />
      <rect x="76" y="137" width="3" height="14" rx="1.5" fill="#3B82F6" opacity="0.6" />
      <rect x="82" y="139" width="3" height="10" rx="1.5" fill="#3B82F6" opacity="0.5" />
      <rect x="88" y="135" width="3" height="18" rx="1.5" fill="#3B82F6" opacity="0.8" />
      <rect x="94" y="138" width="3" height="12" rx="1.5" fill="#3B82F6" opacity="0.6" />
      <rect x="100" y="136" width="3" height="16" rx="1.5" fill="#3B82F6" opacity="0.7" />
      <rect x="106" y="140" width="3" height="8" rx="1.5" fill="#3B82F6" opacity="0.4" />
      <rect x="112" y="137" width="3" height="14" rx="1.5" fill="#3B82F6" opacity="0.6" />
      <rect x="118" y="134" width="3" height="20" rx="1.5" fill="#3B82F6" opacity="0.9" />
      <rect x="124" y="138" width="3" height="12" rx="1.5" fill="#3B82F6" opacity="0.5" />
      <rect x="130" y="140" width="3" height="8" rx="1.5" fill="#3B82F6" opacity="0.4" />
      <rect x="136" y="136" width="3" height="16" rx="1.5" fill="#3B82F6" opacity="0.7" />
      <rect x="142" y="139" width="3" height="10" rx="1.5" fill="#3B82F6" opacity="0.5" />
      <rect x="148" y="137" width="3" height="14" rx="1.5" fill="#3B82F6" opacity="0.6" />
      <rect x="154" y="141" width="3" height="6" rx="1.5" fill="#3B82F6" opacity="0.3" />
      <rect x="160" y="139" width="3" height="10" rx="1.5" fill="#3B82F6" opacity="0.5" />
      <rect x="166" y="140" width="3" height="8" rx="1.5" fill="#3B82F6" opacity="0.4" />
    </svg>
  )
}

export function AIProntuarioIllustration({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="120" cy="90" r="70" fill="#EDE9FE" opacity="0.3" />
      {/* Document */}
      <rect x="75" y="25" width="90" height="115" rx="8" fill="white" stroke="#8B5CF6" strokeWidth="2" />
      {/* Header section */}
      <rect x="88" y="38" width="50" height="6" rx="3" fill="#C4B5FD" />
      <rect x="88" y="50" width="64" height="4" rx="2" fill="#E9D5FF" opacity="0.6" />
      {/* Divider */}
      <line x1="88" y1="62" x2="152" y2="62" stroke="#F3E8FF" strokeWidth="1" />
      {/* Content lines */}
      <rect x="88" y="70" width="60" height="4" rx="2" fill="#DDD6FE" />
      <rect x="88" y="80" width="48" height="4" rx="2" fill="#EDE9FE" />
      <rect x="88" y="90" width="56" height="4" rx="2" fill="#DDD6FE" />
      <rect x="88" y="100" width="40" height="4" rx="2" fill="#EDE9FE" />
      <rect x="88" y="110" width="52" height="4" rx="2" fill="#DDD6FE" />
      <rect x="88" y="120" width="36" height="4" rx="2" fill="#EDE9FE" />
      {/* AI brain sparkle */}
      <circle cx="170" cy="42" r="18" fill="#F5F3FF" stroke="#A78BFA" strokeWidth="1.5" />
      <path d="M163 42l3 7 3-7 7-3-7-3-3-7-3 7-7 3 7 3z" fill="#8B5CF6" opacity="0.7" />
      {/* Arrow from brain to doc */}
      <path d="M155 52l-8 8" stroke="#A78BFA" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3" />
    </svg>
  )
}

export function AIAdjustIllustration({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="120" cy="90" r="70" fill="#ECFDF5" opacity="0.3" />
      {/* Document with edits */}
      <rect x="65" y="30" width="80" height="100" rx="8" fill="white" stroke="#10B981" strokeWidth="2" />
      <rect x="78" y="45" width="54" height="4" rx="2" fill="#A7F3D0" />
      <rect x="78" y="55" width="40" height="4" rx="2" fill="#D1FAE5" />
      {/* Strikethrough (error) */}
      <rect x="78" y="68" width="48" height="4" rx="2" fill="#FCA5A5" opacity="0.5" />
      <line x1="76" y1="70" x2="128" y2="70" stroke="#EF4444" strokeWidth="1" opacity="0.6" />
      {/* Corrected text */}
      <rect x="78" y="78" width="52" height="4" rx="2" fill="#6EE7B7" />
      <rect x="78" y="90" width="44" height="4" rx="2" fill="#A7F3D0" />
      <rect x="78" y="100" width="38" height="4" rx="2" fill="#D1FAE5" />
      <rect x="78" y="110" width="50" height="4" rx="2" fill="#A7F3D0" />
      {/* Magic wand */}
      <g transform="translate(160, 55) rotate(-30)">
        <rect x="-3" y="-20" width="6" height="40" rx="3" fill="#F59E0B" />
        <rect x="-5" y="-20" width="10" height="10" rx="2" fill="#FBBF24" />
        <path d="M0-28l2 5 2-5 5-2-5-2-2-5-2 5-5 2 5 2z" fill="#10B981" opacity="0.8" />
      </g>
      {/* Sparkles */}
      <path d="M170 100l2 4 2-4 4-2-4-2-2-4-2 4-4 2 4 2z" fill="#10B981" opacity="0.5" />
    </svg>
  )
}

export function SmartCalendarIllustration({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="120" cy="90" r="70" fill="#FEF3C7" opacity="0.3" />
      {/* Calendar */}
      <rect x="60" y="35" width="120" height="100" rx="8" fill="white" stroke="#F59E0B" strokeWidth="2" />
      {/* Calendar header */}
      <rect x="60" y="35" width="120" height="25" rx="8" fill="#FEF3C7" />
      <rect x="60" y="52" width="120" height="8" fill="#FEF3C7" />
      {/* Binding rings */}
      <rect x="85" y="30" width="4" height="14" rx="2" fill="#F59E0B" />
      <rect x="110" y="30" width="4" height="14" rx="2" fill="#F59E0B" />
      <rect x="135" y="30" width="4" height="14" rx="2" fill="#F59E0B" />
      {/* Month text */}
      <rect x="80" y="41" width="40" height="5" rx="2.5" fill="#FCD34D" />
      {/* Day headers */}
      <rect x="68" y="64" width="10" height="3" rx="1.5" fill="#FDE68A" />
      <rect x="85" y="64" width="10" height="3" rx="1.5" fill="#FDE68A" />
      <rect x="102" y="64" width="10" height="3" rx="1.5" fill="#FDE68A" />
      <rect x="119" y="64" width="10" height="3" rx="1.5" fill="#FDE68A" />
      <rect x="136" y="64" width="10" height="3" rx="1.5" fill="#FDE68A" />
      <rect x="153" y="64" width="10" height="3" rx="1.5" fill="#FDE68A" />
      {/* Day cells */}
      <rect x="68" y="74" width="10" height="10" rx="3" fill="#F3F4F6" />
      <rect x="85" y="74" width="10" height="10" rx="3" fill="#F3F4F6" />
      <rect x="102" y="74" width="10" height="10" rx="3" fill="#DBEAFE" />
      <rect x="119" y="74" width="10" height="10" rx="3" fill="#F3F4F6" />
      <rect x="136" y="74" width="10" height="10" rx="3" fill="#DCFCE7" />
      <rect x="153" y="74" width="10" height="10" rx="3" fill="#F3F4F6" />
      <rect x="68" y="90" width="10" height="10" rx="3" fill="#F3F4F6" />
      <rect x="85" y="90" width="10" height="10" rx="3" fill="#DBEAFE" />
      <rect x="102" y="90" width="10" height="10" rx="3" fill="#F3F4F6" />
      <rect x="119" y="90" width="10" height="10" rx="3" fill="#DCFCE7" />
      <rect x="136" y="90" width="10" height="10" rx="3" fill="#F3F4F6" />
      <rect x="153" y="90" width="10" height="10" rx="3" fill="#FEF3C7" />
      <rect x="68" y="106" width="10" height="10" rx="3" fill="#DBEAFE" />
      <rect x="85" y="106" width="10" height="10" rx="3" fill="#F3F4F6" />
      <rect x="102" y="106" width="10" height="10" rx="3" fill="#F3F4F6" />
      <rect x="119" y="106" width="10" height="10" rx="3" fill="#DBEAFE" />
      <rect x="136" y="106" width="10" height="10" rx="3" fill="#F3F4F6" />
      <rect x="153" y="106" width="10" height="10" rx="3" fill="#DCFCE7" />
      {/* Google sync badge */}
      <circle cx="168" cy="45" r="12" fill="white" stroke="#34A853" strokeWidth="1.5" />
      <path d="M163 45l3 3 7-7" stroke="#34A853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
