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
import { Sparkles, ChefHat, DollarSign } from "lucide-react";
import { generateOptimizedRecipe, type GenerateOptimizedRecipeOutput } from '@/ai/flows/generate-optimized-recipe';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  ingredients: z.string().min(10, { message: "Por favor, introduce al menos algunos ingredientes." }),
  targetCost: z.coerce.number().positive({ message: "El costo objetivo debe ser un número positivo." }),
  recipeName: z.string().optional(),
});

export default function GenerateOptimizedRecipePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GenerateOptimizedRecipeOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ingredients: "",
      targetCost: 10,
      recipeName: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setResult(null);
    try {
      const response = await generateOptimizedRecipe(values);
      setResult(response);
      toast({
        title: "¡Receta Generada!",
        description: "Tu receta optimizada está lista.",
      });
    } catch (error) {
      console.error("Error generating optimized recipe:", error);
      toast({
        title: "Error al generar receta",
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
        title="Generar Receta Optimizada" 
        icon={Sparkles}
        description="Introduce los ingredientes disponibles y un costo objetivo para que la IA sugiera una receta deliciosa y económica."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Parámetros de la Receta</CardTitle>
            <CardDescription>Define los ingredientes y el costo para la nueva receta.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="ingredients"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ingredientes Disponibles</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ej: tomates, cebolla, pasta, aceite de oliva, albahaca..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Escribe una lista de ingredientes separados por comas.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="targetCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Costo Objetivo (€)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Ej: 15" {...field} />
                      </FormControl>
                      <FormDescription>
                        El costo máximo deseado para la receta completa.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="recipeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la Receta (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Pasta de la Abuela Económica" {...field} />
                      </FormControl>
                      <FormDescription>
                        Si no lo especificas, la IA generará un nombre.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? <LoadingSpinner className="mr-2" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Generar Receta
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
              <ChefHat className="h-6 w-6 text-primary"/>
              Receta Generada
            </CardTitle>
            <CardDescription>Aquí aparecerá la receta optimizada por la IA.</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[300px] flex flex-col">
            {isLoading && (
              <div className="flex-grow flex flex-col items-center justify-center text-muted-foreground">
                <LoadingSpinner size="lg" />
                <p className="mt-4">Generando receta, por favor espera...</p>
              </div>
            )}
            {!isLoading && result && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg text-primary">Receta:</h3>
                  <p className="whitespace-pre-wrap text-sm">{result.recipe}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-primary flex items-center gap-1">
                    <DollarSign className="h-5 w-5"/>
                    Costo Estimado:
                  </h3>
                  <p className="text-sm">€{result.cost.toFixed(2)}</p>
                </div>
              </div>
            )}
            {!isLoading && !result && (
              <div className="flex-grow flex items-center justify-center">
                <p className="text-muted-foreground">La receta aparecerá aquí una vez generada.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
