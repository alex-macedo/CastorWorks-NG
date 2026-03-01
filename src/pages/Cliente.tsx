/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useCallback, useRef, useState, useEffect } from "react";
import { Save, Loader2, Trash } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useClients } from "@/hooks/useClients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { lookupBrazilCep } from "@/lib/addressLookup";

const Cliente = () => {
  const { t } = useLocalization();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { createClient, updateClient, deleteClient, checkClientCanDelete } = useClients();
  const { toast } = useToast();
  const isEditMode = !!id;
  // Sheet is open when we're on /clientes/new or /clientes/:id
  const isOpen = location.pathname === '/clientes/new' || !!id;
  // Get return path from location state, default to /clientes
  const returnTo =
    (location.state as { returnTo?: string })?.returnTo || "/clientes";
  
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    email: "",
    phone: "",
    country: "BR",
    line1: "",
    line2: "",
    district: "",
    city: "",
    region: "",
    postal_code: "",
    notes: "",
  });
  const [normalizedAddress, setNormalizedAddress] = useState(null);
  const [uspsRecommendation, setUspsRecommendation] = useState(null);
  const [lookupStatus, setLookupStatus] = useState({
    isLoading: false,
    error: "",
  });
  const [touched, setTouched] = useState({
    line1: false,
    line2: false,
    district: false,
    city: false,
    region: false,
    postal_code: false,
  });
  const touchedRef = useRef(touched);
  const lastCepLookup = useRef<string | null>(null);

  useEffect(() => {
    touchedRef.current = touched;
  }, [touched]);

  // Fetch client data if in edit mode
  const { data: client, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: isEditMode && !!id,
  });

  // Populate form when client data is loaded
  useEffect(() => {
    if (client) {
      // Parse location if it exists
      let line1 = "";
      let city = "";
      let region = "";
      let postalCode = "";

      if (client.location) {
        const parts = client.location.split(",").map((p) => p.trim());
        if (parts.length >= 3) {
          line1 = parts[0];
          city = parts[1];
          const stateZip = parts[2].split(" ");
          region = stateZip[0] || "";
          postalCode = stateZip.slice(1).join(" ") || "";
        } else if (parts.length === 1) {
          line1 = parts[0];
        }
      }

      const rawCountry = client.raw_input_country;
      const normalizedCountry = client.normalized_country;

      setFormData({
        name: client.name || "",
        type: client.type || "",
        email: client.email || "",
        phone: client.phone || "",
        country: rawCountry || normalizedCountry || "BR",
        line1: client.raw_input_line1 || line1,
        line2: client.raw_input_line2 || "",
        district: client.raw_input_district || "",
        city: client.raw_input_city || city,
        region: client.raw_input_region || region,
        postal_code: client.raw_input_postal_code || postalCode,
        notes: client.notes || "",
      });
    }
  }, [client]);

  const applyLookupFields = useCallback((normalized: any) => {
    setFormData((prev) => {
      const next = { ...prev };
      const touchedState = touchedRef.current;

      if (!touchedState.line1 && !next.line1) {
        next.line1 = normalized.line1 || "";
      }
      if (!touchedState.district && !next.district) {
        next.district = normalized.district || "";
      }
      if (!touchedState.city && !next.city) {
        next.city = normalized.city || "";
      }
      if (!touchedState.region && !next.region) {
        next.region = normalized.region || "";
      }
      if (!touchedState.postal_code && !next.postal_code) {
        next.postal_code = normalized.postal_code || "";
      }

      return next;
    });
  }, []);

  const handleCepLookup = useCallback(async (cep: string) => {
    if (!cep || cep.length < 8) return;
    
    setLookupStatus({ isLoading: true, error: "" });
    setUspsRecommendation(null);

    try {
      const { normalized, error } = await lookupBrazilCep(cep);
      
      if (error) {
        setLookupStatus({
          isLoading: false,
          error: error || "CEP lookup failed.",
        });
        toast({
          title: t("cliente.addressLookupErrorTitle"),
          description: t("cliente.addressLookupErrorMessage"),
          variant: "destructive",
        });
        return;
      }

      const hasAddressData = normalized?.line1 || normalized?.city || normalized?.district;
      
      if (!normalized?.quality?.is_valid && !hasAddressData) {
        setLookupStatus({
          isLoading: false,
          error: "Invalid CEP or no address data found.",
        });
        toast({
          title: t("cliente.addressLookupErrorTitle"),
          description: t("cliente.addressLookupErrorMessage"),
          variant: "destructive",
        });
        return;
      }

      if (normalized) {
        setNormalizedAddress(normalized);
        applyLookupFields(normalized);
        
        const foundParts = [
          normalized.city,
          normalized.region,
          normalized.district
        ].filter(Boolean).join(', ');

        toast({
          title: t('projects:addressFoundTitle') || 'Address Found',
          description: t('projects:addressFoundMessage', { city: foundParts }) || `Address data found: ${foundParts}`,
        });
      }
    } catch (error) {
      console.error('CEP lookup error:', error);
      setLookupStatus({
        isLoading: false,
        error: error instanceof Error ? error.message : "CEP lookup failed.",
      });
      toast({
        title: t("cliente.addressLookupErrorTitle"),
        description: t("cliente.addressLookupErrorMessage"),
        variant: "destructive",
      });
    } finally {
      setLookupStatus({ isLoading: false, error: "" });
    }
  }, [applyLookupFields, t, toast]);

  useEffect(() => {
    if (formData.country !== "BR") {
      return;
    }

    const cep = formData.postal_code.replace(/\D/g, "");
    if (cep.length !== 8) {
      return;
    }

    if (lastCepLookup.current === cep) {
      return;
    }

    lastCepLookup.current = cep;
    void handleCepLookup(cep);
  }, [formData.country, formData.postal_code, handleCepLookup]);

  const handleUspsValidation = async () => {
    setLookupStatus({ isLoading: true, error: "" });

    const { data, error } = await supabase.functions.invoke(
      "addresses-lookup",
      {
        body: {
          country: "US",
          line1: formData.line1,
          line2: formData.line2,
          city: formData.city,
          region: formData.region,
          postal_code: formData.postal_code,
        },
      }
    );

    if (error) {
      setLookupStatus({
        isLoading: false,
        error: error.message || "USPS validation failed.",
      });
      toast({
        title: t("cliente.addressLookupErrorTitle"),
        description: t("cliente.addressLookupErrorMessage"),
        variant: "destructive",
      });
      return;
    }

    if (data?.standardized) {
      setNormalizedAddress(data.standardized);
      setUspsRecommendation(data.standardized);
    }

    setLookupStatus({ isLoading: false, error: "" });
  };

  const applyUspsRecommendation = () => {
    if (!uspsRecommendation) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      line1: uspsRecommendation.line1 || prev.line1,
      line2: uspsRecommendation.line2 || prev.line2,
      city: uspsRecommendation.city || prev.city,
      region: uspsRecommendation.region || prev.region,
      postal_code: uspsRecommendation.postal_code || prev.postal_code,
    }));
    setTouched((prev) => ({
      ...prev,
      line1: true,
      line2: true,
      city: true,
      region: true,
      postal_code: true,
    }));
    setUspsRecommendation(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.country === "BR") {
      const hasNumber = /\d/.test(formData.line1) || (formData.line2 && /\d/.test(formData.line2));
      if (!hasNumber) {
        toast({
          title: t("cliente.addressIncompleteTitle"),
          description: t("cliente.addressIncompleteMessage"),
          variant: "destructive",
        });
        return;
      }
    }

    const lineWithUnit = [formData.line1, formData.line2]
      .filter((value) => value && value.trim() !== "")
      .join(" ");

    const locationValue = lineWithUnit
      ? `${lineWithUnit}, ${formData.city}, ${formData.region} ${
          formData.postal_code
        }`.trim()
      : undefined;

    const normalized = normalizedAddress ?? null;

    const clientData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      type: formData.type || undefined,
      location: locationValue,
      notes: formData.notes || undefined,
      status: "Active",
      raw_input_country: formData.country,
      raw_input_postal_code: formData.postal_code || null,
      raw_input_line1: formData.line1 || null,
      raw_input_line2: formData.line2 || null,
      raw_input_city: formData.city || null,
      raw_input_region: formData.region || null,
      raw_input_district: formData.district || null,
      normalized_country: normalized?.country || null,
      normalized_postal_code: normalized?.postal_code || null,
      normalized_line1: normalized?.line1 || null,
      normalized_line2: normalized?.line2 || null,
      normalized_city: normalized?.city || null,
      normalized_region: normalized?.region || null,
      normalized_district: normalized?.district || null,
      normalized_zip5: normalized?.zip5 || null,
      normalized_zip4: normalized?.zip4 || null,
      normalized_ibge: normalized?.ibge || null,
      normalized_source: normalized?.source || null,
      normalized_is_valid: normalized?.quality?.is_valid ?? null,
      normalized_is_deliverable:
        normalized?.quality?.is_deliverable ?? null,
      normalized_messages: normalized?.quality?.messages ?? null,
      normalized_warnings: normalized?.quality?.warnings ?? null,
      standardized_source:
        formData.country === "US" ? normalized?.source || null : null,
      standardized_at:
        formData.country === "US" && normalized
          ? new Date().toISOString()
          : null,
    };

    if (isEditMode && id) {
      await updateClient.mutateAsync({
        id,
        ...clientData,
      });
    } else {
      await createClient.mutateAsync(clientData);
    }
    
    navigate(returnTo);
  };

  const handleDeleteClient = async () => {
    if (!id) return;

    try {
      // Check if client can be deleted
      const { canDelete, reason } = await checkClientCanDelete(id);
      
      if (!canDelete) {
        // Show error message with reason
        alert(`Cannot delete client: ${reason}`);
        return;
      }

      // Confirm deletion
      const confirmed = window.confirm(`Are you sure you want to delete "${formData.name}"? This action cannot be undone.`);
      
      if (confirmed) {
        await deleteClient.mutateAsync(id);
        navigate(returnTo);
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Failed to delete client. Please try again.');
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      navigate(returnTo);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-3xl overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>
            {isEditMode ? t("cliente.editTitle") : t("cliente.title")}
          </SheetTitle>
          <SheetDescription>
            {isEditMode ? t('cliente.editSubtitle') : t('cliente.subtitle')}
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <p>{t('common.loading')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6">
            <div className="grid gap-6">
          <Card>
            <CardHeader>
                <CardTitle>{t('cliente.basicInfo')}</CardTitle>
              </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('cliente.label.name')}</Label>
                    <Input
                      id="name"
                      placeholder={t('cliente.placeholder.name')}
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>

                <div className="space-y-2">
                  <Label htmlFor="type">{t('cliente.label.type')}</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger id="type">
                      <SelectValue
                        placeholder={t("cliente.placeholder.type")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">
                        {t("cliente.select.individual")}
                      </SelectItem>
                      <SelectItem value="company">
                        {t("cliente.select.company")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('cliente.label.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('cliente.placeholder.email')}
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">{t('cliente.label.phone')}</Label>
                  <Input
                    id="phone"
                    placeholder={t('cliente.placeholder.phone')}
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('cliente.address')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4" style={{ gridTemplateColumns: formData.country === "BR" ? "20% 80%" : "1fr" }}>
                {formData.country === "BR" && (
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">
                      {t("cliente.label.postalCodeBR")}
                    </Label>
                    <div className="relative">
                      <Input
                        id="postalCode"
                        placeholder={t("cliente.placeholder.postalCodeBR")}
                        value={formData.postal_code}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          setFormData({
                            ...formData,
                            postal_code: value,
                          });
                          // Don't mark postal_code as touched immediately for BR - 
                          // let the lookup populate it first if it's 8 digits
                          if (value.length !== 8) {
                            setTouched({ ...touched, postal_code: true });
                          }
                        }}
                        onBlur={() =>
                          setTouched({ ...touched, postal_code: true })
                        }
                        maxLength={8}
                      />
                      {lookupStatus.isLoading && (
                        <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="line1">{t("cliente.label.line1")}</Label>
                  <Input
                    id="line1"
                    placeholder={t("cliente.placeholder.line1")}
                    value={formData.line1}
                    onChange={(e) => {
                      setFormData({ ...formData, line1: e.target.value });
                      setTouched({ ...touched, line1: true });
                    }}
                    onBlur={() => setTouched({ ...touched, line1: true })}
                  />
                  {formData.country === "BR" && (
                    <p className="text-xs text-muted-foreground">
                      {t("cliente.addressNumberHelp")}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="line2">{t("cliente.label.line2")}</Label>
                  <Input
                    id="line2"
                    placeholder={t("cliente.placeholder.line2")}
                    value={formData.line2}
                    onChange={(e) => {
                      setFormData({ ...formData, line2: e.target.value });
                      setTouched({ ...touched, line2: true });
                    }}
                    onBlur={() => setTouched({ ...touched, line2: true })}
                  />
                </div>

                {formData.country === "BR" && (
                  <div className="space-y-2">
                    <Label htmlFor="district">
                      {t("cliente.label.district")}
                    </Label>
                    <Input
                      id="district"
                      placeholder={t("cliente.placeholder.district")}
                      value={formData.district}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          district: e.target.value,
                        });
                        setTouched({ ...touched, district: true });
                      }}
                      onBlur={() => setTouched({ ...touched, district: true })}
                    />
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="city">{t("cliente.label.city")}</Label>
                  <Input
                    id="city"
                    placeholder={t("cliente.placeholder.city")}
                    value={formData.city}
                    onChange={(e) => {
                      setFormData({ ...formData, city: e.target.value });
                      setTouched({ ...touched, city: true });
                    }}
                    onBlur={() => setTouched({ ...touched, city: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="region">{t("cliente.label.region")}</Label>
                  <Input
                    id="region"
                    placeholder={t("cliente.placeholder.region")}
                    value={formData.region}
                    onChange={(e) => {
                      setFormData({ ...formData, region: e.target.value });
                      setTouched({ ...touched, region: true });
                    }}
                    onBlur={() => setTouched({ ...touched, region: true })}
                  />
                </div>

                {formData.country === "US" && (
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">
                      {t("cliente.label.postalCodeUS")}
                    </Label>
                    <Input
                      id="postalCode"
                      placeholder={t("cliente.placeholder.postalCodeUS")}
                      value={formData.postal_code}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          postal_code: e.target.value,
                        });
                        setTouched({ ...touched, postal_code: true });
                      }}
                      onBlur={() =>
                        setTouched({ ...touched, postal_code: true })
                      }
                    />
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="country">{t("cliente.label.country")}</Label>
                  <Select
                    value={formData.country}
                    onValueChange={(value) => {
                      setFormData({ ...formData, country: value });
                      setUspsRecommendation(null);
                      setNormalizedAddress(null);
                    }}
                  >
                    <SelectTrigger id="country">
                      <SelectValue
                        placeholder={t("cliente.placeholder.country")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BR">
                        {t("cliente.select.countryBR")}
                      </SelectItem>
                      <SelectItem value="US">
                        {t("cliente.select.countryUS")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.country === "US" && (
                <div className="flex flex-col gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleUspsValidation}
                    disabled={lookupStatus.isLoading}
                  >
                    {t("cliente.validateAddress")}
                  </Button>

                  {uspsRecommendation && (
                    <div className="rounded-md border p-3 text-sm">
                      <p className="font-semibold">
                        {t("cliente.uspsRecommendationTitle")}
                      </p>
                      <div className="mt-2 space-y-1">
                        <p>
                          {t("cliente.uspsEnteredLabel")}{" "}
                          {formData.line1}, {formData.city},{" "}
                          {formData.region} {formData.postal_code}
                        </p>
                        <p>
                          {t("cliente.uspsRecommendedLabel")}{" "}
                          {uspsRecommendation.line1},{" "}
                          {uspsRecommendation.city},{" "}
                          {uspsRecommendation.region}{" "}
                          {uspsRecommendation.postal_code}
                        </p>
                      </div>
                      <div className="mt-3">
                        <Button
                          type="button"
                          onClick={applyUspsRecommendation}
                        >
                          {t("cliente.acceptRecommendation")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('cliente.additionalInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">{t('cliente.label.notes')}</Label>
                <Textarea
                  id="notes"
                  placeholder={t('cliente.placeholder.notes')}
                  className="min-h-32"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => navigate("/clientes")}
                >
                  {t('cliente.actions.cancel')}
                </Button>
                {isEditMode && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDeleteClient}
                    disabled={deleteClient.isPending}
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    {t('cliente.actions.delete')}
                  </Button>
                )}
                <Button
                  type="submit"
                  className=""
                  disabled={createClient.isPending || updateClient.isPending}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {t('cliente.actions.save')}
                </Button>
              </div>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default Cliente;
