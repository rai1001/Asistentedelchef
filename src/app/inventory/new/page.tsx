
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import type { Ingredient } from "@/types";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Archive, Save, ArrowLeft } from "lucide-react";
import { LoadingSpinner } from '@/components/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { addInventoryItemAction } from '../actions';

const inventoryItemFormSchema = z.object({
  ingredientId: z.string().min(1, { message: "Debe seleccionar un ingrediente." }),
  hotelName: z.string().min(2, { message: "El nombre del hotel debe tener al menos 2 caracteres." }),
  currentStock: z.coerce.number().nonnegative({ message: "El stock actual no puede ser negativo." }),
  averageCostPerUnit: z.coerce.number().nonnegative({ message: "El costo promedio no puede ser negativo." }).optional(),
});

type InventoryItemFormValues = z.infer<typeof inventoryItemFormSchema>;

export default function NewInventoryItemPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);

  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        const ingredientsCollection = collection(db, "ingredients");
        const q = query(ingredientsCollection, orderBy("name", "asc"));
        const querySnapshot = await getDocs(q);
        const fetchedIngredients: Ingredient[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as Ingredient));
        setAvailableIngredients(fetchedIngredients);
      } catch (error) {
        console.error("Error fetching ingredients for inventory form:", error);
        toast({
          title: "Error al cargar ingredientes",
          description: "No se pudieron cargar los ingredientes para el formulario.",
          variant: "destructive",
        });
      }
    };
    fetchIngredients();
  }, [toast]);

  const form = useForm<InventoryItemFormValues>({
    resolver: zodResolver(inventoryItemFormSchema),
    defaultValues: {
      ingredientId: "",
      hotelName: "",
      currentStock: 0,
      averageCostPerUnit: 0,
    },
  });

  async function onSubmit(values: InventoryItemFormValues) {
    setIsLoading(true);
    try {
      const result = await addInventoryItemAction(values);
      if (result.success) {
        const selectedIngredient = availableIngredients.find(ing => ing.id === values.ingredientId);
        toast({
          title: "Artículo de Inventario Creado",
          description: `El artículo "${selectedIngredient?.name || 'Ingrediente desconocido'}" para ${values.hotelName} ha sido añadido.`,
        });
        router.push('/inventory'); 
      } else {
        toast({
          title: "Error al crear artículo",
          description: result.error || "No se pudo guardar el artículo de inventario.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting form:", error);
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
        title="Añadir Nuevo Artículo al Inventario"
        icon={Archive}
        description="Vincula un ingrediente de tu biblioteca a un hotel y especifica el stock inicial."
        actions={
          <Button variant="outline" asChild>
            <Link href="/inventory">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Inventario
            </Link>
          </Button>
        }
      />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Detalles del Artículo de Inventario</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="ingredientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ingrediente</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un ingrediente de la biblioteca" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableIngredients.length === 0 && <SelectItem value="" disabled>Cargando ingredientes...</SelectItem>}
                        {availableIngredients.map((ing) => (
                          <SelectItem key={ing.id} value={ing.id}>
                            {ing.name} (Unidad base: {ing.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Elige un ingrediente preexistente de tu biblioteca.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hotelName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Hotel</FormLabel>
                    <FormControl><Input placeholder="Ej: Gran Hotel Sol" {...field} /></FormControl>
                    <FormDescription>
                      El hotel o ubicación donde se encuentra este stock.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="currentStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Actual Inicial</FormLabel>
                      <FormControl><Input type="number" step="0.01" placeholder="Ej: 100" {...field} /></FormControl>
                      <FormDescription>
                        La cantidad inicial de este ingrediente en este hotel.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="averageCostPerUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Costo Promedio por Unidad (€) (Opcional)</FormLabel>
                      <FormControl><Input type="number" step="0.01" placeholder="Ej: 2.50" {...field} /></FormControl>
                      <FormDescription>
                        Costo inicial. Se actualizará con las compras. La unidad es la del ingrediente base.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isLoading || availableIngredients.length === 0} className="w-full md:w-auto">
                  {isLoading ? <LoadingSpinner className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                  Guardar Artículo en Inventario
                </Button>
              </div>
              {availableIngredients.length === 0 && !isLoading && (
                <p className="text-sm text-destructive text-center mt-2">
                  No hay ingredientes disponibles en la biblioteca para añadir al inventario. Por favor, añade ingredientes primero.
                </p>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
