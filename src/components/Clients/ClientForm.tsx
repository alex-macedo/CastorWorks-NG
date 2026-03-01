import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import resolveStorageUrl from '@/utils/storage';
import { Upload, X, Loader2, Trash } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClients } from "@/hooks/useClients";
import type { Database } from "@/integrations/supabase/types";
import { useLocalization } from "@/contexts/LocalizationContext";
import { lookupBrazilCep } from "@/lib/addressLookup";
import { useToast } from "@/hooks/use-toast";
import { formatCPFOrCNPJ, validateCPFOrCNPJ } from "@/utils/formatters";

type Client = Database['public']['Tables']['clients']['Row'];

const createClientSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(1, { message: t("common.validation.nameRequired") }),
    email: z.string().email({ message: t("common.validation.invalidEmail") }).optional().or(z.literal("")),
    phone: z.string().optional(),
    cpf: z
      .string()
      .optional()
      .or(z.literal(""))
      .refine(
        (val) => !val || val.trim() === "" || validateCPFOrCNPJ(val),
        { message: t("projects:validation.clientCpfInvalid") }
      ),
    location: z.string().optional(),
    status: z.enum(["Active", "Inactive"]),
    avatar_initial: z.string().max(2).optional(),
    // Address fields
    zip_code: z.string().optional(),
    construction_address: z.string().optional(),
    street_number: z.string().optional(),
    address_complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
  });

type ClientFormValues = z.infer<ReturnType<typeof createClientSchema>>;

interface ClientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: any;
}

export function ClientForm({ open, onOpenChange, client }: ClientFormProps) {
  const { t } = useLocalization();
  const { toast } = useToast();
  const { createClient, updateClient, deleteClient, checkClientCanDelete } = useClients();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isLookingUpAddress, setIsLookingUpAddress] = useState(false);
  const lastCepLookup = useRef<string | null>(null);
  const clientSchema = createClientSchema(t);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      cpf: "",
      location: "",
      status: "Active",
      avatar_initial: "",
      zip_code: "",
      construction_address: "",
      street_number: "",
      address_complement: "",
      neighborhood: "",
      city: "",
      state: "",
    },
  });

  const zipCode = useWatch({ control: form.control, name: "zip_code" }) || "";

  const applyAddressLookup = useCallback((normalized: any) => {
    const candidates = [
      { name: "construction_address", value: normalized.line1 },
      { name: "neighborhood", value: normalized.district },
      { name: "city", value: normalized.city },
      { name: "state", value: normalized.region },
    ];

    candidates.forEach(({ name, value }) => {
      const state = form.getFieldState(name);
      const current = form.getValues(name);
      if (!state.isTouched && !current) {
        form.setValue(name, value || "", { shouldDirty: true });
      }
    });
  }, [form]);

  const runCepLookup = useCallback(async (cep: string) => {
    if (!cep || cep.length < 8) return;
    
    setIsLookingUpAddress(true);
    try {
      const { normalized, error } = await lookupBrazilCep(cep);
      if (error) {
        toast({
          title: t('projects:addressLookupErrorTitle'),
          description: t('projects:addressLookupErrorMessage'),
          variant: 'destructive',
        });
        return;
      }

      const hasAddressData = normalized?.line1 || normalized?.city || normalized?.district;
      
      if (!normalized?.quality?.is_valid && !hasAddressData) {
        toast({
          title: t('projects:addressLookupErrorTitle'),
          description: t('projects:addressLookupErrorMessage'),
          variant: 'destructive',
        });
        return;
      }

      applyAddressLookup(normalized);
      
      const foundParts = [
        normalized.city,
        normalized.region,
        normalized.district
      ].filter(Boolean).join(', ');

      toast({
        title: t('projects:addressFoundTitle') || 'Address Found',
        description: t('projects:addressFoundMessage', { city: foundParts }) || `Address data found: ${foundParts}`,
      });
    } finally {
      setIsLookingUpAddress(false);
    }
  }, [applyAddressLookup, t, toast]);

  useEffect(() => {
    const digits = String(zipCode).replace(/\D/g, '');
    if (digits.length !== 8) {
      return;
    }
    if (lastCepLookup.current === digits) {
      return;
    }
    lastCepLookup.current = digits;
    void runCepLookup(digits);
  }, [zipCode, runCepLookup]);

  // Reset form when client changes or dialog opens/closes
  useEffect(() => {
    if (open) {
      if (client) {
        // Parse location if it exists to populate address fields
        const parsedAddress = {
          zip_code: "",
          construction_address: "",
          street_number: "",
          address_complement: "",
          neighborhood: "",
          city: "",
          state: "",
        };

        if (client.location) {
          // Try to parse location string (format: "Street, Number, Complement, Neighborhood, City, State CEP")
          const parts = client.location.split(",").map((p) => p.trim());
          if (parts.length >= 3) {
            parsedAddress.construction_address = parts[0] || "";
            // Try to extract number and complement from first part
            const addressMatch = parts[0].match(/^(.+?)\s+(\d+)(?:\s+(.+))?$/);
            if (addressMatch) {
              parsedAddress.construction_address = addressMatch[1].trim();
              parsedAddress.street_number = addressMatch[2];
              if (addressMatch[3]) {
                parsedAddress.address_complement = addressMatch[3].trim();
              }
            }
            parsedAddress.neighborhood = parts[1] || "";
            const cityStateZip = parts[2]?.split(" ") || [];
            parsedAddress.city = cityStateZip[0] || "";
            parsedAddress.state = cityStateZip[1] || "";
            // Extract CEP from the end (format: CEP: 12345-678)
            const cepMatch = parts[2]?.match(/CEP:\s*([\d-]+)/i) || parts[2]?.match(/(\d{5}-?\d{3})/);
            if (cepMatch) {
              parsedAddress.zip_code = cepMatch[1].replace(/\D/g, "");
            }
          }
        }

        // Use raw_input fields if available (from Cliente.tsx form)
        if (client.raw_input_postal_code) {
          parsedAddress.zip_code = client.raw_input_postal_code.replace(/\D/g, "");
        }
        if (client.raw_input_line1) {
          parsedAddress.construction_address = client.raw_input_line1;
        }
        if (client.raw_input_line2) {
          parsedAddress.address_complement = client.raw_input_line2;
        }
        if (client.raw_input_district) {
          parsedAddress.neighborhood = client.raw_input_district;
        }
        if (client.raw_input_city) {
          parsedAddress.city = client.raw_input_city;
        }
        if (client.raw_input_region) {
          parsedAddress.state = client.raw_input_region;
        }

        form.reset({
          name: client.name || "",
          email: client.email || "",
          phone: client.phone || "",
          cpf: client.cpf || "",
          location: client.location || "",
          status: (client.status as "Active" | "Inactive") || "Active",
          avatar_initial: client.avatar_initial || "",
          ...parsedAddress,
        });

        // Resolve stored path or URL to a preview URL
        (async () => {
          if (client.image_url) {
            const resolved = await resolveStorageUrl(client.image_url);
            setImagePreview(resolved || null);
          } else {
            setImagePreview(null);
          }
        })();
      } else {
        form.reset({
          name: "",
          email: "",
          phone: "",
          cpf: "",
          location: "",
          status: "Active",
          avatar_initial: "",
          zip_code: "",
          construction_address: "",
          street_number: "",
          address_complement: "",
          neighborhood: "",
          city: "",
          state: "",
        });
        setImagePreview(null);
      }
      setImageFile(null);
      lastCepLookup.current = null;
    }
  }, [open, client, form]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return client?.image_url || null;

    setUploading(true);
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('client-images')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      // Do NOT persist signed URLs. Persist the stable file path and
      // resolve a signed URL locally for preview only.
      // Set preview URL for immediate UI feedback
      const previewUrl = await resolveStorageUrl(`client-images/${filePath}`, 60 * 60);
      if (previewUrl) setImagePreview(previewUrl);

      return filePath;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: ClientFormValues) => {
    const filePath = await uploadImage();

    // Build location string from address fields
    const addressParts = [
      data.construction_address,
      data.street_number ? `${data.street_number}` : '',
      data.address_complement,
      data.neighborhood ? `${data.neighborhood}` : '',
      data.zip_code ? `CEP: ${data.zip_code}` : ''
    ].filter(part => part && part.trim() !== '');
    
    const locationParts = [
      addressParts.length > 0 ? addressParts.join(', ') : '',
      data.city,
      data.state
    ].filter(part => part && part.trim() !== '');
    
    const locationValue = locationParts.length > 0 ? locationParts.join(', ') : data.location || null;

    // Prepare client data with address fields
    const cpfDigits = data.cpf?.replace(/\D/g, "") || null;
    const clientData: any = {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      cpf: cpfDigits || null,
      location: locationValue,
      status: data.status,
      avatar_initial: data.avatar_initial || null,
      image_url: filePath,
      // Save raw input fields for address normalization
      raw_input_country: "BR",
      raw_input_postal_code: data.zip_code || null,
      raw_input_line1: data.construction_address || null,
      raw_input_line2: data.address_complement || null,
      raw_input_district: data.neighborhood || null,
      raw_input_city: data.city || null,
      raw_input_region: data.state || null,
    };

    // Persist the stable storage path (filePath) to the DB, do NOT store signed URLs
    if (client) {
      await updateClient.mutateAsync({ 
        id: client.id, 
        ...clientData,
      });
    } else {
      await createClient.mutateAsync(clientData);
    }
    onOpenChange(false);
    form.reset();
    setImageFile(null);
    setImagePreview(null);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{client ? t("clients.editClient") : t("clients.newClient")}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("common.images.buildingImage")}</label>
              <div className="border-2 border-dashed rounded-lg p-4">
                {imagePreview ? (
                  <div className="relative">
                    <img 
                      src={imagePreview} 
                      alt={t("images.preview")} 
                      className="w-full h-48 object-cover rounded"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center gap-2 cursor-pointer">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {t("common.images.uploadBuildingImage")}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </label>
                )}
              </div>
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.formLabels.name")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.formLabels.email")}</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.formLabels.phone")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cpf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("clients.cpfLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("clients.cpfPlaceholder")}
                      value={field.value ? formatCPFOrCNPJ(field.value) : ""}
                      onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))}
                      maxLength={18}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address Fields */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">{t("cliente.address")}</h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="zip_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("cliente.label.postalCodeBR")}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            {...field} 
                            placeholder={t("cliente.placeholder.postalCodeBR")}
                            maxLength={9}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              if (value.length <= 8) {
                                field.onChange(value);
                              }
                            }}
                          />
                          {isLookingUpAddress && (
                            <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="construction_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("cliente.label.line1")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t("cliente.placeholder.line1")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="street_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("projects:streetNumberLabel") || "Number"}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t("projects:streetNumberPlaceholder") || "123"} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address_complement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("projects:addressComplementLabel") || "Complement"}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t("projects:addressComplementPlaceholder") || "Apartment, suite, etc."} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="neighborhood"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("cliente.label.district")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t("cliente.placeholder.district")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("cliente.label.city")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t("cliente.placeholder.city")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("cliente.label.region")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t("cliente.placeholder.region")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.formLabels.status")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Active">{t("common.statuses.active")}</SelectItem>
                      <SelectItem value="Inactive">{t("common.statuses.inactive")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="avatar_initial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.formLabels.avatarInitial")}</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={2} placeholder={t("common.placeholders.avatarInitial")} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 justify-between items-center mt-8 pt-4 border-t">
              {client && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="shrink-0"
                  onClick={async () => {
                     // Check if client can be deleted
                    const { canDelete, reason } = await checkClientCanDelete(client.id);
                    
                    if (!canDelete) {
                      toast({
                        title: t('clients.cannotDelete'),
                        description: reason,
                        variant: 'destructive',
                      });
                      return;
                    }

                    if (window.confirm(t('clients.deleteConfirm'))) {
                      await deleteClient.mutateAsync(client.id);
                      onOpenChange(false);
                    }
                  }}
                  title={t("common.delete")}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={uploading}>
                  {uploading ? t("common.uploading") : client ? t("common.update") : t("common.create")}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
