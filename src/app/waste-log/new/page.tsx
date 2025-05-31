
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
import { Trash2 as WasteIcon, Save, ArrowLeft, CalendarIcon } from "lucide-react"; // Renamed Trash2 to WasteIcon
import { LoadingSpinner } from '@/components/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { addWasteLogEntryAction, type WasteLogEntryFormValues } from '../actions';
import { cn } from "@/lib/utils";

const wasteLogEntrySchema = z.object({
  hotelName: z.string().min(2, { message: "El nombre del hotel debe tener al menos 2 caracteres." }),
  ingredientId: z.string().min(1, { message: "Debe seleccionar un ingrediente." }),
  quantity: z.coerce.number().positive({ message: "La cantidad debe ser un número positivo." }),
  unit: z.string().min(1, { message: "La unidad para la merma es requerida." }),
  date: z.date({ required_error: "La fecha de la merma es requerida." }),
  reason: z.string().min(3, { message: "El motivo debe tener al menos 3 caracteres." }),
  notes: z.string().optional(),
  recordedBy: z.string().optional(),
});


export default function NewWasteLogEntryPage() {
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
        console.error("Error fetching ingredients for waste log form:", error);
        toast({
          title: "Error al cargar ingredientes",
          description: "No se pudieron cargar los ingredientes para el formulario.",
          variant: "destructive",
        });
      }
    };
    fetchIngredients();
  }, [toast]);

  const form = useForm<WasteLogEntryFormValues>({
    resolver: zodResolver(wasteLogEntrySchema),
    defaultValues: {
      hotelName: "",
      ingredientId: "",
      quantity: 0,
      unit: "",
      date: new Date(),
      reason: "",
      notes: "",
      recordedBy: "",
    },
  });

  const selectedIngredientId = form.watch("ingredientId");

  useEffect(() => {
    if (selectedIngredientId) {
      const selectedIngredient = availableIngredients.find(ing => ing.id === selectedIngredientId);
      if (selectedIngredient) {
        form.setValue("unit", selectedIngredient.unit); // Pre-fill unit from selected ingredient
      }
    }
  }, [selectedIngredientId, availableIngredients, form]);


  async function onSubmit(values: WasteLogEntryFormValues) {
    setIsLoading(true);
    try {
      const result = await addWasteLogEntryAction(values);
      if (result.success) {
        const selectedIngredient = availableIngredients.find(ing => ing.id === values.ingredientId);
        toast({
          title: "Merma Registrada",
          description: `Merma de ${values.quantity} ${values.unit} de "${selectedIngredient?.name || 'Ingrediente desconocido'}" registrada con éxito.`,
        });
        router.push('/waste-log'); 
      } else {
        toast({
          title: "Error al registrar merma",
          description: result.error || "No se pudo guardar la entrada de merma.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting waste log form:", error);
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
        title="Registrar Nueva Merma"
        icon={WasteIcon}
        description="Documenta las pérdidas de ingredientes para un mejor control."
        actions={
          <Button variant="outline" asChild>
            <Link href="/waste-log">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Historial de Mermas
            </Link>
          </Button>
        }
      />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Detalles de la Merma</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="hotelName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Hotel</FormLabel>
                      <FormControl><Input placeholder="Ej: Gran Hotel Sol" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha de la Merma</FormLabel>
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
                            disabled={(date) => date > new Date()}
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
                            {ing.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cantidad Mermada</FormLabel>
                      <FormControl><Input type="number" step="0.01" placeholder="Ej: 1.5" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidad de la Cantidad</FormLabel>
                      <FormControl><Input placeholder="Ej: kg, L, unidades" {...field} /></FormControl>
                       <FormDescription>Unidad de la cantidad que se perdió. Se autocompleta con la unidad base del ingrediente si lo seleccionas.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo de la Merma</FormLabel>
                    <FormControl><Input placeholder="Ej: Caducado, Mal estado, Rotura" {...field} /></FormControl>
                     <FormDescription>Sé específico. Ej: Caducado, Mal estado, Quemado, Caída, Contaminación, Sobreproducción.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas Adicionales (Opcional)</FormLabel>
                    <FormControl><Textarea placeholder="Cualquier detalle adicional sobre la merma..." className="min-h-[80px]" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                  control={form.control}
                  name="recordedBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registrado Por (Opcional)</FormLabel>
                      <FormControl><Input placeholder="Tu nombre o iniciales" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isLoading || availableIngredients.length === 0} className="w-full md:w-auto">
                  {isLoading ? <LoadingSpinner className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                  Guardar Registro de Merma
                </Button>
              </div>
              {availableIngredients.length === 0 && !isLoading && (
                <p className="text-sm text-destructive text-center mt-2">
                  No hay ingredientes disponibles en la biblioteca para registrar mermas. Por favor, añade ingredientes primero.
                </p>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
