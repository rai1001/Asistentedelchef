"use client";

import React, { useState } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Wand2, Utensils, Clock, ShoppingBag } from "lucide-react";
import { adaptRecipe, type AdaptRecipeOutput } from '@/ai/flows/adapt-recipe';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  recipeName: z.string().min(3, { message: "El nombre de la receta es requerido." }),
  originalRecipe: z.string().min(20, { message: "Describe la receta original con más detalle." }),
  dietaryRestrictions: z.string().min(3, { message: "Especifica al menos una restricción o preferencia." }),
  maxPrepTime: z.coerce.number().positive({ message: "El tiempo de preparación debe ser positivo." }),
  maxBudget: z.coerce.number().positive({ message: "El presupuesto debe ser positivo." }),
});

export default function AdaptRecipePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AdaptRecipeOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipeName: "",
      originalRecipe: "",
      dietaryRestrictions: "",
      maxPrepTime: 30,
      maxBudget: 20,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setResult(null);
    try {
      const response = await adaptRecipe(values);
      setResult(response);
      toast({
        title: "¡Receta Adaptada!",
        description: "Tu receta modificada está lista.",
      });
    } catch (error) {
      console.error("Error adapting recipe:", error);
      toast({
        title: "Error al adaptar receta",
        description: "Hubo un problema al contactar con la IA. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Adaptar Receta" 
        icon={Wand2}
        description="Modifica una receta existente según restricciones dietéticas, tiempo de preparación y presupuesto."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Detalles de Adaptación</CardTitle>
            <CardDescription>Proporciona la receta original y los criterios de adaptación.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="recipeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la Receta Original</FormLabel>
                      <FormControl><Input placeholder="Ej: Lasaña Boloñesa Clásica" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="originalRecipe"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Receta Original (Ingredientes e Instrucciones)</FormLabel>
                      <FormControl><Textarea placeholder="Describe la receta original..." className="min-h-[120px]" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dietaryRestrictions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Restricciones Dietéticas</FormLabel>
                      <FormControl><Input placeholder="Ej: vegetariana, sin gluten, baja en sodio" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="maxPrepTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tiempo Máx. Prep. (min)</FormLabel>
                      <FormControl><Input type="number" placeholder="Ej: 45" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxBudget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Presupuesto Máx. (€)</FormLabel>
                      <FormControl><Input type="number" placeholder="Ej: 25" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                </div>
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? <LoadingSpinner className="mr-2" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  Adaptar Receta
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
                <Utensils className="h-6 w-6 text-primary"/>
                Receta Adaptada
            </CardTitle>
            <CardDescription>Aquí se mostrará la versión adaptada de tu receta.</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[300px] flex flex-col">
            {isLoading && (
              <div className="flex-grow flex flex-col items-center justify-center text-muted-foreground">
                <LoadingSpinner size="lg"/>
                <p className="mt-4">Adaptando receta, un momento...</p>
              </div>
            )}
            {!isLoading && result && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg text-primary">Nueva Receta:</h3>
                  <p className="whitespace-pre-wrap text-sm">{result.adaptedRecipe}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                    <div>
                        <h3 className="font-semibold text-md text-primary flex items-center gap-1">
                            <ShoppingBag className="h-4 w-4"/>Costo Estimado:
                        </h3>
                        <p className="text-sm">€{result.costEstimate.toFixed(2)}</p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-md text-primary flex items-center gap-1">
                            <Clock className="h-4 w-4"/>Tiempo Estimado:
                        </h3>
                        <p className="text-sm">{result.prepTimeEstimate} minutos</p>
                    </div>
                </div>
              </div>
            )}
            {!isLoading && !result && (
              <div className="flex-grow flex items-center justify-center">
                <p className="text-muted-foreground">La receta adaptada se mostrará aquí.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
