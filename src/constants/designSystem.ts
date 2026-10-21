export const Theme = {
  colors: {
    // 60% Neutral base
    bg: '#080B11',
    bgSecondary: '#0D121D',
    card: '#0F1524',
    cardGlass: 'rgba(15, 21, 36, 0.85)',
    cardElevated: '#151D30',
    surface: '#151C2C',
    surfaceActive: '#1C263C',
    surfaceGlass: 'rgba(255, 255, 255, 0.03)',

    // 30% Neutral accents & borders
    border: 'rgba(255, 255, 255, 0.08)',
    borderSubtle: 'rgba(255, 255, 255, 0.04)',
    borderHighlight: 'rgba(0, 240, 255, 0.28)',
    borderActive: '#00F0FF',

    // 10% Brand & Accents
    cyan: '#00F0FF',
    cyanBright: '#38BDF8',
    cyanMuted: 'rgba(0, 240, 255, 0.12)',
    cyanSubtle: 'rgba(0, 240, 255, 0.05)',
    blue: '#2563EB',
    indigo: '#6366F1',
    indigoMuted: 'rgba(99, 102, 241, 0.12)',
    purple: '#A855F7',
    purpleBright: '#C084FC',
    purpleMuted: 'rgba(168, 85, 247, 0.12)',
    pink: '#EC4899',
    red: '#EF4444',
    redGlow: '#DC2626',
    redMuted: 'rgba(239, 68, 68, 0.12)',
    green: '#10B981',
    greenBright: '#34D399',
    greenMuted: 'rgba(16, 185, 129, 0.12)',
    amber: '#F59E0B',
    amberMuted: 'rgba(245, 158, 11, 0.12)',

    // Text hierarchy
    textPrimary: '#FFFFFF',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    textInverse: '#080B11',
  },

  gradients: {
    hero: ['#00F0FF', '#2563EB', '#7C3AED'],
    cyanBlue: ['#00F0FF', '#0066FF'],
    purplePink: ['#A855F7', '#EC4899'],
    recording: ['#EF4444', '#DC2626', '#991B1B'],
    processing: ['#8B5CF6', '#6366F1', '#3B82F6'],
    cardDark: ['#121828', '#0D121D'],
    cardHighlight: ['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.01)'],
    glassOverlay: ['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.01)'],
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    huge: 48,
  },

  radius: {
    sm: 8,
    md: 14,
    lg: 20,
    xl: 26,
    full: 9999,
  },

  shadows: {
    card: {
      shadowColor: '#00F0FF',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 18,
      elevation: 6,
    },
    recordingGlow: {
      shadowColor: '#EF4444',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 28,
      elevation: 12,
    },
    idleGlow: {
      shadowColor: '#00F0FF',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 8,
    },
    subtle: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 4,
    },
  },

  fonts: {
    heading: 'PlusJakartaSans_800ExtraBold',
    title: 'PlusJakartaSans_700Bold',
    semiBold: 'PlusJakartaSans_600SemiBold',
    medium: 'PlusJakartaSans_500Medium',
    regular: 'PlusJakartaSans_400Regular',
    mono: 'SpaceGrotesk_500Medium',
    monoBold: 'SpaceGrotesk_700Bold',
  },
};
