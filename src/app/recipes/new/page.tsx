
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { db } from "@/lib/firebase/config";
import { collection, getDocs } from "firebase/firestore";
import type { Ingredient } from "@/types";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpenText, Save, ArrowLeft, PlusCircle, Trash2 } from "lucide-react";
import { LoadingSpinner } from '@/components/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { addRecipeAction, type RecipeFormValues } from '../actions';

const recipeFormSchema = z.object({
  name: z.string().min(3, { message: "El nombre de la receta debe tener al menos 3 caracteres." }),
  category: z.string().optional(),
  prepTime: z.coerce.number().int().nonnegative("El tiempo de preparación debe ser un número positivo o cero.").optional(),
  cuisine: z.string().optional(),
  instructions: z.string().min(10, { message: "Las instrucciones deben tener al menos 10 caracteres." }),
  imageUrl: z.string().url({ message: "Introduce una URL válida para la imagen." }).optional().or(z.literal('')),
  dietaryTags: z.string().optional(),
  ingredients: z.array(z.object({
    ingredientId: z.string().min(1, "Se debe seleccionar un ingrediente."),
    quantity: z.coerce.number().positive("La cantidad debe ser positiva."),
    unit: z.string().min(1, "La unidad es requerida para el ingrediente."),
  })).min(1, "La receta debe tener al menos un ingrediente."),
});

export default function NewRecipePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);

  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        const ingredientsCollection = collection(db, "ingredients");
        const querySnapshot = await getDocs(ingredientsCollection);
        const fetchedIngredients: Ingredient[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as Ingredient));
        setAvailableIngredients(fetchedIngredients);
      } catch (error) {
        console.error("Error fetching ingredients for recipe form:", error);
        toast({
          title: "Error al cargar ingredientes",
          description: "No se pudieron cargar los ingredientes para el formulario.",
          variant: "destructive",
        });
      }
    };
    fetchIngredients();
  }, [toast]);

  const form = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: {
      name: "",
      category: "",
      prepTime: 0,
      cuisine: "",
      instructions: "",
      imageUrl: "",
      dietaryTags: "",
      ingredients: [{ ingredientId: "", quantity: 1, unit: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "ingredients",
  });

  async function onSubmit(values: RecipeFormValues) {
    setIsLoading(true);
    try {
      const result = await addRecipeAction(values);
      if (result.success) {
        toast({
          title: "Receta Creada",
          description: `La receta "${values.name}" ha sido añadida con éxito. Costo estimado: €${(await getRecipeCost(result.recipeId!)).toFixed(2)}`,
        });
        router.push('/recipes'); 
      } else {
        toast({
          title: "Error al crear receta",
          description: result.error || "No se pudo guardar la receta.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting recipe form:", error);
      toast({
        title: "Error Inesperado",
        description: "Ocurrió un error al procesar la solicitud.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  // Helper function to re-fetch recipe cost after creation for toast.
  // This is illustrative; in a real app, the action might return the cost.
  async function getRecipeCost(recipeId: string): Promise<number> {
    const recipeDoc = await getDoc(doc(db, "recipes", recipeId));
    return recipeDoc.exists() ? (recipeDoc.data() as Recipe).cost || 0 : 0;
  }


  return (
    <div className="space-y-8">
      <PageHeader
        title="Añadir Nueva Receta"
        icon={BookOpenText}
        description="Completa los detalles de la nueva receta."
        actions={
          <Button variant="outline" asChild>
            <Link href="/recipes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Listado de Recetas
            </Link>
          </Button>
        }
      />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Detalles de la Receta</CardTitle>
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
                      <FormLabel>Nombre de la Receta</FormLabel>
                      <FormControl><Input placeholder="Ej: Paella Valenciana" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría (Opcional)</FormLabel>
                      <FormControl><Input placeholder="Ej: Plato Principal, Entrante" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="prepTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tiempo Prep. (min)</FormLabel>
                      <FormControl><Input type="number" placeholder="Ej: 60" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cuisine"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Cocina (Opcional)</FormLabel>
                      <FormControl><Input placeholder="Ej: Española, Italiana" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL de Imagen (Opcional)</FormLabel>
                      <FormControl><Input placeholder="https://placehold.co/..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                  control={form.control}
                  name="dietaryTags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Etiquetas Dietéticas (Opcional)</FormLabel>
                      <FormControl><Input placeholder="Ej: vegetariana, sin gluten, vegana" {...field} /></FormControl>
                      <FormDescription>Separadas por comas.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              <FormField
                control={form.control}
                name="instructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instrucciones</FormLabel>
                    <FormControl><Textarea placeholder="Describe los pasos de preparación..." className="min-h-[120px]" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <h3 className="text-lg font-medium mb-2">Ingredientes de la Receta</h3>
                {fields.map((item, index) => (
                  <Card key={item.id} className="mb-4 p-4 space-y-3 shadow-sm border">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                      <FormField
                        control={form.control}
                        name={`ingredients.${index}.ingredientId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ingrediente</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona un ingrediente" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {availableIngredients.map((ing) => (
                                  <SelectItem key={ing.id} value={ing.id}>
                                    {ing.name} ({ing.unit})
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
                        name={`ingredients.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cantidad</FormLabel>
                            <FormControl><Input type="number" step="0.01" placeholder="Ej: 100" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`ingredients.${index}.unit`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unidad Receta</FormLabel>
                            <FormControl><Input placeholder="Ej: g, ml, unidades" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button type="button" variant="destructive" size="sm" onClick={() => remove(index)} disabled={fields.length <= 1}>
                      <Trash2 className="mr-1 h-4 w-4" /> Quitar Ingrediente
                    </Button>
                  </Card>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ ingredientId: "", quantity: 1, unit: "" })}
                  className="mt-2"
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Añadir Otro Ingrediente
                </Button>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isLoading || availableIngredients.length === 0} className="w-full md:w-auto">
                  {isLoading ? <LoadingSpinner className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                  Guardar Receta
                </Button>
              </div>
               {availableIngredients.length === 0 && !isLoading && (
                <p className="text-sm text-destructive text-center mt-2">No hay ingredientes disponibles para añadir a la receta. Por favor, añade ingredientes primero.</p>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

