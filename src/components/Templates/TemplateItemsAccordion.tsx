import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AccordionItem {
  id: string
  title: string
  dotColor?: string
  metadata?: { label: string; value: string | number }[]
  content?: React.ReactNode
}

interface TemplateItemsAccordionProps {
  items: AccordionItem[]
  defaultExpanded?: string[]
  className?: string
}

export function TemplateItemsAccordion({
  items,
  defaultExpanded,
  className,
}: TemplateItemsAccordionProps) {
  const [expandedItems, setExpandedItems] = React.useState<string[]>(defaultExpanded || [])

  const toggleItem = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  if (items.length === 0) {
    return (
      <div className="border rounded-lg bg-slate-50 p-8 text-center text-slate-500">
        No items to display
      </div>
    )
  }

  return (
    <div className={cn('border rounded-lg overflow-hidden bg-white', className)}>
      {items.map((item, index) => {
        const isExpanded = expandedItems.includes(item.id)

        return (
          <div
            key={item.id}
            className={cn(
              'border-b last:border-b-0',
              isExpanded && 'bg-slate-50/50'
            )}
          >
            {/* Header */}
            <button
              onClick={() => toggleItem(item.id)}
              className="w-full flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
            >
              {/* Chevron */}
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-slate-400 transition-transform duration-200',
                  isExpanded && 'rotate-180'
                )}
              />

              {/* Colored Dot */}
              <div
                className={cn(
                  'w-3 h-3 rounded-full flex-shrink-0',
                  item.dotColor || 'bg-slate-400'
                )}
                style={{ backgroundColor: item.dotColor }}
              />

              {/* Title */}
              <span className="flex-1 font-medium text-slate-900">{item.title}</span>

              {/* Metadata */}
              {item.metadata?.map((meta, metaIndex) => (
                <span
                  key={metaIndex}
                  className="text-sm text-slate-500 hidden sm:inline-block"
                >
                  {meta.value}
                </span>
              ))}
            </button>

            {/* Content */}
            {isExpanded && item.content && (
              <div className="px-4 pb-4 pt-2">
                <div className="pl-11">{item.content}</div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default TemplateItemsAccordion
