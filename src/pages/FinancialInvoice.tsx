import { useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/DateInput";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLocalization } from "@/contexts/LocalizationContext";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

const FinancialInvoice = () => {
  const { t } = useLocalization();
  const [formData, setFormData] = useState({
    type: "",
    project: "",
    category: "",
    amount: "",
    date: "",
    paymentMethod: "",
    recipient: "",
    description: "",
    reference: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Invoice data:", formData);
    // Handle form submission
  };

  return (
    <div className="space-y-6">
      <SidebarHeaderShell>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('financialInvoice.title')}</h1>
            <p className="text-sm text-sidebar-primary-foreground/80">{t('financialInvoice.subtitle')}</p>
          </div>
          <Link to="/financial">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('financialInvoice.backToFinancial')}
            </Button>
          </Link>
        </div>
      </SidebarHeaderShell>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('financialInvoice.transactionInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="type">{t('financialInvoice.transactionTypeLabel')} *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger id="type">
                      <SelectValue placeholder={t("selectOptions.selectType")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">{t('common.financialTransaction.income')}</SelectItem>
                      <SelectItem value="expense">{t('common.financialTransaction.expense')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project">{t('financialInvoice.projectLabel')}</Label>
                  <Select
                    value={formData.project}
                    onValueChange={(value) => setFormData({ ...formData, project: value })}
                  >
                    <SelectTrigger id="project">
                      <SelectValue placeholder={t("selectOptions.selectProjectOptional")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Residential Villa - Silva Family</SelectItem>
                      <SelectItem value="2">Commercial Building Downtown</SelectItem>
                      <SelectItem value="3">Apartment Renovation - Unit 302</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category">{t('financialInvoice.categoryLabel')} *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder={t("selectOptions.selectCategory")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="materials">{t("commonUI.materials") }</SelectItem>
                      <SelectItem value="labor">{t("aiComponent.labor")}</SelectItem>
                      <SelectItem value="equipment">{t('common.transactionCategory.equipment')}</SelectItem>
                      <SelectItem value="services">{t('common.transactionCategory.services')}</SelectItem>
                      <SelectItem value="payment">{t('common.transactionCategory.clientPayment')}</SelectItem>
                      <SelectItem value="other">{t('common.transactionCategory.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">{t('financialInvoice.amountLabel')} *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder={t("inputPlaceholders.amount")}
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="date">{t('financialInvoice.dateLabel')} *</Label>
                  <DateInput
                    value={formData.date}
                    onChange={(value) => setFormData({ ...formData, date: value })}
                    placeholder={t("selectOptions.selectDate")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">{t('financialInvoice.paymentMethodLabel')} *</Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                  >
                    <SelectTrigger id="paymentMethod">
                      <SelectValue placeholder={t("selectOptions.selectMethod")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">{t('common.paymentMethod.cash')}</SelectItem>
                      <SelectItem value="transfer">{t('common.paymentMethod.bankTransfer')}</SelectItem>
                      <SelectItem value="credit">{t('common.paymentMethod.creditCard')}</SelectItem>
                      <SelectItem value="debit">{t('common.paymentMethod.debitCard')}</SelectItem>
                      <SelectItem value="check">{t('common.paymentMethod.check')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipient">{t('financialInvoice.recipientLabel')} *</Label>
                <Input
                  id="recipient"
                  placeholder={t("inputPlaceholders.enterName")}
                  value={formData.recipient}
                  onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('financialInvoice.additionalDetails')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reference">{t('financialInvoice.referenceNumberLabel')}</Label>
                <Input
                  id="reference"
                  placeholder={t("inputPlaceholders.invoiceNumber")}
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('financialInvoice.descriptionLabel')}</Label>
                <Textarea
                  id="description"
                  placeholder={t("inputPlaceholders.transactionDetails")}
                  className="min-h-32"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Link to="/financial">
              <Button type="button" variant="outline">
                {t('common.cancel')}
              </Button>
            </Link>
            <Button type="submit" className="">
              <Save className="mr-2 h-4 w-4" />
              {t('common.actions.saveTransaction')}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default FinancialInvoice;
