
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LayoutList, Save, ArrowLeft, CalendarIcon, DollarSign } from "lucide-react";
import { LoadingSpinner } from '@/components/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { addMenuAction, type MenuFormValues } from '../actions';
import { cn } from "@/lib/utils";


const menuFormSchema = z.object({
  name: z.string().min(3, { message: "El nombre del menú debe tener al menos 3 caracteres." }),
  description: z.string().optional(),
  hotel: z.string().optional(),
  period: z.enum(['daily', 'weekly', 'monthly', 'event', 'other'], {
    required_error: "Selecciona un período.",
    errorMap: () => ({ message: "Selecciona un período válido." })
  }),
  startDate: z.date({ required_error: "La fecha de inicio es requerida." }),
  endDate: z.date().optional(),
  recipeIds: z.array(z.string()).min(1, { message: "Debes seleccionar al menos una receta." }),
  sellingPrice: z.coerce.number().positive({ message: "El precio de venta debe ser un número positivo." }).optional(),
}).refine(data => {
    if (data.endDate && data.startDate && data.endDate < data.startDate) {
        return false;
    }
    return true;
}, {
    message: "La fecha de fin no puede ser anterior a la fecha de inicio.",
    path: ["endDate"],
});


export default function NewMenuPage() {
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
        console.error("Error fetching recipes for menu form:", error);
        toast({
          title: "Error al cargar recetas",
          description: "No se pudieron cargar las recetas para el formulario.",
          variant: "destructive",
        });
      }
    };
    fetchRecipes();
  }, [toast]);

  const form = useForm<MenuFormValues>({
    resolver: zodResolver(menuFormSchema),
    defaultValues: {
      name: "",
      description: "",
      hotel: "",
      recipeIds: [],
      sellingPrice: 0,
      // startDate will be undefined initially, user must pick
    },
  });

  async function onSubmit(values: MenuFormValues) {
    setIsLoading(true);
    try {
      const result = await addMenuAction(values);
      if (result.success) {
        toast({
          title: "Menú Creado",
          description: `El menú "${values.name}" ha sido añadido con éxito.`,
        });
        router.push('/menus'); 
      } else {
        toast({
          title: "Error al crear menú",
          description: result.error || "No se pudo guardar el menú.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting menu form:", error);
      toast({
        title: "Error Inesperado",
        description: "Ocurrió un error al procesar la solicitud.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const selectedRecipeDetails = form.watch("recipeIds")
    .map(id => availableRecipes.find(r => r.id === id))
    .filter(Boolean) as Recipe[];
  
  const estimatedTotalCost = selectedRecipeDetails.reduce((sum, recipe) => sum + (recipe.cost || 0), 0);


  return (
    <div className="space-y-8">
      <PageHeader
        title="Crear Nuevo Menú"
        icon={LayoutList}
        description="Define los detalles y las recetas para tu nuevo menú."
        actions={
          <Button variant="outline" asChild>
            <Link href="/menus">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Listado de Menús
            </Link>
          </Button>
        }
      />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Detalles del Menú</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Menú</FormLabel>
                      <FormControl><Input placeholder="Ej: Menú Degustación de Verano" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hotel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hotel (Opcional)</FormLabel>
                      <FormControl><Input placeholder="Ej: Gran Hotel Central" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción (Opcional)</FormLabel>
                    <FormControl><Textarea placeholder="Describe brevemente el menú..." className="min-h-[80px]" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="period"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Período</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un período" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="daily">Diario</SelectItem>
                          <SelectItem value="weekly">Semanal</SelectItem>
                          <SelectItem value="monthly">Mensual</SelectItem>
                          <SelectItem value="event">Evento Especial</SelectItem>
                          <SelectItem value="other">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha de Inicio</FormLabel>
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
                            disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) && !form.getValues("startDate")} // Allow past dates if already selected, otherwise only future
                            initialFocus
                            locale={es}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha de Fin (Opcional)</FormLabel>
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
                            disabled={(date) =>
                              form.getValues("startDate") ? date < form.getValues("startDate") : date < new Date(new Date().setHours(0,0,0,0)) 
                            }
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
                name="sellingPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio de Venta (€) (Opcional)</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="Ej: 45.00" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recipeIds"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Recetas del Menú</FormLabel>
                      <FormDescription>
                        Selecciona las recetas que formarán parte de este menú.
                      </FormDescription>
                    </div>
                    {availableRecipes.length === 0 && (
                        <p className="text-sm text-muted-foreground">No hay recetas disponibles. Añade recetas primero.</p>
                    )}
                    <ScrollArea className="h-72 w-full rounded-md border">
                        <div className="p-4">
                        {availableRecipes.map((recipe) => (
                            <FormField
                            key={recipe.id}
                            control={form.control}
                            name="recipeIds"
                            render={({ field }) => {
                                return (
                                <FormItem
                                    key={recipe.id}
                                    className="flex flex-row items-start space-x-3 space-y-0 py-2 border-b last:border-b-0"
                                >
                                    <FormControl>
                                    <Checkbox
                                        checked={field.value?.includes(recipe.id)}
                                        onCheckedChange={(checked) => {
                                        return checked
                                            ? field.onChange([...(field.value || []), recipe.id])
                                            : field.onChange(
                                                (field.value || []).filter(
                                                (value) => value !== recipe.id
                                                )
                                            );
                                        }}
                                    />
                                    </FormControl>
                                    <FormLabel className="font-normal w-full cursor-pointer">
                                        <div className="flex justify-between items-center">
                                            <span>{recipe.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                                Costo: €{recipe.cost?.toFixed(2) || 'N/A'}
                                            </span>
                                        </div>
                                        {recipe.category && <p className="text-xs text-muted-foreground">{recipe.category}</p>}
                                    </FormLabel>
                                </FormItem>
                                );
                            }}
                            />
                        ))}
                        </div>
                    </ScrollArea>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Card className="mt-6 bg-muted/50">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-headline flex items-center">
                        <DollarSign className="mr-2 h-5 w-5 text-primary"/>
                        Resumen de Costos del Menú
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span>Número de recetas seleccionadas:</span>
                            <span>{selectedRecipeDetails.length}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                            <span>Costo Total Estimado de Recetas:</span>
                            <span>€{estimatedTotalCost.toFixed(2)}</span>
                        </div>
                         {form.getValues("sellingPrice") && form.getValues("sellingPrice")! > 0 && (
                            <>
                            <div className="flex justify-between">
                                <span>Precio de Venta Ingresado:</span>
                                <span>€{form.getValues("sellingPrice")?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-primary">
                                <span>Beneficio Bruto Estimado:</span>
                                <span>€{(form.getValues("sellingPrice")! - estimatedTotalCost).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-primary/80">
                                <span>Margen Bruto Estimado:</span>
                                <span>{(((form.getValues("sellingPrice")! - estimatedTotalCost) / form.getValues("sellingPrice")!) * 100).toFixed(1)}%</span>
                            </div>
                            </>
                        )}
                    </div>
                </CardContent>
              </Card>
              
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isLoading || availableRecipes.length === 0} className="w-full md:w-auto">
                  {isLoading ? <LoadingSpinner className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                  Guardar Menú
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
