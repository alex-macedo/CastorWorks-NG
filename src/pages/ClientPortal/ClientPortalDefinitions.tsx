import { useClientPortalPageTitle } from '@/hooks/clientPortal/useClientPortalPageTitle'
import { ClientDefinitionsCard } from '@/components/ClientPortal/Definitions/ClientDefinitionsCard'
import { useClientPortalAuth } from '@/hooks/clientPortal/useClientPortalAuth'

export default function ClientPortalDefinitions() {
  useClientPortalPageTitle({ page: 'definitions' })
  const { projectId } = useClientPortalAuth()

  return (
    <ClientDefinitionsCard
      projectId={projectId ?? undefined}
      readOnly
    />
  )
}
