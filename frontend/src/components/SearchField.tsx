import SearchRounded from '@mui/icons-material/SearchRounded'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import type { SxProps, Theme } from '@mui/material/styles'

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder: string
  label: string
  sx?: SxProps<Theme>
}

/** Campo de busca arredondado usado na tela Vagas e no Pipeline. */
export function SearchField({ value, onChange, placeholder, label, sx }: Props) {
  return (
    <TextField
      size="small"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      sx={[
        { width: '100%', maxWidth: 520, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', borderRadius: 999 } },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      slotProps={{
        htmlInput: { 'aria-label': label, type: 'search' },
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchRounded fontSize="small" />
            </InputAdornment>
          ),
        },
      }}
    />
  )
}
