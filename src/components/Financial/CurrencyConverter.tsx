import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useLocalization, Currency } from "@/contexts/LocalizationContext";
import { useState } from "react";

interface CurrencyConverterProps {
  amount: number;
  fromCurrency?: Currency;
}

export function CurrencyConverter({ amount, fromCurrency }: CurrencyConverterProps) {
  const { currency: userCurrency } = useLocalization();
  const [toCurrency, setToCurrency] = useState<Currency>(userCurrency);

  // Mock exchange rates - in production would come from exchange_rates table
  const exchangeRates: Record<string, Record<string, number>> = {
    BRL: { USD: 0.20, EUR: 0.18, BRL: 1 },
    USD: { BRL: 5.00, EUR: 0.92, USD: 1 },
    EUR: { BRL: 5.45, USD: 1.09, EUR: 1 },
  };

  const from = fromCurrency || userCurrency;
  const rate = exchangeRates[from]?.[toCurrency] || 1;
  const convertedAmount = amount * rate;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Currency Converter</CardTitle>
        <CardDescription>
          Convert amounts between different currencies
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>From</Label>
            <Input value={`${amount.toFixed(2)} ${from}`} readOnly />
          </div>

          <div className="space-y-2">
            <Label>To</Label>
            <Select 
              value={toCurrency} 
              onValueChange={(value) => setToCurrency(value as Currency)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BRL">{t("currency.brl")}</SelectItem>
                <SelectItem value="USD">{t("currency.usd")}</SelectItem>
                <SelectItem value="EUR">{t("currency.eur")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Converted Amount:</span>
            <span className="text-2xl font-bold">
              {convertedAmount.toFixed(2)} {toCurrency}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Exchange rate: 1 {from} = {rate.toFixed(4)} {toCurrency}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
