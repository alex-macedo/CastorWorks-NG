import { useNavigate } from "react-router-dom";
import { Truck, AlertTriangle, CheckSquare, ChevronRight } from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { useEffect, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

interface StatsCarouselProps {
  stats: {
    todayDeliveries: number;
    openIssues: number;
    pendingInspections: number;
  };
}

export function StatsCarousel({ stats }: StatsCarouselProps) {
  const { t } = useLocalization();
  const navigate = useNavigate();
  const { vibrate } = useHapticFeedback();
  const [api, setApi] = useState<CarouselApi>();

  useEffect(() => {
    if (!api) return;

    // Haptic feedback on carousel slide change
    api.on("select", () => {
      vibrate("light");
    });
  }, [api, vibrate]);

  const handleCardClick = (path: string) => {
    vibrate("medium");
    navigate(path);
  };

  const statCards = [
    {
      title: t("supervisor.todayDeliveries"),
      value: stats.todayDeliveries,
      description: t("supervisor.expectedToday"),
      icon: Truck,
      path: "/supervisor/deliveries",
      gradient: "from-primary to-primary-light",
    },
    {
      title: t("supervisor.openIssues"),
      value: stats.openIssues,
      description: t("supervisor.requiresAttention"),
      icon: AlertTriangle,
      path: "/supervisor/issues",
      gradient: "from-warning to-yellow-400",
    },
    {
      title: t("supervisor.pendingInspections"),
      value: stats.pendingInspections,
      description: t("supervisor.awaitingCompletion"),
      icon: CheckSquare,
      path: "/supervisor/inspections",
      gradient: "from-success to-green-400",
    },
  ];

  return (
    <Carousel
      setApi={setApi}
      opts={{
        align: "start",
        loop: true,
      }}
      className="w-full"
    >
      <CarouselContent className="-ml-2">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <CarouselItem key={index} className="pl-2 basis-[49%]">
              <button
                onClick={() => handleCardClick(card.path)}
                className={cn(
                  "w-full h-36 rounded-xl p-4 text-left relative overflow-hidden",
                  "bg-gradient-to-br shadow-lg active:scale-[0.98] transition-transform",
                  "text-white",
                  card.gradient
                )}
              >
                {/* Background Icon */}
                <Icon className="absolute -right-4 -bottom-4 h-24 w-24 opacity-20" />

                {/* Content */}
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="h-6 w-6" />
                    <ChevronRight className="h-5 w-5" />
                  </div>

                  <div className="mt-auto">
                    <div className="text-4xl font-bold mb-1 tracking-tight">
                      {card.value}
                    </div>
                    <div className="text-xs font-medium opacity-90 mb-0.5">
                      {card.title}
                    </div>
                    <div className="text-[10px] opacity-75 leading-tight">{card.description}</div>
                  </div>
                </div>
              </button>
            </CarouselItem>
          );
        })}
      </CarouselContent>

      {/* Pagination Dots */}
      <div className="flex justify-center gap-2 mt-4">
        {statCards.map((_, index) => (
          <div
            key={index}
            className="h-2 w-2 rounded-full bg-muted transition-all"
          />
        ))}
      </div>
    </Carousel>
  );
}
