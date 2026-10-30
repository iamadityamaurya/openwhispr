/**
 * OpenWhispr design system — "MausBot Clean Tech & Emerald"
 *
 * Matching the exact landing page design: deep obsidian background,
 * crisp white/zinc typography, subtle borders, and the signature MausBot
 * emerald green accent (#009957 / #3fae6e) with tech color accents.
 */
export const Theme = {
  colors: {
    // MausBot Deep Obsidian Base (from website dark mode)
    bg: '#08080A',
    bgSecondary: '#0E0E12',
    card: '#121217',
    cardGlass: 'rgba(18, 18, 23, 0.94)',
    cardElevated: '#17171E',
    surface: '#1A1A22',
    surfaceActive: '#22222D',
    surfaceGlass: 'rgba(255, 255, 255, 0.03)',

    // Crisp high-end borders
    border: 'rgba(255, 255, 255, 0.08)',
    borderSubtle: 'rgba(255, 255, 255, 0.04)',
    borderHighlight: 'rgba(255, 255, 255, 0.16)',
    borderActive: '#2FA866',

    // Balanced Accent & Support Colors
    cyan: '#2FA866', // Calibrated natural emerald
    cyanBright: '#3EBD77',
    cyanMuted: 'rgba(47, 168, 102, 0.08)',
    cyanSubtle: 'rgba(255, 255, 255, 0.04)',
    blue: '#4f94f8',
    indigo: '#6366f1',
    indigoMuted: 'rgba(99, 102, 241, 0.10)',
    purple: '#966fe0',
    purpleBright: '#ad8cf0',
    purpleMuted: 'rgba(150, 111, 224, 0.10)',
    pink: '#e4669f',
    red: '#ef4444',
    redGlow: '#dc2626',
    redMuted: 'rgba(239, 68, 68, 0.10)',
    green: '#2FA866',
    greenBright: '#3EBD77',
    greenMuted: 'rgba(47, 168, 102, 0.08)',
    amber: '#F59E0B', // Restored true golden-amber for warnings/keys
    amberMuted: 'rgba(245, 158, 11, 0.10)',

    // Text hierarchy (Crisp White/Zinc)
    textPrimary: '#F4F4F6',
    textSecondary: '#A1A1AA',
    textMuted: '#71717A',
    textInverse: '#08080A',
  },

  gradients: {
    hero: ['#2FA866', '#22824E'],
    cyanBlue: ['#2FA866', '#4f94f8'],
    purplePink: ['#966fe0', '#e4669f'],
    recording: ['#ef4444', '#b91c1c'],
    processing: ['#2FA866', '#4f94f8'],
    cardDark: ['#141419', '#0E0E12'],
    cardHighlight: ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.01)'],
    glassOverlay: ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.01)'],
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
      shadowColor: '#2FA866',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.16,
      shadowRadius: 12,
      elevation: 4,
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
