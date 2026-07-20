import React from 'react';

const base = (size) => ({
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
});

export const TrendingUpIcon = ({ size = 24, ...props }) => (
    <svg {...base(size)} {...props}>
        <polyline points="3 17 9 11 13 15 21 7" />
        <polyline points="14 7 21 7 21 14" />
    </svg>
);

export const TrendingDownIcon = ({ size = 24, ...props }) => (
    <svg {...base(size)} {...props}>
        <polyline points="3 7 9 13 13 9 21 17" />
        <polyline points="14 17 21 17 21 10" />
    </svg>
);

export const RefreshIcon = ({ size = 24, ...props }) => (
    <svg {...base(size)} {...props}>
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
);

export const DownloadIcon = ({ size = 24, ...props }) => (
    <svg {...base(size)} {...props}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);

export const CalendarTodayIcon = ({ size = 24, ...props }) => (
    <svg {...base(size)} {...props}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

export const AccessTimeIcon = ({ size = 24, ...props }) => (
    <svg {...base(size)} {...props}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

export const SpeedIcon = ({ size = 24, ...props }) => (
    <svg {...base(size)} {...props}>
        <path d="M12 2a10 10 0 1 0 10 10" />
        <path d="M12 12 L18 6" />
        <path d="M12 12 A10 10 0 0 1 22 12" strokeDasharray="2 3" />
    </svg>
);

export const BarChartIcon = ({ size = 24, ...props }) => (
    <svg {...base(size)} {...props}>
        <line x1="12" y1="20" x2="12" y2="10" />
        <line x1="18" y1="20" x2="18" y2="4" />
        <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
);

export const PieChartIcon = ({ size = 24, ...props }) => (
    <svg {...base(size)} {...props}>
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
        <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
);

export const ErrorOutlineIcon = ({ size = 24, ...props }) => (
    <svg {...base(size)} {...props}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="13" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);

export const InfoIcon = ({ size = 24, ...props }) => (
    <svg {...base(size)} {...props}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
);

export const CheckCircleIcon = ({ size = 24, ...props }) => (
    <svg {...base(size)} {...props}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="9 12 12 15 16 9" />
    </svg>
);

export const CancelIcon = ({ size = 24, ...props }) => (
    <svg {...base(size)} {...props}>
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
);

export const AssignmentIcon = ({ size = 24, ...props }) => (
    <svg {...base(size)} {...props}>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M9 3v2a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V3" />
        <line x1="8" y1="11" x2="16" y2="11" />
        <line x1="8" y1="15" x2="13" y2="15" />
    </svg>
);

export const DescriptionIcon = ({ size = 24, ...props }) => (
    <svg {...base(size)} {...props}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
);

export const GavelIcon = ({ size = 24, ...props }) => (
    <svg {...base(size)} {...props}>
        <path d="m14 13-7.5 7.5" />
        <path d="M13 19l6-6" />
        <path d="m2 22 3-3" />
        <path d="M18 3l3 3-9 9-3-3z" />
    </svg>
);

export default {
    TrendingUpIcon,
    TrendingDownIcon,
    RefreshIcon,
    DownloadIcon,
    CalendarTodayIcon,
    AccessTimeIcon,
    SpeedIcon,
    BarChartIcon,
    PieChartIcon,
    ErrorOutlineIcon,
    InfoIcon,
    CheckCircleIcon,
    CancelIcon,
    AssignmentIcon,
    DescriptionIcon,
    GavelIcon
};