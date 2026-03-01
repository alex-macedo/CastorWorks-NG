import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatters";
import { formatCompactCurrency } from "@/utils/compactFormatters";
import { useLocalization } from "@/contexts/LocalizationContext";
import { ArrowRight } from "lucide-react";

export function NumberFormatPreview() {
  const { currency, numberFormat } = useLocalization();

  const examples = [
    { label: "Small amount", value: 1250 },
    { label: "Thousands", value: 45000 },
    { label: "Hundreds of thousands", value: 850000 },
    { label: "Millions", value: 3500000 },
    { label: "Tens of millions", value: 26800000 },
    { label: "Billions", value: 1250000000 },
  ];

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="text-base">Number Format Preview</CardTitle>
        <CardDescription>
          See how different amounts appear in compact vs full format
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {examples.map((example, index) => (
            <div
              key={index}
              className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">{example.label}</p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Full:</span>
                    <span className={`font-mono text-sm ${numberFormat === 'full' ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                      {formatCurrency(example.value, currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Compact:</span>
                    <span className={`font-mono text-sm ${numberFormat === 'compact' ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                      {formatCompactCurrency(example.value, currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-primary">Current format:</span>{" "}
            {numberFormat === 'compact' ? (
              <>
                <span className="font-medium">Compact</span> - Large numbers are abbreviated (K, M, B). 
                Hover over any number to see the full value.
              </>
            ) : (
              <>
                <span className="font-medium">Full</span> - All numbers are shown in their complete form.
              </>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
