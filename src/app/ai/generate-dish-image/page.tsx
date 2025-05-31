"use client";

import React, { useState } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import NextImage from 'next/image'; // Renamed to avoid conflict

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Image as LucideImage, Camera } from "lucide-react"; // Lucide's Image icon
import { generateDishImage, type GenerateDishImageOutput } from '@/ai/flows/generate-dish-image';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  dishDescription: z.string().min(10, { message: "La descripción debe tener al menos 10 caracteres." }),
});

export default function GenerateDishImagePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GenerateDishImageOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dishDescription: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setResult(null);
    try {
      const response = await generateDishImage(values);
      setResult(response);
      toast({
        title: "¡Imagen Generada!",
        description: "La imagen de tu plato está lista.",
      });
    } catch (error)
    {
      console.error("Error generating dish image:", error);
      toast({
        title: "Error al generar imagen",
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
        title="Generar Imagen de Plato" 
        icon={LucideImage}
        description="Describe un plato y la IA generará una imagen fotorrealista (512x512)."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Descripción del Plato</CardTitle>
            <CardDescription>Sé lo más detallado posible para obtener mejores resultados.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="dishDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Describe el plato</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ej: Un plato hondo de paella valenciana tradicional, con gambas rojas, mejillones, trozos de pollo y conejo, y judías verdes, decorado con una rodaja de limón. Vista cenital, luz natural."
                          className="min-h-[150px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Incluye detalles sobre ingredientes, presentación, ángulo de la foto, iluminación, etc.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? <LoadingSpinner className="mr-2" /> : <Camera className="mr-2 h-4 w-4" />}
                  Generar Imagen
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="shadow-lg sticky top-24"> {/* Sticky for better UX on scroll */}
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
                <LucideImage className="h-6 w-6 text-primary"/>
                Imagen Generada
            </CardTitle>
            <CardDescription>La imagen de 512x512 píxeles aparecerá aquí.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center aspect-square bg-muted/30 rounded-md overflow-hidden">
            {isLoading && (
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <LoadingSpinner size="lg"/>
                <p className="mt-4">Generando imagen, esto puede tardar un poco...</p>
              </div>
            )}
            {!isLoading && result?.imageUrl && (
              <NextImage
                src={result.imageUrl}
                alt="Plato generado por IA"
                width={512}
                height={512}
                className="object-contain"
                unoptimized // If the URL is from an external AI service not configured in next.config.js
              />
            )}
            {!isLoading && !result && (
                <NextImage
                    src="https://placehold.co/512x512/F5F5DC/A3B18A?text=Tu+Imagen+Aqu%C3%AD"
                    alt="Espacio para imagen generada"
                    width={512}
                    height={512}
                    className="object-contain opacity-50"
                    data-ai-hint="placeholder food"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
