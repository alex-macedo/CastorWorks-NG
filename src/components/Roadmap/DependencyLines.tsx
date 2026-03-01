import { useEffect, useState, useCallback } from 'react';
import type { RoadmapItem } from '@/hooks/useRoadmapItems';

interface DependencyLinesProps {
  items: RoadmapItem[];
}

interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Line {
  fromId: string;
  toId: string;
  fromPos: Position;
  toPos: Position;
  isComplete: boolean;
}

export function DependencyLines({ items }: DependencyLinesProps) {
  const [lines, setLines] = useState<Line[]>([]);

  const calculateLines = useCallback(() => {
    const newLines: Line[] = [];
    
    items.forEach((item) => {
      if (!item.dependencies) return;
      
      const deps = typeof item.dependencies === 'string' 
        ? JSON.parse(item.dependencies) 
        : item.dependencies;
      
      if (!Array.isArray(deps) || deps.length === 0) return;

      deps.forEach((depId: string) => {
        const fromElement = document.querySelector(`[data-item-id="${depId}"]`);
        const toElement = document.querySelector(`[data-item-id="${item.id}"]`);
        
        if (!fromElement || !toElement) return;

        const fromRect = fromElement.getBoundingClientRect();
        const toRect = toElement.getBoundingClientRect();
        const container = document.querySelector('[data-kanban-container]');
        const containerRect = container?.getBoundingClientRect();
        
        if (!containerRect) return;

        const depItem = items.find(i => i.id === depId);
        const isComplete = depItem?.status === 'done';

        newLines.push({
          fromId: depId,
          toId: item.id,
          fromPos: {
            x: fromRect.left - containerRect.left + fromRect.width,
            y: fromRect.top - containerRect.top + fromRect.height / 2,
            width: fromRect.width,
            height: fromRect.height,
          },
          toPos: {
            x: toRect.left - containerRect.left,
            y: toRect.top - containerRect.top + toRect.height / 2,
            width: toRect.width,
            height: toRect.height,
          },
          isComplete,
        });
      });
    });

    setLines(newLines);
  }, [items]);

  useEffect(() => {
    calculateLines();

    const handleResize = () => calculateLines();
    const handleScroll = () => calculateLines();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    const observer = new MutationObserver(calculateLines);
    const container = document.querySelector('[data-kanban-container]');
    if (container) {
      observer.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
      });
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      observer.disconnect();
    };
  }, [calculateLines]);

  const createPath = (line: Line) => {
    const { fromPos, toPos } = line;
    
    // Control point for curved line
    const controlPointOffset = Math.abs(toPos.x - fromPos.x) * 0.5;
    
    return `M ${fromPos.x} ${fromPos.y} 
            C ${fromPos.x + controlPointOffset} ${fromPos.y},
              ${toPos.x - controlPointOffset} ${toPos.y},
              ${toPos.x} ${toPos.y}`;
  };

  const createArrowPath = (line: Line) => {
    const { toPos } = line;
    const arrowSize = 6;
    
    // Arrow pointing right
    return `M ${toPos.x - arrowSize} ${toPos.y - arrowSize}
            L ${toPos.x} ${toPos.y}
            L ${toPos.x - arrowSize} ${toPos.y + arrowSize}`;
  };

  if (lines.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    >
      <defs>
        <marker
          id="arrowhead-complete"
          markerWidth="10"
          markerHeight="10"
          refX="5"
          refY="5"
          orient="auto"
        >
          <path
            d="M 0 0 L 10 5 L 0 10 z"
            className="fill-primary/40"
          />
        </marker>
        <marker
          id="arrowhead-incomplete"
          markerWidth="10"
          markerHeight="10"
          refX="5"
          refY="5"
          orient="auto"
        >
          <path
            d="M 0 0 L 10 5 L 0 10 z"
            className="fill-warning/60"
          />
        </marker>
      </defs>
      
      {lines.map((line, index) => (
        <g key={`${line.fromId}-${line.toId}-${index}`}>
          <path
            d={createPath(line)}
            fill="none"
            stroke={line.isComplete ? 'hsl(var(--primary) / 0.4)' : 'hsl(var(--warning) / 0.6)'}
            strokeWidth="2"
            strokeDasharray={line.isComplete ? '0' : '5,5'}
            markerEnd={line.isComplete ? 'url(#arrowhead-complete)' : 'url(#arrowhead-incomplete)'}
          />
        </g>
      ))}
    </svg>
  );
}
