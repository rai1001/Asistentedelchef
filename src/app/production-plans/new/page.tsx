
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import * as z from "zod";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import type { Recipe } from "@/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ClipboardList, Save, ArrowLeft, CalendarIcon, PlusCircle, Trash2 } from "lucide-react";
import { LoadingSpinner } from '@/components/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { addProductionPlanAction, type ProductionPlanFormValues } from '../actions';
import { cn } from "@/lib/utils";

const productionPlanRecipeItemSchema = z.object({
  recipeId: z.string().min(1, "Debe seleccionar una receta."),
  recipeName: z.string().min(1, "El nombre de la receta es requerido."),
  targetQuantity: z.coerce.number().positive("La cantidad objetivo debe ser positiva."),
});

const productionPlanFormSchema = z.object({
  name: z.string().min(3, { message: "El nombre del plan debe tener al menos 3 caracteres." }),
  hotelName: z.string().min(2, { message: "El nombre del hotel debe tener al menos 2 caracteres." }),
  planDate: z.date({ required_error: "La fecha del plan es requerida." }),
  recipes: z.array(productionPlanRecipeItemSchema).min(1, { message: "Debe incluir al menos una receta en el plan." }),
  notes: z.string().optional(),
});


export default function NewProductionPlanPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [availableRecipes, setAvailableRecipes] = useState<Recipe[]>([]);

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const recipesCollection = collection(db, "recipes");
        const q = query(recipesCollection, orderBy("name", "asc"));
        const querySnapshot = await getDocs(q);
        const fetchedRecipes: Recipe[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as Recipe));
        setAvailableRecipes(fetchedRecipes);
      } catch (error) {
        console.error("Error fetching recipes for production plan form:", error);
        toast({
          title: "Error al cargar recetas",
          description: "No se pudieron cargar las recetas para el formulario.",
          variant: "destructive",
        });
      }
    };
    fetchRecipes();
  }, [toast]);

  const form = useForm<ProductionPlanFormValues>({
    resolver: zodResolver(productionPlanFormSchema),
    defaultValues: {
      name: "",
      hotelName: "",
      planDate: new Date(),
      recipes: [{ recipeId: "", recipeName: "", targetQuantity: 1 }],
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "recipes",
  });

  async function onSubmit(values: ProductionPlanFormValues) {
    setIsLoading(true);
    try {
      const result = await addProductionPlanAction(values);
      if (result.success) {
        toast({
          title: "Plan de Producción Creado",
          description: `El plan "${values.name}" ha sido añadido con éxito.`,
        });
        router.push('/production-plans'); 
      } else {
        toast({
          title: "Error al crear plan",
          description: result.error || "No se pudo guardar el plan de producción.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting production plan form:", error);
      toast({
        title: "Error Inesperado",
        description: "Ocurrió un error al procesar la solicitud.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Crear Nuevo Plan de Producción"
        icon={ClipboardList}
        description="Define los detalles y las recetas para tu nuevo plan de producción."
        actions={
          <Button variant="outline" asChild>
            <Link href="/production-plans">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Listado de Planes
            </Link>
          </Button>
        }
      />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Detalles del Plan de Producción</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Nombre del Plan</FormLabel>
                      <FormControl><Input placeholder="Ej: Plan de Almuerzo Lunes" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="planDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha del Plan</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: es })
                              ) : (
                                <span>Elige una fecha</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) && !form.getValues("planDate") }
                            initialFocus
                            locale={es}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="hotelName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Hotel/Ubicación</FormLabel>
                    <FormControl><Input placeholder="Ej: Gran Hotel Central" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div>
                <h3 className="text-lg font-medium mb-2">Recetas del Plan</h3>
                {fields.map((item, index) => (
                  <Card key={item.id} className="mb-4 p-4 space-y-3 shadow-sm border">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                       <FormField
                        control={form.control}
                        name={`recipes.${index}.recipeId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Receta</FormLabel>
                            <Select 
                              onValueChange={(value) => {
                                field.onChange(value);
                                const selectedRecipe = availableRecipes.find(r => r.id === value);
                                form.setValue(`recipes.${index}.recipeName`, selectedRecipe?.name || "");
                              }} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona una receta" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {availableRecipes.map((recipe) => (
                                  <SelectItem key={recipe.id} value={recipe.id}>
                                    {recipe.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`recipes.${index}.targetQuantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cantidad Objetivo</FormLabel>
                            <FormControl><Input type="number" placeholder="Ej: 50" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    {/* Hidden field for recipeName, populated when recipeId changes */}
                    <Controller
                        control={form.control}
                        name={`recipes.${index}.recipeName`}
                        render={({ field }) => <Input type="hidden" {...field} />}
                    />
                    <Button type="button" variant="destructive" size="sm" onClick={() => remove(index)} disabled={fields.length <= 1}>
                      <Trash2 className="mr-1 h-4 w-4" /> Quitar Receta
                    </Button>
                  </Card>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ recipeId: "", recipeName: "", targetQuantity: 1 })}
                  className="mt-2"
                  disabled={availableRecipes.length === 0}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Añadir Receta al Plan
                </Button>
                {availableRecipes.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-2">Cargando recetas o no hay recetas disponibles. Añade recetas primero.</p>
                )}
              </div>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas Adicionales (Opcional)</FormLabel>
                    <FormControl><Textarea placeholder="Cualquier detalle adicional sobre el plan..." className="min-h-[80px]" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isLoading || availableRecipes.length === 0} className="w-full md:w-auto">
                  {isLoading ? <LoadingSpinner className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                  Guardar Plan de Producción
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
