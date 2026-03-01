import { useNavigate } from 'react-router-dom';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LayoutGrid,
  List,
  Calendar,
  Users,
  Clock,
  FileText,
  Palette,
  BookOpen
} from 'lucide-react';

export type ViewMode = 'board' | 'list' | 'calendar' | 'team' | 'schedule' | 'forms' | 'moodboard' | 'dailyLogs';

interface TabNavigationProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

const TAB_CONFIG = [
  { id: 'board' as ViewMode, icon: LayoutGrid, labelKey: 'architect.tasks.viewModes.board' },
  { id: 'list' as ViewMode, icon: List, labelKey: 'architect.tasks.viewModes.list' },
  { id: 'calendar' as ViewMode, icon: Calendar, labelKey: 'architect.tasks.viewModes.calendar' },
  { id: 'team' as ViewMode, icon: Users, labelKey: 'architect.tasks.viewModes.team' },
  { id: 'schedule' as ViewMode, icon: Clock, labelKey: 'architect.tasks.viewModes.schedule' },
  { id: 'forms' as ViewMode, icon: FileText, labelKey: 'architect.tasks.viewModes.forms' },
  { id: 'moodboard' as ViewMode, icon: Palette, labelKey: 'architect.tasks.viewModes.moodboard' },
  { id: 'dailyLogs' as ViewMode, icon: BookOpen, labelKey: 'architect.tasks.viewModes.dailyLogs' },
  { id: 'timeTracking' as ViewMode, icon: Clock, labelKey: 'architect.timeTracking.tab' },
];



export const TabNavigation = ({ activeView, onViewChange }: TabNavigationProps) => {
  const { t } = useLocalization();
  const navigate = useNavigate();

  return (
    <Tabs 
      value={activeView} 
      onValueChange={(value) => {
        if (value === 'timeTracking') {
          navigate('/architect/time-tracking');
        } else {
          onViewChange(value as ViewMode);
        }
      }} 
      variant="pill" 
      className="w-full"
    >
      <TabsList className="w-full justify-start flex flex-wrap">
        {TAB_CONFIG.map((tab) => {
          const Icon = tab.icon;
          return (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex items-center gap-2 px-4"
            >
              <Icon className="h-4 w-4" />
              <span>{t(tab.labelKey)}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
};
