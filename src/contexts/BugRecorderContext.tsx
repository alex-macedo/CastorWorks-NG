import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { BugRecorderDialog } from '@/components/Roadmap/BugRecorderDialog'

type BugRecorderContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
}

const BugRecorderContext = createContext<BugRecorderContextValue | null>(null)

export function BugRecorderProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const value: BugRecorderContextValue = {
    open,
    setOpen: useCallback((next: boolean) => setOpen(next), []),
  }
  return (
    <BugRecorderContext.Provider value={value}>
      {children}
      <BugRecorderDialog open={open} onOpenChange={setOpen} />
    </BugRecorderContext.Provider>
  )
}

export function useBugRecorder(): BugRecorderContextValue {
  const ctx = useContext(BugRecorderContext)
  if (!ctx) {
    return {
      open: false,
      setOpen: () => {},
    }
  }
  return ctx
}
