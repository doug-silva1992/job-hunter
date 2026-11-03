import Avatar from '@mui/material/Avatar'

const colors = ['#0A66C2', '#5E6C84', '#057642', '#7A3EB1', '#B26A00', '#C9372C', '#00796B']

export function CompanyAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const hash = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const color = colors[hash % colors.length]

  return (
    <Avatar
      variant="rounded"
      sx={{
        width: size,
        height: size,
        bgcolor: `${color}14`,
        color,
        fontWeight: 700,
        fontSize: size * 0.4,
      }}
    >
      {name.charAt(0)}
    </Avatar>
  )
}
