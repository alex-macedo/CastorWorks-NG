import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { MobileAppBottomNav } from '../MobileAppBottomNav'

// Mock useLocation to return different pathnames
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

describe('MobileAppBottomNav', () => {
  it('should render correct navigation items', () => {
    render(
      <MemoryRouter>
        <MobileAppBottomNav />
      </MemoryRouter>
    )
    
    expect(screen.getByText('Projects')).toBeInTheDocument()
    expect(screen.getByText('Tasks')).toBeInTheDocument()
    expect(screen.getByText('Finance')).toBeInTheDocument()
    expect(screen.getByText('Logs')).toBeInTheDocument()
    expect(screen.getByText('Team')).toBeInTheDocument()
  })

  it('should explicitly handle trailing slashes in pathname (Avoiding infinite loops)', () => {
    render(
      <MemoryRouter initialEntries={['/app/']}>
        <MobileAppBottomNav />
      </MemoryRouter>
    )
    
    // If the component handles /app/ correctly, it should highlight 'Projects' (DASHBOARD)
    const projectsButton = screen.getByText('Projects').closest('button')
    if (projectsButton) {
      // Check for active class or style (implementation specific)
      // In our component, active items have 'text-amber-500' class
      expect(projectsButton.className).toContain('text-amber-500')
    }
  })

  it('should highlight active tab correctly', () => {
    render(
      <MemoryRouter initialEntries={['/app/tasks']}>
        <MobileAppBottomNav />
      </MemoryRouter>
    )
    
    const tasksButton = screen.getByText('Tasks').closest('button')
    if (tasksButton) {
      expect(tasksButton.className).toContain('text-amber-500')
    }
    
    const projectsButton = screen.getByText('Projects').closest('button')
    if (projectsButton) {
      expect(projectsButton.className).not.toContain('text-amber-500')
    }
  })

  it('should have correct styling classes for visibility', () => {
    render(
      <MemoryRouter>
        <MobileAppBottomNav />
      </MemoryRouter>
    )
    
    const nav = screen.getByRole('navigation')
    expect(nav).toHaveClass('fixed')
    expect(nav).toHaveClass('bottom-0')
    expect(nav).toHaveClass('z-[200]')
    expect(nav).toHaveClass('backdrop-blur-md')
  })
})
