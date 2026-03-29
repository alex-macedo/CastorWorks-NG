import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppSidebar } from '@/components/Layout/AppSidebar'

vi.mock('@/constants/rolePermissions', () => {
  const Icon = () => <svg aria-hidden="true" />

  return {
    SIDEBAR_OPTIONS: [
      {
        id: 'templates',
        title: 'Templates',
        titleKey: 'navigation.templates',
        type: 'collapsible',
        icon: Icon,
        tabs: [
          {
            id: 'budget-templates',
            titleKey: 'navigation.budgetTemplates',
            path: '/budget-templates',
            icon: Icon,
          },
        ],
        required_module: 'templates',
        allowedRoles: ['admin'],
      },
    ],
  }
})

vi.mock('@/contexts/LocalizationContext', () => ({
  useLocalization: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'navigation.templates': 'Modelos',
        'navigation.budgetTemplates': 'Orçamento',
        'navigation.platform': 'Plataforma',
        'navigation.companyFallback': 'Empresa',
        'navigation.enterpriseLabel': 'Corporativo',
        'auth:signOutError': 'Erro ao sair',
      }

      return translations[key] ?? key
    },
  }),
}))

vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: () => ({
    data: { full_name: 'Teste' },
    isLoading: false,
  }),
}))

vi.mock('@/hooks/useUserRoles', () => ({
  useUserRoles: () => ({
    data: [{ role: 'admin' }],
    isLoading: false,
  }),
}))

vi.mock('@/hooks/useCompanySettings', () => ({
  useCompanySettings: () => ({
    settings: { company_name: 'CastorWorks NG' },
  }),
}))

vi.mock('@/hooks/useSidebarPermissions', () => ({
  useSidebarPermissions: () => ({
    optionPermissions: new Map(),
    tabPermissions: new Map(),
    optionSortOrder: new Map(),
    tabSortOrder: new Map(),
    hasOptionAccess: () => true,
    hasTabAccess: () => true,
    hasTabPermissions: () => false,
    optionHasAnyTabPermissions: () => false,
    isLoading: false,
  }),
}))

vi.mock('@/hooks/useLicensedModules', () => ({
  useLicensedModules: () => ({
    hasModule: (moduleId: string) => moduleId === 'templates',
    isLoading: false,
  }),
}))

vi.mock('@/hooks/useTaxProject', () => ({
  useTaxProject: () => ({
    taxProject: null,
  }),
}))

vi.mock('@/contexts/BugRecorderContext', () => ({
  useBugRecorder: () => ({
    setOpen: vi.fn(),
  }),
}))

vi.mock('@/components/Navigation/PrefetchLink', () => ({
  PrefetchLink: ({
    children,
    className,
    to,
  }: {
    children: React.ReactNode
    className?: string | ((args: { isActive: boolean }) => string)
    to: string
  }) => (
    <a href={to} className={typeof className === 'function' ? className({ isActive: false }) : className}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/ui/sidebar', () => {
  const passThrough = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>
  const asChildPassThrough = ({
    asChild,
    children,
    ...props
  }: {
    asChild?: boolean
    children?: React.ReactNode
  }) => {
    if (asChild) return <>{children}</>
    return <button {...props}>{children}</button>
  }

  return {
    Sidebar: passThrough,
    SidebarContent: passThrough,
    SidebarFooter: passThrough,
    SidebarGroup: passThrough,
    SidebarGroupContent: passThrough,
    SidebarGroupLabel: asChildPassThrough,
    SidebarHeader: passThrough,
    SidebarMenu: passThrough,
    SidebarMenuButton: asChildPassThrough,
    SidebarMenuItem: passThrough,
    SidebarRail: () => null,
    useSidebar: () => ({ state: 'expanded' }),
  }
})

vi.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CollapsibleContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CollapsibleTrigger: ({
    asChild,
    children,
    ...props
  }: {
    asChild?: boolean
    children?: React.ReactNode
  }) => {
    if (asChild) return <>{children}</>
    return <button {...props}>{children}</button>
  },
}))

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => null,
  DropdownMenuTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div />,
}))

vi.mock('@/components/ui/avatar-progressive', () => ({
  AvatarProgressive: () => <div />,
}))

vi.mock('@/components/Settings/EditProfileDialog', () => ({
  EditProfileDialog: () => null,
}))

vi.mock('@/components/ClientPortal/Dialogs/ProjectSelectionModal', () => ({
  ProjectSelectionModal: () => null,
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
}))

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signOut: vi.fn(),
    },
  },
}))

vi.mock('@/utils/storage', () => ({
  default: vi.fn(async () => 'https://example.com/logo.png'),
}))

vi.mock('@/lib/clientPortalAuth', () => ({
  getStoredClientPortalToken: () => null,
}))

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query')

  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
    }),
  }
})

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}))

describe('AppSidebar templates translation', () => {
  it('prefers the pt-BR translation key over a stale raw title for the Templates option', () => {
    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>
    )

    expect(screen.getByText('Modelos')).toBeInTheDocument()
    expect(screen.queryByText(/^Templates$/)).not.toBeInTheDocument()
  })
})
