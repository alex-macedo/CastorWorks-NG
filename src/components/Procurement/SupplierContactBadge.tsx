import { Badge } from '@/components/ui/badge';
import { Mail, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocalization } from '@/contexts/LocalizationContext';

interface SupplierContactBadgeProps {
  contactMethod: string;
  className?: string;
}

export function SupplierContactBadge({ contactMethod, className }: SupplierContactBadgeProps) {
  // Use localization if available; fall back to English defaults for tests/server environments
  let t = (key: string) => key;
  try {
    const ctx = useLocalization();
    t = ctx.t;
  } catch (e) {
    // fallback
    t = (key: string) => {
      const map: Record<string, string> = {
        'procurement.contactMethods.email': 'Email',
        'procurement.contactMethods.whatsapp': 'WhatsApp',
        'procurement.contactMethods.both': 'Both',
      };
      return map[key] || key;
    };
  }

  const resolveLabel = (key: string, fallback: string) => {
    try {
      const val = t(key);
      // If translation missing, t returns the key itself. Detect that and use fallback.
      if (!val || val === key) return fallback;
      return val;
    } catch (e) {
      return fallback;
    }
  };

  const emailLabel = resolveLabel('procurement.contactMethods.email', 'Email');
  const whatsappLabel = resolveLabel('procurement.contactMethods.whatsapp', 'WhatsApp');
  const bothLabel = resolveLabel('procurement.contactMethods.both', 'Both');

  const getBadgeConfig = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'email':
        return {
          icon: <Mail className="h-3 w-3 mr-1" />,
          text: emailLabel,
          className: 'border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100',
        };
      case 'whatsapp':
        return {
          icon: <MessageCircle className="h-3 w-3 mr-1" />,
          text: whatsappLabel,
          className: 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100',
        };
      case 'both':
        return {
          icon: (
            <>
              <Mail className="h-3 w-3 mr-1" />
              <MessageCircle className="h-3 w-3 mr-1" />
            </>
          ),
          text: bothLabel,
          className: 'border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100',
        };
      default:
        return {
          icon: <Mail className="h-3 w-3 mr-1" />,
          text: emailLabel,
          className: 'border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100',
        };
    }
  };

  const config = getBadgeConfig(contactMethod);

  return (
    <Badge 
      variant="outline" 
      className={cn(config.className, className)}
    >
      {config.icon}
      {config.text}
    </Badge>
  );
}