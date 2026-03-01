import React from "react";
import { Link } from "react-router-dom";
import type { ProjectScheduleStatus } from "@/types/projectScheduleStatus";
import { ProjectScheduleStatusBadge } from "@/components/Projects/ProjectScheduleStatusBadge";

interface ActiveProjectCardProps {
  projectId: string;
  projectName: string;
  client: string;
  progress: number;
  budgetUsed: number;
  manager: string;
  status: ProjectScheduleStatus;
  imageUrl: string | null;
  imageFocusPoint: { x: number; y: number } | null;
}

export const ActiveProjectCard = ({
  projectId,
  projectName,
  client,
  progress: _progress,
  budgetUsed: _budgetUsed,
  manager: _manager,
  status,
  imageUrl,
  imageFocusPoint,
}: ActiveProjectCardProps) => {
  const fallbackImage = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80";

  return (
    <Link to={`/projects/${projectId}`} className="block h-full">
      <div
        className="relative overflow-hidden cursor-pointer group hover:shadow-xl transition-all duration-300"
        style={{
          borderTopLeftRadius: '1.5rem',
          borderTopRightRadius: '0.375rem',
          borderBottomLeftRadius: '0.375rem',
          borderBottomRightRadius: '1.5rem',
          height: '220px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        }}
      >
        {/* Full-bleed background image */}
        <img
          src={imageUrl || fallbackImage}
          alt={projectName}
          className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
          style={{
            objectPosition: imageFocusPoint
              ? `${imageFocusPoint.x}% ${imageFocusPoint.y}%`
              : 'center',
          }}
          loading="lazy"
          onError={(e) => { e.currentTarget.src = fallbackImage; }}
        />

        {/* Dark gradient overlay — strong at bottom, transparent at top */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.35) 45%, transparent 100%)',
          }}
        />

        {/* Status badge — top right */}
        <div className="absolute top-3 right-3 z-10">
          <ProjectScheduleStatusBadge
            status={status}
            showTimezoneBadge={false}
            statusBadgeClassName="px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider"
            timezoneBadgeClassName="bg-white/95 text-slate-900 border-white/70 px-1.5 py-0 h-5"
          />
        </div>

        {/* Text overlaid at the bottom of the image */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          <h4 className="font-bold text-white text-lg leading-tight truncate drop-shadow-sm">
            {projectName}
          </h4>
          <p className="text-white/75 text-sm mt-0.5 truncate">{client}</p>
        </div>
      </div>
    </Link>
  );
};
