import { alpha, createTheme } from '@mui/material/styles'

const blue = '#0A66C2'

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: blue, light: '#378FE9', dark: '#004182', contrastText: '#fff' },
    secondary: { main: '#5E6C84' },
    success: { main: '#057642' },
    warning: { main: '#B26A00' },
    background: { default: '#F4F6F9', paper: '#FFFFFF' },
    text: { primary: '#1D2226', secondary: '#5E6C84' },
    divider: '#E4E7EC',
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Inter", system-ui, "Segoe UI", Roboto, sans-serif',
    h5: { fontWeight: 700, letterSpacing: '-0.02em' },
    h6: { fontWeight: 600, letterSpacing: '-0.01em' },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: { root: { borderColor: '#E4E7EC' } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 999 } },
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 500 } } },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&.Mui-selected': {
            backgroundColor: alpha(blue, 0.08),
            color: blue,
            '& .MuiListItemIcon-root': { color: blue },
          },
          '&.Mui-selected:hover': { backgroundColor: alpha(blue, 0.12) },
        },
      },
    },
  },
})
