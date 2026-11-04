import type { UsePaginationItem } from '@mui/material/usePagination'

const LABELS: Record<UsePaginationItem['type'], string> = {
  page: 'Página',
  first: 'Primeira página',
  last: 'Última página',
  next: 'Próxima página',
  previous: 'Página anterior',
  'start-ellipsis': 'Páginas anteriores',
  'end-ellipsis': 'Próximas páginas',
}

/** Rótulos em português para o `getItemAriaLabel` do Pagination do MUI. */
export function paginationLabel(type: UsePaginationItem['type'], page: number | null): string {
  return type === 'page' ? `Página ${page}` : LABELS[type]
}
