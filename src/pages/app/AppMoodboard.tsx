import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MobileTopNav } from '@/components/app/MobileTopNav'
import { MobileProjectSelector } from '@/components/app/MobileProjectSelector'
import { MobileAppSidebar } from '@/components/app/MobileAppSidebar'
import { cn } from '@/lib/utils'

interface Comment {
  id: string
  author: string
  avatar?: string
  role: string
  content: string
  timestamp: string
}

interface MoodItem {
  id: string
  title: string
  type: string
  aspect: string
  img: string
  liked: boolean
  commentCount: number
  comments: Comment[]
  approved?: boolean
}

const STYLE_PRESETS = [
  {
    id: 'realistic',
    label: 'Realistic',
    icon: 'camera',
    description: 'Photo-real textures & lighting',
    prompt: 'photorealistic architectural photography, high resolution, soft natural lighting, professional architectural digest style',
    suggestions: ['Golden hour lighting', 'Mid-century modern furniture', 'Floor-to-ceiling glass', 'Concrete textures'],
  },
  {
    id: 'render',
    label: '3D Render',
    icon: 'view_in_ar',
    description: 'Clean digital visualization',
    prompt: 'modern 3D architectural render, octane render, ray-tracing, Unreal Engine 5 style, clean professional digital visualization',
    suggestions: ['Isometric view', 'Wireframe overlay', 'Cyberpunk aesthetic', 'Minimalist white box'],
  },
  {
    id: 'sketch',
    label: 'Sketch',
    icon: 'edit',
    description: 'Hand-drawn concept art',
    prompt: 'architectural hand sketch, professional charcoal and pencil drawing, artistic, loose concept lines, high contrast',
    suggestions: ['Charcoal strokes', 'Watercolor wash', 'Rough concept lines', 'Perspective study'],
  },
  {
    id: 'blueprint',
    label: 'Blueprint',
    icon: 'architecture',
    description: 'Technical line work',
    prompt: 'technical architectural blueprint, white line technical drawing, engineering schematic on dark blueprint paper',
    suggestions: ['Cross-section view', 'Dimension callouts', 'Structural details', 'Site plan overlay'],
  },
]

const ASPECT_RATIOS: Array<{
  id: string
  label: string
  icon: string
  tailwind: string
  value: '1:1' | '3:4' | '4:3' | '9:16' | '16:9'
}> = [
  { id: '1:1', label: '1:1', icon: 'check_box_outline_blank', tailwind: 'aspect-square', value: '1:1' },
  { id: '16:9', label: '16:9', icon: 'crop_landscape', tailwind: 'aspect-video', value: '16:9' },
  { id: '3:4', label: '3:4', icon: 'crop_portrait', tailwind: 'aspect-[3/4]', value: '3:4' },
]

const MAX_PROMPT_CHARS = 500

const MOCK_ITEMS: MoodItem[] = [
  {
    id: '1',
    title: 'Smoked Oak',
    type: 'Material',
    aspect: 'aspect-[3/4]',
    img: '/images/moodboard/smoked-oak.jpg',
    liked: false,
    commentCount: 12,
    comments: [
      {
        id: 'c1',
        author: 'Sarah Johnson',
        role: 'Architect',
        content: 'Love the warm tones of this wood. Perfect for the main living area.',
        timestamp: '2 hours ago',
      },
      {
        id: 'c2',
        author: 'Maria Silva',
        role: 'Designer',
        content: 'This matches beautifully with the modern aesthetic we discussed.',
        timestamp: '1 hour ago',
      },
    ],
  },
  {
    id: '2',
    title: 'Brass Fixture',
    type: 'Hardware',
    aspect: 'aspect-square',
    img: '/images/moodboard/brass-fixture.jpg',
    liked: true,
    commentCount: 0,
    comments: [],
  },
  {
    id: '3',
    title: 'Matte Black',
    type: 'Lighting',
    aspect: 'aspect-video',
    img: '/images/moodboard/matte-black.jpg',
    liked: false,
    commentCount: 3,
    comments: [
      {
        id: 'c3',
        author: 'Alex Chen',
        role: 'Client',
        content: 'Very modern. Does this match the kitchen fixtures?',
        timestamp: '30 minutes ago',
      },
      {
        id: 'c4',
        author: 'David Rodriguez',
        role: 'Contractor',
        content: 'I can source these locally. Will save on shipping time.',
        timestamp: '25 minutes ago',
      },
      {
        id: 'c5',
        author: 'Sarah Johnson',
        role: 'Architect',
        content: 'Approved for the project. Let\'s move forward with this.',
        timestamp: '15 minutes ago',
      },
    ],
  },
  {
    id: '4',
    title: 'Carrara Marble',
    type: 'Stone',
    aspect: 'aspect-[4/5]',
    img: '/images/moodboard/carrara-marble.jpg',
    liked: true,
    commentCount: 2,
    comments: [
      {
        id: 'c6',
        author: 'Emma Taylor',
        role: 'Designer',
        content: 'Classic choice. The veining is elegant and subtle.',
        timestamp: '4 hours ago',
      },
      {
        id: 'c7',
        author: 'Maria Silva',
        role: 'Designer',
        content: 'Budget consideration: premium grade runs about $200/sqft installed.',
        timestamp: '3 hours ago',
      },
    ],
  },
  {
    id: '5',
    title: 'Concrete Flooring',
    type: 'Construction',
    aspect: 'aspect-square',
    img: '/images/moodboard/concrete-flooring.jpg',
    liked: false,
    commentCount: 0,
    comments: [],
  },
  {
    id: '6',
    title: 'Steel Beam Structure',
    type: 'Framework',
    aspect: 'aspect-[2/3]',
    img: '/images/moodboard/steel-structure.jpg',
    liked: false,
    commentCount: 1,
    comments: [
      {
        id: 'c8',
        author: 'David Rodriguez',
        role: 'Contractor',
        content: 'Industrial look is trending right now. Great choice for the open plan.',
        timestamp: '6 hours ago',
      },
    ],
  },
]

export default function AppMoodboard() {
  const { t } = useTranslation('app')
  const navigate = useNavigate()

  const [items, setItems] = useState<MoodItem[]>(MOCK_ITEMS)
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [showCommentDrawer, setShowCommentDrawer] = useState<string | null>(null)
  const [showDetailView, setShowDetailView] = useState<string | null>(null)
  const [showSidebar, setShowSidebar] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [prompt, setPrompt] = useState('')
  const [selectedStyle, setSelectedStyle] = useState(STYLE_PRESETS[0])
  const [selectedAspect, setSelectedAspect] = useState(ASPECT_RATIOS[0])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  const reviewStats = useMemo(() => {
    const total = items.length
    const interacted = items.filter((item) => item.liked || item.commentCount > 0).length
    return { total, interacted, percentage: Math.round((interacted / total) * 100) }
  }, [items])

  const activeItem = useMemo(() => items.find((i) => i.id === showCommentDrawer), [items, showCommentDrawer])

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    setError(null)
    try {
      // Placeholder for image generation - uses local construction/architecture images
      const constructionImages = [
        '/images/moodboard/smoked-oak.jpg',
        '/images/moodboard/brass-fixture.jpg',
        '/images/moodboard/matte-black.jpg',
        '/images/moodboard/carrara-marble.jpg',
        '/images/moodboard/concrete-flooring.jpg',
        '/images/moodboard/steel-structure.jpg',
        '/images/moodboard/luxury-construction.jpg',
        '/images/moodboard/interior-renovation.jpg',
      ]
      const randomImage = constructionImages[Math.floor(Math.random() * constructionImages.length)]
      
      const newItem: MoodItem = {
        id: Date.now().toString(),
        title: prompt.length > 20 ? prompt.substring(0, 17) + '...' : prompt,
        type: `AI ${selectedStyle.label}`,
        aspect: selectedAspect.tailwind,
        img: randomImage,
        liked: false,
        commentCount: 0,
        comments: [],
      }

      setItems((prev) => [newItem, ...prev])
      setShowAIPanel(false)
      setPrompt('')
    } catch (err) {
      setError('Failed to generate image. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleShare = async () => {
    const shareUrl = 'https://archipro.ai/share/moodboard-39281'

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Project Moodboard',
          text: 'Check out the visual direction for our new architectural project.',
          url: shareUrl,
        })
      } catch (err) {
        console.error('Error sharing:', err)
      }
    } else {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      })
    }
  }

  const toggleLike = (id: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, liked: !item.liked } : item)))
  }

  const handleAddComment = () => {
    if (!newComment.trim() || !showCommentDrawer) return

    setItems((prev) =>
      prev.map((item) =>
        item.id === showCommentDrawer ? { ...item, commentCount: item.commentCount + 1 } : item
      )
    )
    setNewComment('')
    setShowCommentDrawer(null)
  }

  const appendSuggestion = (suggestion: string) => {
    const currentPrompt = prompt.trim()
    const separator = currentPrompt ? ', ' : ''
    const newPrompt = `${currentPrompt}${separator}${suggestion}`
    if (newPrompt.length <= MAX_PROMPT_CHARS) {
      setPrompt(newPrompt)
    }
  }

  const progressBarWidth = `${reviewStats.percentage}%`

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div 
        className="bg-[#0B1114] text-white h-screen flex flex-col font-sans"
      >
        {/* Top Navigation */}
        <MobileTopNav onOpenSidebar={() => setShowSidebar(!showSidebar)} />

      {/* Project Selector */}
      <MobileProjectSelector />

      <main className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6 pb-6">
        <div className="flex items-center gap-2 bg-[#1C2A31] rounded-2xl px-4 py-3 border border-white/5 focus-within:ring-1 focus-within:ring-blue-500/30 transition-all">
          <span className="material-symbols-outlined text-slate-500 !text-xl">search</span>
          <input
            className="bg-transparent border-none focus:ring-0 text-sm w-full p-0 text-white placeholder:text-slate-600 font-medium"
            placeholder="Search material library..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3 auto-rows-max">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => setShowDetailView(item.id)}
              className="relative rounded-[22px] overflow-hidden border border-white/10 shadow-2xl group bg-[#161b1e] transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              {/* Image with interaction indicators overlay */}
              <div className="relative">
                <img src={item.img} className={`${item.aspect} w-full object-cover`} alt={item.title} />

                {/* Visual Type Badge */}
                <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded text-[8px] font-black text-white/80 border border-white/10 uppercase tracking-widest">
                  {item.type}
                </div>

                {/* Feedback status on image */}
                {(item.liked || item.commentCount > 0) && (
                  <div className="absolute top-3 right-3 flex gap-1.5 animate-in fade-in duration-300">
                    {item.liked && (
                      <div className="size-7 bg-red-500 rounded-full flex items-center justify-center shadow-lg ring-2 ring-black">
                        <span className="material-symbols-outlined !text-[14px] fill-1 text-white">favorite</span>
                      </div>
                    )}
                    {item.commentCount > 0 && (
                      <div className="size-7 bg-blue-500 rounded-full flex items-center justify-center shadow-lg ring-2 ring-black">
                        <span className="material-symbols-outlined !text-[14px] text-white">chat_bubble</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer with explicit actions */}
              <div className="p-3.5 space-y-3 bg-[#161b1e]">
                <div className="flex flex-col">
                  <h4 className="text-white text-[13px] font-bold truncate leading-tight">{item.title}</h4>
                </div>

                {/* Client Action Bar */}
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleLike(item.id)
                      }}
                      className={cn('flex items-center gap-1.5 transition-all', item.liked ? 'text-red-500' : 'text-slate-500 hover:text-slate-300')}
                    >
                      <span
                        className={cn('material-symbols-outlined !text-[20px] active:scale-150 transition-transform', item.liked ? 'fill-1' : '')}
                      >
                        favorite
                      </span>
                      {item.liked && <span className="text-[10px] font-black uppercase tracking-tighter">Loved</span>}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowCommentDrawer(item.id)
                      }}
                      className={cn('flex items-center gap-1.5 transition-all', item.commentCount > 0 ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300')}
                    >
                      <span className="material-symbols-outlined !text-[20px]">chat_bubble</span>
                      {item.commentCount > 0 && <span className="text-[10px] font-black uppercase tracking-tighter">{item.commentCount}</span>}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      title="View details"
                      onClick={() => setShowDetailView(item.id)}
                      className="size-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 hover:bg-blue-500/20 transition-colors"
                    >
                      <span className="material-symbols-outlined !text-[18px]">expand</span>
                    </button>

                    <button
                      title="Add comment"
                      onClick={() => setShowCommentDrawer(item.id)}
                      className="size-7 rounded-lg bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-colors"
                    >
                      <span className="material-symbols-outlined !text-[18px]">add</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Floating AI Action */}
      <button
        title="Generate with AI"
        onClick={() => setShowAIPanel(true)}
        className="fixed bottom-[calc(4rem+2vh)] right-[max(1rem,3vw)] z-40 size-16 rounded-full bg-amber-400 text-black shadow-2xl flex items-center justify-center active:scale-95 transition-all ring-4 ring-black"
      >
        <span className="material-symbols-outlined !text-[32px] font-black">auto_awesome</span>
      </button>

      {/* Feedback Drawer */}
      {showCommentDrawer && activeItem && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowCommentDrawer(null)} />
          <div className="relative w-full max-w-lg bg-[#161b1e] border border-white/10 rounded-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col gap-6">
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto -mt-2 mb-2" />

            <div className="flex items-start gap-4">
              <img src={activeItem.img} className="size-20 rounded-2xl object-cover border border-white/10 shadow-lg" alt="" />
              <div className="flex-1">
                <h3 className="text-xl font-bold">{activeItem.title}</h3>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">{activeItem.type}</p>
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center gap-1 text-red-500">
                    <span className={cn('material-symbols-outlined !text-[16px]', activeItem.liked ? 'fill-1' : '')}>
                      favorite
                    </span>
                    <span className="text-[10px] font-black uppercase">{activeItem.liked ? 'Liked' : 'No Likes'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-400">
                    <span className="material-symbols-outlined !text-[16px]">chat_bubble</span>
                    <span className="text-[10px] font-black uppercase">{activeItem.commentCount} Comments</span>
                  </div>
                </div>
              </div>
              <button
                title="Close"
                onClick={() => setShowCommentDrawer(null)}
                className="size-10 rounded-full bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined !text-[24px]">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2.5">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Share Feedback</label>
                  <span className="text-[10px] font-bold text-slate-600">Visible to Architect</span>
                </div>
                <textarea
                  className="w-full bg-[#0d1113] border border-white/10 rounded-2xl p-4 text-[15px] text-white placeholder:text-slate-700 focus:ring-1 focus:ring-blue-500 outline-none resize-none h-32 transition-all"
                  placeholder="Tell us what you like or what should be changed about this proposal..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => toggleLike(activeItem.id)}
                  className={cn(
                    'h-14 rounded-2xl border font-black text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-2.5 transition-all',
                    activeItem.liked ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                  )}
                >
                  <span className={cn('material-symbols-outlined !text-[22px]', activeItem.liked ? 'fill-1' : '')}>
                    favorite
                  </span>
                  {activeItem.liked ? 'Love Saved' : 'Love It'}
                </button>
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="h-14 bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black text-xs uppercase tracking-[0.15em] rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98]"
                >
                  Submit Review
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Panel */}
      {showAIPanel && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={() => !isGenerating && setShowAIPanel(false)} />
          <div className="relative w-full max-w-md bg-[#161b1e] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-white/5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="size-11 bg-amber-400/20 rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-amber-400 fill-1">auto_awesome</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">Concept Engine</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Vision Synthesis V2</p>
                </div>
              </div>
              <button
                title="Close AI panel"
                onClick={() => setShowAIPanel(false)}
                disabled={isGenerating}
                className="size-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10"
              >
                <span className="material-symbols-outlined !text-[24px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Architectural Vision</label>
                  <span className={cn('text-[10px] font-bold', prompt.length > MAX_PROMPT_CHARS * 0.8 ? 'text-amber-500' : 'text-slate-600')}>
                    {prompt.length}/{MAX_PROMPT_CHARS}
                  </span>
                </div>
                <div className="relative group">
                  <textarea
                    className="w-full bg-[#0d1113] border border-white/5 rounded-2xl p-5 text-[15px] text-white placeholder:text-slate-700 focus:ring-1 focus:ring-amber-400 outline-none resize-none h-32 transition-all"
                    placeholder="Describe textures, materials, and spatial vibes..."
                    value={prompt}
                    maxLength={MAX_PROMPT_CHARS}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={isGenerating}
                  />
                  {prompt && !isGenerating && (
                    <button
                      title="Clear prompt"
                      onClick={() => setPrompt('')}
                      className="absolute top-4 right-4 text-slate-600 hover:text-white transition-colors"
                    >
                      <span className="material-symbols-outlined !text-xl">backspace</span>
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1">AI Smart Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedStyle.suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => appendSuggestion(suggestion)}
                        disabled={isGenerating}
                        className="px-4 py-2 bg-white/5 hover:bg-amber-400/10 border border-white/10 hover:border-amber-400/30 rounded-full text-[11px] font-bold text-slate-400 hover:text-amber-400 transition-all"
                      >
                        + {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Style Reference</label>
                <div className="grid grid-cols-2 gap-3">
                  {STYLE_PRESETS.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setSelectedStyle(style)}
                      disabled={isGenerating}
                      className={cn(
                        'flex flex-col items-start p-4 rounded-2xl border transition-all text-left',
                        selectedStyle.id === style.id ? 'bg-amber-400/10 border-amber-400/50 shadow-lg' : 'bg-white/5 border-white/5 text-slate-400'
                      )}
                    >
                      <span
                        className={cn(
                          'material-symbols-outlined !text-[22px] mb-3',
                          selectedStyle.id === style.id ? 'text-amber-400 fill-1' : 'text-slate-600'
                        )}
                      >
                        {style.icon}
                      </span>
                      <span className={cn('text-[12px] font-black uppercase tracking-wider', selectedStyle.id === style.id ? 'text-amber-400' : 'text-slate-200')}>
                        {style.label}
                      </span>
                      <span className="text-[9px] font-medium text-slate-500 mt-1 line-clamp-1">{style.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Aspect Ratio</label>
                <div className="flex gap-3">
                  {ASPECT_RATIOS.map((ratio) => (
                    <button
                      key={ratio.id}
                      onClick={() => setSelectedAspect(ratio)}
                      disabled={isGenerating}
                      className={cn(
                        'flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border transition-all',
                        selectedAspect.id === ratio.id ? 'bg-blue-500/10 text-blue-400 border-blue-500/50' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'
                      )}
                    >
                      <span className="material-symbols-outlined !text-[24px]">{ratio.icon}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest">{ratio.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 bg-[#0d1113] border-t border-white/5 space-y-4 shrink-0">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3">
                  <span className="material-symbols-outlined text-red-500">error</span>
                  <p className="text-red-400 text-xs font-bold uppercase tracking-tight">{error}</p>
                </div>
              )}

              <button
                title="Generate proposal"
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full h-14 bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-black font-black uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-2xl shadow-amber-400/30"
              >
                {isGenerating ? (
                  <>
                    <div className="size-6 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    <span>Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined fill-1">auto_awesome</span>
                    <span>Generate Proposal</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Menu */}
      <MobileAppSidebar isOpen={showSidebar} onClose={() => setShowSidebar(false)} />

      {/* Detail View Modal */}
      {showDetailView && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowDetailView(null)} />
          <div className="relative w-full max-w-2xl bg-[#161b1e] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300 max-h-[90vh] flex flex-col">
            {/* Close Button */}
            <button
              onClick={() => setShowDetailView(null)}
              className="absolute top-4 right-4 z-20 size-10 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <span className="material-symbols-outlined !text-[24px]">close</span>
            </button>

            {/* Content */}
            <div className="overflow-y-auto flex-1 space-y-6 p-6">
              {/* Image */}
              <div className="flex justify-center">
                <img 
                  src={items.find(i => i.id === showDetailView)?.img} 
                  alt="" 
                  className="max-w-full max-h-96 rounded-2xl border border-white/10 shadow-2xl object-cover"
                />
              </div>

              {/* Header Info */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold">{items.find(i => i.id === showDetailView)?.title}</h2>
                  <p className="text-sm text-slate-400 uppercase tracking-widest font-bold mt-2">{items.find(i => i.id === showDetailView)?.type}</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
                  <div className="flex flex-col items-center">
                    <span className="material-symbols-outlined text-red-500 fill-1 !text-[32px] mb-2">favorite</span>
                    <span className="text-2xl font-black text-red-500">{items.find(i => i.id === showDetailView)?.liked ? '1' : '0'}</span>
                    <span className="text-[10px] text-slate-500 uppercase font-bold mt-1">Likes</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="material-symbols-outlined text-blue-400 !text-[32px] mb-2">chat_bubble</span>
                    <span className="text-2xl font-black text-blue-400">{items.find(i => i.id === showDetailView)?.commentCount}</span>
                    <span className="text-[10px] text-slate-500 uppercase font-bold mt-1">Comments</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="material-symbols-outlined text-emerald-400 !text-[32px] mb-2">check_circle</span>
                    <span className="text-2xl font-black text-emerald-400">{items.find(i => i.id === showDetailView)?.approved ? '✓' : '◯'}</span>
                    <span className="text-[10px] text-slate-500 uppercase font-bold mt-1">Status</span>
                  </div>
                </div>

                {/* Comments Section */}
                <div className="pt-4 border-t border-white/5">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Comments ({items.find(i => i.id === showDetailView)?.commentCount || 0})</h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {(items.find(i => i.id === showDetailView)?.comments || []).length > 0 ? (
                      (items.find(i => i.id === showDetailView)?.comments || []).map((comment) => (
                        <div key={comment.id} className="bg-white/5 rounded-xl p-4 border border-white/5">
                          <div className="flex items-start gap-3">
                            <div className="size-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {comment.author.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <h4 className="text-xs font-black text-white">{comment.author}</h4>
                                  <p className="text-[10px] text-slate-500 font-bold">{comment.role}</p>
                                </div>
                                <span className="text-[10px] text-slate-600 whitespace-nowrap">{comment.timestamp}</span>
                              </div>
                              <p className="text-xs text-slate-300 mt-2 leading-relaxed">{comment.content}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-[13px] text-slate-500 italic">No comments yet. Be the first to share feedback!</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="border-t border-white/5 bg-[#0d1113] p-6 flex gap-3">
              <button
                onClick={() => {
                  const item = items.find(i => i.id === showDetailView)
                  if (item) toggleLike(item.id)
                }}
                className={cn(
                  'flex-1 h-12 rounded-xl font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2',
                  items.find(i => i.id === showDetailView)?.liked 
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                    : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                )}
              >
                <span className="material-symbols-outlined">favorite</span>
                {items.find(i => i.id === showDetailView)?.liked ? 'Liked' : 'Like'}
              </button>
              <button
                onClick={() => {
                  setShowDetailView(null)
                  setShowCommentDrawer(showDetailView)
                }}
                className="flex-1 h-12 bg-blue-500 text-white rounded-xl font-bold uppercase tracking-wider hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">chat_bubble</span>
                Add Comment
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
