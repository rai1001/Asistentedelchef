
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingBasket, Save, ArrowLeft } from "lucide-react";
import { LoadingSpinner } from '@/components/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { addIngredientAction } from '../actions';

const formSchema = z.object({
  name: z.string().min(2, { message: "El nombre del ingrediente debe tener al menos 2 caracteres." }),
  category: z.string().optional(),
  unit: z.string().min(1, { message: "La unidad es requerida." }),
  costPerUnit: z.coerce.number().positive({ message: "El costo por unidad debe ser un número positivo." }),
  supplier: z.string().optional(),
  allergen: z.string().optional(),
  description: z.string().optional(),
  lowStockThreshold: z.coerce.number().nonnegative({ message: "El umbral debe ser cero o positivo." }).optional(),
  currentStock: z.coerce.number().nonnegative({ message: "El stock debe ser cero o positivo." }).optional(),
});

type IngredientFormValues = z.infer<typeof formSchema>;

export default function NewIngredientPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<IngredientFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: "",
      unit: "",
      costPerUnit: 0,
      supplier: "",
      allergen: "",
      description: "",
      lowStockThreshold: 0,
      currentStock: 0,
    },
  });

  async function onSubmit(values: IngredientFormValues) {
    console.log("[IngredientsPage] onSubmit triggered. Raw form values:", JSON.stringify(values));
    setIsLoading(true);
    console.log("[IngredientsPage] isLoading set to true.");
    try {
      console.log("[IngredientsPage] Calling addIngredientAction with values:", JSON.stringify(values));
      const result = await addIngredientAction(values);
      console.log("[IngredientsPage] addIngredientAction result:", JSON.stringify(result));
      if (result.success) {
        toast({
          title: "Ingrediente Creado",
          description: `El ingrediente "${values.name}" ha sido añadido con éxito.`,
        });
        router.push('/ingredients'); 
      } else {
        toast({
          title: "Error al crear ingrediente",
          description: result.error || "No se pudo guardar el ingrediente.",
          variant: "destructive",
        });
        console.error("[IngredientsPage] Error from addIngredientAction:", result.error);
      }
    } catch (error) {
      console.error("[IngredientsPage] Error in onSubmit function:", error);
      toast({
        title: "Error Inesperado en Formulario",
        description: "Ocurrió un error al procesar la solicitud. Revisa la consola para más detalles.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      console.log("[IngredientsPage] isLoading set to false (finally block).");
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Añadir Nuevo Ingrediente"
        icon={ShoppingBasket}
        description="Completa los detalles del nuevo ingrediente para tu biblioteca."
        actions={
          <Button variant="outline" asChild>
            <Link href="/ingredients">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Listado
            </Link>
          </Button>
        }
      />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Detalles del Ingrediente</CardTitle>
          <CardDescription>Proporciona la información completa del ingrediente.</CardDescription>
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
                      <FormLabel>Nombre del Ingrediente</FormLabel>
                      <FormControl><Input placeholder="Ej: Tomates Frescos" {...field} /></FormControl>
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
                      <FormControl><Input placeholder="Ej: Verduras, Especias" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidad de Medida</FormLabel>
                      <FormControl><Input placeholder="Ej: kg, L, unidad, g" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="costPerUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Costo por Unidad (€)</FormLabel>
                      <FormControl><Input type="number" step="0.01" placeholder="Ej: 2.50" {...field} /></FormControl>
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
                    <FormControl><Textarea placeholder="Describe brevemente el ingrediente..." className="min-h-[80px]" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="supplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proveedor (Opcional)</FormLabel>
                      <FormControl><Input placeholder="Ej: Proveedor Local Verduras" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="allergen"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alérgeno (Opcional)</FormLabel>
                      <FormControl><Input placeholder="Ej: gluten, lactosa, frutos secos" {...field} /></FormControl>
                      <FormDescription>Si aplica, indica el alérgeno principal.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="currentStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Actual (Opcional)</FormLabel>
                      <FormControl><Input type="number" step="0.1" placeholder="Ej: 10" {...field} /></FormControl>
                      <FormDescription>Cantidad actual en tu inventario.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lowStockThreshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Umbral Stock Bajo (Opcional)</FormLabel>
                      <FormControl><Input type="number" step="0.1" placeholder="Ej: 5" {...field} /></FormControl>
                      <FormDescription>Recibir alerta cuando el stock baje de este nivel.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
                  {isLoading ? <LoadingSpinner className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                  Guardar Ingrediente
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
