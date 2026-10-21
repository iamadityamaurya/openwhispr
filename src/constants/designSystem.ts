/**
 * OpenWhispr design system — "Ink & Ember"
 *
 * A calm, warm dark theme: soft charcoal surfaces, cream text,
 * and one ember-apricot accent. No neon glows, no blue-dark surfaces.
 *
 * 60% warm charcoal base · 30% cream text & dark elements · 10% ember accent
 */
export const Theme = {
  colors: {
    // 60% Neutral base (warm charcoal, never blue-dark)
    bg: '#151210',
    bgSecondary: '#1B1714',
    card: '#211C18',
    cardGlass: 'rgba(33, 28, 24, 0.94)',
    cardElevated: '#282219',
    surface: '#262019',
    surfaceActive: '#302920',
    surfaceGlass: 'rgba(255, 246, 230, 0.03)',

    // 30% Neutral accents & borders (warm cream-tinted)
    border: 'rgba(255, 244, 226, 0.08)',
    borderSubtle: 'rgba(255, 244, 226, 0.04)',
    borderHighlight: 'rgba(233, 160, 99, 0.35)',
    borderActive: '#E9A063',

    // 10% Brand & accents (ember family + muted support colors)
    cyan: '#E9A063', // primary ember accent (legacy key name)
    cyanBright: '#F2C08A',
    cyanMuted: 'rgba(233, 160, 99, 0.12)',
    cyanSubtle: 'rgba(233, 160, 99, 0.05)',
    blue: '#D08448',
    indigo: '#C89268',
    indigoMuted: 'rgba(200, 146, 104, 0.12)',
    purple: '#D6A97C',
    purpleBright: '#E5C094',
    purpleMuted: 'rgba(214, 169, 124, 0.12)',
    pink: '#E08D76',
    red: '#E5484D',
    redGlow: '#C93A3E',
    redMuted: 'rgba(229, 72, 77, 0.12)',
    green: '#93B884',
    greenBright: '#A9CBA0',
    greenMuted: 'rgba(147, 184, 132, 0.12)',
    amber: '#D9A441',
    amberMuted: 'rgba(217, 164, 65, 0.12)',

    // Text hierarchy (cream on warm charcoal)
    textPrimary: '#F7F1E6',
    textSecondary: '#B3A897',
    textMuted: '#857B6C',
    textInverse: '#151210',
  },

  gradients: {
    hero: ['#E9A063', '#C97B45'],
    cyanBlue: ['#E9A063', '#D08448'],
    purplePink: ['#E5C094', '#E08D76'],
    recording: ['#E5484D', '#B33A3E'],
    processing: ['#E5C094', '#D9A441'],
    cardDark: ['#241F1A', '#1B1714'],
    cardHighlight: ['rgba(255, 246, 230, 0.05)', 'rgba(255, 246, 230, 0.01)'],
    glassOverlay: ['rgba(255, 246, 230, 0.05)', 'rgba(255, 246, 230, 0.01)'],
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
      shadowColor: '#0A0806',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 5,
    },
    recordingGlow: {
      shadowColor: '#E5484D',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 8,
    },
    idleGlow: {
      shadowColor: '#E9A063',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 14,
      elevation: 5,
    },
    subtle: {
      shadowColor: '#0A0806',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 3,
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
