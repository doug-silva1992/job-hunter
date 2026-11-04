import Autocomplete from '@mui/material/Autocomplete'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'

type Props = {
  id: string
  value: string[]
  onChange: (value: string[]) => void
  suggestions?: string[]
  placeholder?: string
  max?: number
  chipColor?: 'default' | 'primary' | 'error'
}

/** Remove espaços e duplicados (sem diferenciar maiúsculas), como o backend. */
function clean(values: string[]) {
  const seen = new Set<string>()
  return values
    .map((v) => v.trim().slice(0, 60))
    .filter((v) => {
      const key = v.toLowerCase()
      if (!v || seen.has(key)) return false
      seen.add(key)
      return true
    })
}

/** Campo de etiquetas: digite e pressione Enter (ou escolha uma sugestão). */
export function TagInput({ id, value, onChange, suggestions = [], placeholder, max = 30, chipColor = 'default' }: Props) {
  const full = value.length >= max
  return (
    <Autocomplete
      id={id}
      multiple
      freeSolo
      autoSelect
      filterSelectedOptions
      options={suggestions}
      value={value}
      onChange={(_, next) => onChange(clean(next as string[]).slice(0, max))}
      renderValue={(items, getItemProps) =>
        items.map((option, index) => {
          const { key, ...itemProps } = getItemProps({ index })
          return <Chip key={key} label={option} size="small" color={chipColor} variant="outlined" {...itemProps} />
        })
      }
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          placeholder={full ? undefined : placeholder}
          helperText={full ? `Limite de ${max} itens.` : 'Pressione Enter para adicionar.'}
        />
      )}
    />
  )
}
