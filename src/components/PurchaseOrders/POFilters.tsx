// Story 3.5: PO Filters Component
// Provides filtering controls for purchase orders

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X } from 'lucide-react'
import { useLocalization } from '@/contexts/LocalizationContext'
import type { POStatus } from './POStatusBadge'

export interface POFiltersState {
  status: POStatus | 'all'
  project_id: string | 'all'
  search: string
}

interface Project {
  id: string
  name: string
}

interface POFiltersProps {
  filters: POFiltersState
  onFiltersChange: (filters: POFiltersState) => void
  projects: Project[]
}

export const POFilters: React.FC<POFiltersProps> = ({
  filters,
  onFiltersChange,
  projects,
}) => {
  const { t } = useLocalization()
  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.project_id !== 'all' ||
    filters.search !== ''

  const clearFilters = () => {
    onFiltersChange({
      status: 'all',
      project_id: 'all',
      search: '',
    })
  }

  return (
    <div className="flex flex-wrap gap-4 mb-6">
      <Select
        value={filters.status}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, status: value as POStatus | 'all' })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={t('procurement.filters.allStatuses')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('procurement.filters.allStatuses')}</SelectItem>
          <SelectItem value="draft">{t('procurement.status.draft')}</SelectItem>
          <SelectItem value="sent">{t('procurement.status.sent')}</SelectItem>
          <SelectItem value="acknowledged">{t('procurement.status.acknowledged')}</SelectItem>
          <SelectItem value="in_transit">{t('procurement.status.in_transit')}</SelectItem>
          <SelectItem value="delivered">{t('procurement.status.delivered')}</SelectItem>
          <SelectItem value="cancelled">{t('procurement.status.cancelled')}</SelectItem>
          <SelectItem value="disputed">{t('procurement.status.failed')}</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.project_id}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, project_id: value })
        }
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={t('procurement.filters.allProjects')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('procurement.filters.allProjects')}</SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="search"
        placeholder={t('procurement.filters.searchPlaceholder')}
        value={filters.search}
        onChange={(e) =>
          onFiltersChange({ ...filters, search: e.target.value })
        }
        className="w-[300px]"
      />

      {hasActiveFilters && (
        <Button variant="outline" onClick={clearFilters}>
          <X className="mr-2 h-4 w-4" />
          {t('procurement.filters.clearFilters')}
        </Button>
      )}
    </div>
  )
}
