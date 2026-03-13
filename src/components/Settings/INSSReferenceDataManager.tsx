import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useINSSReferenceData } from "@/features/tax/hooks/useINSSReferenceData";
import { useUpdateINSSReference } from "@/features/tax/hooks/useUpdateINSSReference";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { useLocalization } from "@/contexts/LocalizationContext";
import { Edit2, Save, X, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function INSSReferenceDataManager() {
  const refData = useINSSReferenceData();
  const updateHooks = useUpdateINSSReference();
  const { t } = useLocalization();

  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>(null);

  if (refData.isLoading) {
    return <div className="p-8 text-center">{t("common.loading")}</div>;
  }

  const handleStartEdit = (section: string, data: any) => {
    setEditingSection(section);
    setEditFormData(JSON.parse(JSON.stringify(data))); // Deep copy
  };

  const handleCancelEdit = () => {
    setEditingSection(null);
    setEditFormData(null);
  };

  const handleSave = async (mutation: any) => {
    try {
      await mutation.mutateAsync(editFormData);
      toast.success(t("common.saveSuccess") || "Changes saved successfully");
      setEditingSection(null);
      setEditFormData(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to save changes");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">{t("settings:inssReference.title")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("settings:inssReference.description")}
          </p>
        </div>
        <Badge variant="outline">
          {t("settings:inssReference.lastUpdated")}: {refData.rates ? format(new Date(refData.rates.effective_from), "dd/MM/yyyy") : "N/A"}
        </Badge>
      </div>

      <Tabs defaultValue="rates" variant="pill" className="space-y-4">
        <TabsList className="grid grid-cols-4 lg:grid-cols-8 gap-2 h-auto p-1">
          <TabsTrigger value="rates">{t("settings:inssReference.tabs.rates")}</TabsTrigger>
          <TabsTrigger value="fatorSocial">{t("settings:inssReference.tabs.fatorSocial")}</TabsTrigger>
          <TabsTrigger value="categories">{t("settings:inssReference.tabs.categories")}</TabsTrigger>
          <TabsTrigger value="labor">{t("settings:inssReference.tabs.labor")}</TabsTrigger>
          <TabsTrigger value="destinations">{t("settings:inssReference.tabs.equivalence")}</TabsTrigger>
          <TabsTrigger value="fatorAjuste">{t("settings:inssReference.tabs.ajuste")}</TabsTrigger>
          <TabsTrigger value="prefab">{t("settings:inssReference.tabs.prefab")}</TabsTrigger>
          <TabsTrigger value="usinados">{t("settings:inssReference.tabs.usinados")}</TabsTrigger>
        </TabsList>

        {/* RATES TAB */}
        <TabsContent value="rates">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>{t("settings:inssReference.ratesTitle")}</CardTitle>
                <CardDescription>{t("settings:inssReference.ratesDescription")}</CardDescription>
              </div>
              {!editingSection && refData.rates && (
                <Button variant="outline" size="sm" onClick={() => handleStartEdit('rates', refData.rates)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  {t("common.edit")}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editingSection === 'rates' ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t("settings:inssReference.labels.patronalRateDecimal")}</Label>
                    <Input 
                      type="number" step="0.001" 
                      value={editFormData.patronal_rate} 
                      onChange={(e) => setEditFormData({...editFormData, patronal_rate: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("settings:inssReference.labels.ratGilratDecimal")}</Label>
                    <Input 
                      type="number" step="0.001" 
                      value={editFormData.sat_gilrat_rate} 
                      onChange={(e) => setEditFormData({...editFormData, sat_gilrat_rate: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("settings:inssReference.labels.terceirosDecimal")}</Label>
                    <Input 
                      type="number" step="0.001" 
                      value={editFormData.terceiros_rate} 
                      onChange={(e) => setEditFormData({...editFormData, terceiros_rate: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("settings:inssReference.labels.adicionalRatDecimal")}</Label>
                    <Input 
                      type="number" step="0.001" 
                      value={editFormData.additional_rate} 
                      onChange={(e) => setEditFormData({...editFormData, additional_rate: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("settings:inssReference.labels.totalRateDecimal")}</Label>
                    <Input 
                      type="number" step="0.001" 
                      value={editFormData.total_rate} 
                      onChange={(e) => setEditFormData({...editFormData, total_rate: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("settings:inssReference.table.component")}</TableHead>
                      <TableHead>{t("settings:inssReference.table.value")}</TableHead>
                      <TableHead>{t("settings:inssReference.table.description")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">{t("settings:inssReference.labels.patronalRate")}</TableCell>
                      <TableCell>{(refData.rates?.patronal_rate * 100 || 0).toFixed(1)}%</TableCell>
                      <TableCell>{t("settings:inssReference.ratesDescriptionPatronal")}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">{t("settings:inssReference.labels.ratGilrat")}</TableCell>
                      <TableCell>{(refData.rates?.sat_gilrat_rate * 100 || 0).toFixed(1)}%</TableCell>
                      <TableCell>{t("settings:inssReference.ratesDescriptionRatGilrat")}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">{t("settings:inssReference.labels.terceiros")}</TableCell>
                      <TableCell>{(refData.rates?.terceiros_rate * 100 || 0).toFixed(1)}%</TableCell>
                      <TableCell>{t("settings:inssReference.ratesDescriptionTerceiros")}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">{t("settings:inssReference.labels.adicionalRat")}</TableCell>
                      <TableCell>{(refData.rates?.additional_rate * 100 || 0).toFixed(1)}%</TableCell>
                      <TableCell>{t("settings:inssReference.ratesDescriptionAdicionalRat")}</TableCell>
                    </TableRow>
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>{t("settings:inssReference.table.total")}</TableCell>
                      <TableCell>{(refData.rates?.total_rate * 100 || 0).toFixed(1)}%</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
            {editingSection === 'rates' && (
              <CardFooter className="flex justify-end gap-2 border-t pt-6">
                <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                  <X className="h-4 w-4 mr-2" />
                  {t("common.cancel")}
                </Button>
                <Button size="sm" onClick={() => handleSave(updateHooks.updateRates)} disabled={updateHooks.updateRates.isPending}>
                  {updateHooks.updateRates.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  {t("common.save")}
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        {/* FATOR SOCIAL TAB */}
        <TabsContent value="fatorSocial">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>{t("settings:inssReference.fatorSocialTitle")}</CardTitle>
                <CardDescription>{t("settings:inssReference.fatorSocialDescription")}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("settings:inssReference.table.areaRange")}</TableHead>
                    <TableHead>{t("settings:inssReference.table.multiplier")}</TableHead>
                    <TableHead>{t("settings:inssReference.table.effectiveReduction")}</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refData.fatorSocialBrackets.map((bracket) => (
                    <TableRow key={bracket.id}>
                      <TableCell>
                        {editingSection === `fatorSocial_${bracket.id}` ? (
                          <div className="flex items-center gap-2">
                            <Input 
                              type="number" className="w-24 h-8"
                              value={editFormData.area_min} 
                              onChange={(e) => setEditFormData({...editFormData, area_min: parseFloat(e.target.value)})}
                            />
                            <span>-</span>
                            <Input 
                              type="number" className="w-24 h-8"
                              value={editFormData.area_max} 
                              onChange={(e) => setEditFormData({...editFormData, area_max: parseFloat(e.target.value)})}
                            />
                          </div>
                        ) : (
                          <>{bracket.area_min === 0 ? t("settings:inssReference.upTo") : `${bracket.area_min.toFixed(2)} -`} {bracket.area_max > 100000 ? "" : bracket.area_max.toFixed(2)} m²</>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingSection === `fatorSocial_${bracket.id}` ? (
                          <Input 
                            type="number" step="0.01" className="w-24 h-8"
                            value={editFormData.fator_social} 
                            onChange={(e) => setEditFormData({...editFormData, fator_social: parseFloat(e.target.value)})}
                          />
                        ) : (
                          bracket.fator_social.toFixed(2)
                        )}
                      </TableCell>
                      <TableCell className="text-green-600 font-medium">
                        {((1 - (editingSection === `fatorSocial_${bracket.id}` ? editFormData.fator_social : bracket.fator_social)) * 100).toFixed(0)}%
                      </TableCell>
                      <TableCell>
                        {editingSection === `fatorSocial_${bracket.id}` ? (
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleSave(updateHooks.updateFatorSocial)}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={handleCancelEdit}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleStartEdit(`fatorSocial_${bracket.id}`, bracket)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PREFAB TAB */}
        <TabsContent value="prefab">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>{t("settings:inssReference.prefabTitle")}</CardTitle>
                <CardDescription>{t("settings:inssReference.prefabDescription")}</CardDescription>
              </div>
              {!editingSection && refData.prefabRules && (
                <Button variant="outline" size="sm" onClick={() => handleStartEdit('prefab', refData.prefabRules)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  {t("common.edit")}
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {editingSection === 'prefab' ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t("settings:inssReference.labels.minInvoices")} (%)</Label>
                    <Input 
                      type="number" 
                      value={editFormData.min_invoice_pct_of_cod} 
                      onChange={(e) => setEditFormData({...editFormData, min_invoice_pct_of_cod: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("settings:inssReference.labels.applicableReduction")} (%)</Label>
                    <Input 
                      type="number" 
                      value={editFormData.reduction_pct} 
                      onChange={(e) => setEditFormData({...editFormData, reduction_pct: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label>{t("settings:inssReference.labels.excludedItems")} (comma separated)</Label>
                    <Input 
                      value={editFormData.excluded_items.join(", ")} 
                      onChange={(e) => setEditFormData({...editFormData, excluded_items: e.target.value.split(",").map(s => s.trim())})}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm font-medium text-muted-foreground uppercase">{t("settings:inssReference.labels.minInvoices")}</p>
                      <p className="text-2xl font-bold">{refData.prefabRules?.min_invoice_pct_of_cod}%</p>
                    </div>
                    <div className="p-4 border rounded-lg bg-green-50">
                      <p className="text-sm font-medium text-green-800 uppercase">{t("settings:inssReference.labels.applicableReduction")}</p>
                      <p className="text-2xl font-bold text-green-700">{refData.prefabRules?.reduction_pct}%</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">{t("settings:inssReference.labels.excludedItems")}:</h4>
                    <div className="flex flex-wrap gap-2">
                      {refData.prefabRules?.excluded_items.map((item) => (
                        <Badge key={item} variant="secondary">{item}</Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
            {editingSection === 'prefab' && (
              <CardFooter className="flex justify-end gap-2 border-t pt-6">
                <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                  <X className="h-4 w-4 mr-2" />
                  {t("common.cancel")}
                </Button>
                <Button size="sm" onClick={() => handleSave(updateHooks.updatePrefabRule)} disabled={updateHooks.updatePrefabRule.isPending}>
                  {updateHooks.updatePrefabRule.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  {t("common.save")}
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        {/* USINADOS TAB */}
        <TabsContent value="usinados">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>{t("settings:inssReference.usinadosTitle")}</CardTitle>
                <CardDescription>{t("settings:inssReference.usinadosDescription")}</CardDescription>
              </div>
              {!editingSection && refData.usinadosRules && (
                <Button variant="outline" size="sm" onClick={() => handleStartEdit('usinados', refData.usinadosRules)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  {t("common.edit")}
                </Button>
              )}
            </CardHeader>
            <CardContent>
               {editingSection === 'usinados' ? (
                 <div className="grid gap-4 max-w-md">
                   <div className="space-y-2">
                     <Label>{t("settings:inssReference.labels.fixedDeduction")} (%)</Label>
                     <Input 
                       type="number" 
                       value={editFormData.deduction_pct_of_cod} 
                       onChange={(e) => setEditFormData({...editFormData, deduction_pct_of_cod: parseFloat(e.target.value)})}
                     />
                   </div>
                   <div className="space-y-2">
                     <Label>{t("settings:inssReference.labels.appliesTo")} (comma separated)</Label>
                     <Input 
                       value={editFormData.applies_to.join(", ")} 
                       onChange={(e) => setEditFormData({...editFormData, applies_to: e.target.value.split(",").map(s => s.trim())})}
                     />
                   </div>
                 </div>
               ) : (
                 <>
                   <div className="p-4 border rounded-lg bg-blue-50 max-w-md">
                      <p className="text-sm font-medium text-blue-800 uppercase">{t("settings:inssReference.labels.fixedDeduction")}</p>
                      <p className="text-2xl font-bold text-blue-700">{refData.usinadosRules?.deduction_pct_of_cod}%</p>
                      <p className="text-xs text-blue-600 mt-2 italic">{t("settings:inssReference.labels.usinadosNote")}</p>
                    </div>
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">{t("settings:inssReference.labels.appliesTo")}:</h4>
                      <div className="flex flex-wrap gap-2">
                        {refData.usinadosRules?.applies_to.map((item) => (
                          <Badge key={item} variant="outline" className="capitalize">
                            {item.replace("_", " ")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                 </>
               )}
            </CardContent>
            {editingSection === 'usinados' && (
              <CardFooter className="flex justify-end gap-2 border-t pt-6">
                <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                  <X className="h-4 w-4 mr-2" />
                  {t("common.cancel")}
                </Button>
                <Button size="sm" onClick={() => handleSave(updateHooks.updateUsinadosRule)} disabled={updateHooks.updateUsinadosRule.isPending}>
                  {updateHooks.updateUsinadosRule.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  {t("common.save")}
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        {/* OTHER TABS (Categories, Labor, Destinations, Ajuste) */}
        {/* For these I will implement row-based editing similar to Fator Social */}

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings:inssReference.categoriesTitle")}</CardTitle>
              <CardDescription>{t("settings:inssReference.categoriesDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("settings:inssReference.table.category")}</TableHead>
                    <TableHead>{t("settings:inssReference.table.multiplier")}</TableHead>
                    <TableHead>{t("settings:inssReference.table.reduction")}</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.values(refData.categoryReductions).map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium">{cat.category_name_en}</TableCell>
                      <TableCell>
                        {editingSection === `cat_${cat.id}` ? (
                          <Input 
                            type="number" step="0.01" className="w-24 h-8"
                            value={editFormData.multiplier} 
                            onChange={(e) => setEditFormData({...editFormData, multiplier: parseFloat(e.target.value)})}
                          />
                        ) : (
                          cat.multiplier.toFixed(2)
                        )}
                      </TableCell>
                      <TableCell>
                        {editingSection === `cat_${cat.id}` ? (
                          <Input 
                            type="number" className="w-24 h-8"
                            value={editFormData.reduction_percentage} 
                            onChange={(e) => setEditFormData({...editFormData, reduction_percentage: parseFloat(e.target.value)})}
                          />
                        ) : (
                          <>{cat.reduction_percentage}%</>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingSection === `cat_${cat.id}` ? (
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleSave(updateHooks.updateCategoryReduction)}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={handleCancelEdit}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleStartEdit(`cat_${cat.id}`, cat)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="labor">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings:inssReference.laborTitle")}</CardTitle>
              <CardDescription>{t("settings:inssReference.laborDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("settings:inssReference.table.constructionType")}</TableHead>
                    <TableHead>{t("settings:inssReference.table.percentage")}</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.values(refData.laborPercentages).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.construction_type_name_en}</TableCell>
                      <TableCell>
                        {editingSection === `labor_${item.id}` ? (
                          <Input 
                            type="number" className="w-24 h-8"
                            value={editFormData.labor_percentage} 
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setEditFormData({...editFormData, labor_percentage: val, labor_decimal: val / 100});
                            }}
                          />
                        ) : (
                          <>{item.labor_percentage}%</>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingSection === `labor_${item.id}` ? (
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleSave(updateHooks.updateLaborPercentage)}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={handleCancelEdit}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleStartEdit(`labor_${item.id}`, item)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="destinations">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings:inssReference.destinationsTitle")}</CardTitle>
              <CardDescription>{t("settings:inssReference.destinationsDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("settings:inssReference.table.destination")}</TableHead>
                    <TableHead>{t("settings:inssReference.table.equivalence")}</TableHead>
                    <TableHead>{t("settings:inssReference.table.specialRules")}</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.values(refData.destinationFactors).map((dest) => (
                    <TableRow key={dest.id}>
                      <TableCell className="font-medium">{dest.destination_name_en}</TableCell>
                      <TableCell>
                        {editingSection === `dest_${dest.id}` ? (
                          <Input 
                            type="number" step="0.01" className="w-24 h-8"
                            value={editFormData.equivalence_factor} 
                            onChange={(e) => setEditFormData({...editFormData, equivalence_factor: parseFloat(e.target.value)})}
                          />
                        ) : (
                          dest.equivalence_factor.toFixed(2)
                        )}
                      </TableCell>
                      <TableCell>
                        {editingSection === `dest_${dest.id}` ? (
                          <div className="flex items-center gap-2">
                            <Input 
                              type="number" placeholder={t("settings:inssReference.placeholders.reductionPct")} className="w-20 h-8"
                              value={editFormData.special_reduction_pct || ""} 
                              onChange={(e) => setEditFormData({...editFormData, special_reduction_pct: parseFloat(e.target.value)})}
                            />
                            <Input 
                              type="number" placeholder={t("settings:inssReference.placeholders.limit")} className="w-20 h-8"
                              value={editFormData.area_limit || ""} 
                              onChange={(e) => setEditFormData({...editFormData, area_limit: parseFloat(e.target.value)})}
                            />
                          </div>
                        ) : (
                          <>
                            {dest.special_reduction_pct ? t("settings:inssReference.reductionSuffix", { pct: dest.special_reduction_pct }) : t("settings:inssReference.specialRulesNone")}
                            {dest.area_limit ? ` (${t("settings:inssReference.upToArea", { area: dest.area_limit })})` : ""}
                          </>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingSection === `dest_${dest.id}` ? (
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleSave(updateHooks.updateDestinationFactor)}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={handleCancelEdit}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleStartEdit(`dest_${dest.id}`, dest)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fatorAjuste">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings:inssReference.fatorAjusteTitle")}</CardTitle>
              <CardDescription>{t("settings:inssReference.fatorAjusteDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("settings:inssReference.table.areaThreshold")}</TableHead>
                    <TableHead>{t("settings:inssReference.table.minRemuneration")}</TableHead>
                    <TableHead>{t("settings:inssReference.table.maxReduction")}</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refData.fatorAjusteRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        {editingSection === `ajuste_${rule.id}` ? (
                          <Input 
                            type="number" className="w-24 h-8"
                            value={editFormData.area_threshold} 
                            onChange={(e) => setEditFormData({...editFormData, area_threshold: parseFloat(e.target.value)})}
                          />
                        ) : (
                          <>{t("settings:inssReference.upTo")} {rule.area_threshold} m²</>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingSection === `ajuste_${rule.id}` ? (
                          <Input 
                            type="number" className="w-24 h-8"
                            value={editFormData.min_remuneration_pct} 
                            onChange={(e) => setEditFormData({...editFormData, min_remuneration_pct: parseFloat(e.target.value)})}
                          />
                        ) : (
                          <>{rule.min_remuneration_pct}% {t("settings:inssReference.ofRmt")}</>
                        )}
                      </TableCell>
                      <TableCell className="text-green-600 font-bold">
                        {editingSection === `ajuste_${rule.id}` ? (
                          <Input 
                            type="number" className="w-24 h-8"
                            value={editFormData.max_reduction_pct} 
                            onChange={(e) => setEditFormData({...editFormData, max_reduction_pct: parseFloat(e.target.value)})}
                          />
                        ) : (
                          <>{rule.max_reduction_pct}%</>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingSection === `ajuste_${rule.id}` ? (
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleSave(updateHooks.updateFatorAjusteRule)}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={handleCancelEdit}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleStartEdit(`ajuste_${rule.id}`, rule)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
