import { useState } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Image as ImageIcon, Type, X, Move } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Types
export type MoodboardItemType = 'image' | 'text' | 'color';

export interface MoodboardItem {
  id: string;
  type: MoodboardItemType;
  content: string; // URL for image, text content for text/color
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

interface MoodboardProps {
  projectId: string;
}

const SortableItem = ({ item, onRemove }: { item: MoodboardItem; onRemove: (id: string) => void }) => {
  const { t } = useLocalization();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="group relative bg-card border rounded-lg shadow-sm p-4 min-h-[150px] flex flex-col items-center justify-center hover:shadow-md transition-all cursor-move touch-none">
      <Button 
        variant="destructive" 
        size="icon" 
        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(item.id);
        }}
      >
        <X className="h-3 w-3" />
      </Button>
      
      {item.type === 'image' && (
        <img src={item.content} alt={t("images.moodboardItem")} className="w-full h-full object-cover rounded" />
      )}
      
      {item.type === 'text' && (
        <p className="text-center text-sm font-medium">{item.content}</p>
      )}
      
      {item.type === 'color' && (
        <div className="w-full h-full rounded flex items-center justify-center" style={{ backgroundColor: item.content }}>
          <span className="bg-white/80 px-2 py-1 rounded text-xs font-mono">{item.content}</span>
        </div>
      )}
    </div>
  );
};

export const Moodboard = ({ projectId }: MoodboardProps) => {
  const { t } = useLocalization();
  // Mock state for now - ideally this comes from Supabase
  const [items, setItems] = useState<MoodboardItem[]>([
    { id: '1', type: 'text', content: 'Living Room Inspiration' },
    { id: '2', type: 'color', content: '#F5F5DC' }, // Beige
    { id: '3', type: 'color', content: '#8B4513' }, // SaddleBrown
  ]);
  
  const [newItemContent, setNewItemContent] = useState('');
  const [activeType, setActiveType] = useState<MoodboardItemType>('image');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleAddItem = () => {
    if (!newItemContent) return;
    
    const newItem: MoodboardItem = {
      id: Math.random().toString(36).substring(7),
      type: activeType,
      content: newItemContent,
    };
    
    setItems([...items, newItem]);
    setNewItemContent('');
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Move className="h-5 w-5" />
              {t('architect.moodboard.title')}
            </CardTitle>
            <div className="flex items-center gap-2">
               {/* Toolbar */}
               <div className="flex border rounded-md overflow-hidden">
                  <Button 
                    variant={activeType === 'image' ? 'default' : 'ghost'} 
                    size="sm" 
                    onClick={() => setActiveType('image')}
                    className="rounded-none"
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    {t('architect.moodboard.image')}
                  </Button>
                  <Button 
                    variant={activeType === 'text' ? 'default' : 'ghost'} 
                    size="sm" 
                    onClick={() => setActiveType('text')}
                    className="rounded-none"
                  >
                    <Type className="h-4 w-4 mr-2" />
                    {t('architect.moodboard.text')}
                  </Button>
                  <Button 
                    variant={activeType === 'color' ? 'default' : 'ghost'} 
                    size="sm" 
                    onClick={() => setActiveType('color')}
                    className="rounded-none"
                  >
                    <div className="h-4 w-4 bg-gradient-to-br from-red-500 to-blue-500 rounded-full mr-2" />
                    {t('architect.moodboard.color')}
                  </Button>
                </div>
                
                <Input 
                  placeholder={activeType === 'image' ? t('architect.moodboard.imageUrlPlaceholder') : activeType === 'color' ? t('architect.moodboard.hexCodePlaceholder') : t('architect.moodboard.notePlaceholder')} 
                  value={newItemContent}
                  onChange={(e) => setNewItemContent(e.target.value)}
                  className="w-[200px]"
                />
                
                <Button onClick={handleAddItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('architect.moodboard.add')}
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter} 
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={items.map(i => i.id)} 
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 min-h-[400px] bg-muted/30 p-4 rounded-xl border-2 border-dashed">
                {items.map((item) => (
                  <SortableItem key={item.id} item={item} onRemove={handleRemoveItem} />
                ))}
                
                {items.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center text-muted-foreground h-full min-h-[300px]">
                    <ImageIcon className="h-12 w-12 mb-2 opacity-20" />
                    <p>{t("ui.emptyMoodboard")}</p>
                    <p className="text-sm">{t("architect.addImagesColors")}</p>
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>
    </div>
  );
};

