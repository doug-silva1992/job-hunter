import TravelExploreOutlined from '@mui/icons-material/TravelExploreOutlined'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: 2,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <TravelExploreOutlined fontSize="small" />
      </Box>
      <Typography variant="h6" component="span">
        Job Hunter
      </Typography>
    </Box>
  )
}
