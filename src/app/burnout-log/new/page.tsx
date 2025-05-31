
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
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
import { HeartPulse, Save, ArrowLeft, CalendarIcon } from "lucide-react";
import { LoadingSpinner } from '@/components/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { addBurnoutLogEntryAction, type BurnoutLogEntryFormValues } from '../actions';
import type { BurnoutScore, ShiftType, DemandLevel, SupportLevel } from "@/types";
import { cn } from "@/lib/utils";

const burnoutScoreValues: BurnoutScore[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const shiftTypeValues: { value: ShiftType, label: string }[] = [
  { value: 'morning', label: 'Mañana' },
  { value: 'afternoon', label: 'Tarde' },
  { value: 'evening', label: 'Noche' },
  { value: 'split', label: 'Partido' },
  { value: 'full_day', label: 'Día Completo' },
  { value: 'other', label: 'Otro' },
];
const demandLevelValues: { value: DemandLevel, label: string }[] = [
  { value: 'low', label: 'Bajo' },
  { value: 'medium', label: 'Medio' },
  { value: 'high', label: 'Alto' },
  { value: 'extreme', label: 'Extremo' },
];
const supportLevelValues: { value: SupportLevel, label: string }[] = [
  { value: 'none', label: 'Ninguno' },
  { value: 'poor', label: 'Pobre' },
  { value: 'adequate', label: 'Adecuado' },
  { value: 'good', label: 'Bueno' },
  { value: 'excellent', label: 'Excelente' },
];

const burnoutLogEntrySchemaFE = z.object({
  hotelName: z.string().min(2, { message: "El nombre del hotel debe tener al menos 2 caracteres." }),
  date: z.date({ required_error: "La fecha del registro es requerida." }),
  cookName: z.string().optional(),
  department: z.string().min(2, { message: "La partida/departamento es requerida." }),
  burnoutScore: z.coerce.number().min(1).max(10, "La puntuación debe ser entre 1 y 10."),
  shiftType: z.enum(shiftTypeValues.map(s => s.value) as [ShiftType, ...ShiftType[]], { required_error: "El tipo de turno es requerido." }),
  hoursWorked: z.coerce.number().positive({ message: "Las horas trabajadas deben ser un número positivo." }),
  peakDemandLevel: z.enum(demandLevelValues.map(d => d.value) as [DemandLevel, ...DemandLevel[]], { required_error: "El nivel de demanda pico es requerido." }),
  supportReceived: z.enum(supportLevelValues.map(s => s.value) as [SupportLevel, ...SupportLevel[]], { required_error: "El nivel de soporte recibido es requerido." }),
  productionPressureNotes: z.string().optional(),
  salesPressureNotes: z.string().optional(),
  generalNotes: z.string().optional(),
  recordedBy: z.string().optional(),
});


export default function NewBurnoutLogEntryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<BurnoutLogEntryFormValues>({
    resolver: zodResolver(burnoutLogEntrySchemaFE),
    defaultValues: {
      hotelName: "",
      date: new Date(),
      cookName: "",
      department: "",
      burnoutScore: 5 as BurnoutScore,
      shiftType: 'morning' as ShiftType,
      hoursWorked: 8,
      peakDemandLevel: 'medium' as DemandLevel,
      supportReceived: 'adequate' as SupportLevel,
      productionPressureNotes: "",
      salesPressureNotes: "",
      generalNotes: "",
      recordedBy: "",
    },
  });

  async function onSubmit(values: BurnoutLogEntryFormValues) {
    setIsLoading(true);
    try {
      const result = await addBurnoutLogEntryAction(values);
      if (result.success) {
        toast({
          title: "Registro de Burnout Guardado",
          description: `El registro para ${values.hotelName} del ${format(values.date, "PP", {locale:es})} ha sido guardado.`,
        });
        router.push('/burnout-log'); 
      } else {
        toast({
          title: "Error al guardar registro",
          description: result.error || "No se pudo guardar la entrada de burnout.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting burnout log form:", error);
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
        title="Registrar Nivel de Burnout"
        icon={HeartPulse}
        description="Documenta el bienestar del equipo para identificar patrones y áreas de mejora."
        actions={
          <Button variant="outline" asChild>
            <Link href="/burnout-log">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Historial
            </Link>
          </Button>
        }
      />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Detalles del Registro de Burnout</CardTitle>
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
                      <FormControl><Input placeholder="Ej: Gran Hotel Central" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha del Registro</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                              {field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus locale={es} />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="cookName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Cocinero (Opcional)</FormLabel>
                      <FormControl><Input placeholder="Ej: Juan Pérez" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Partida / Departamento</FormLabel>
                      <FormControl><Input placeholder="Ej: Cocina Caliente, Repostería" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="burnoutScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Puntuación de Burnout (1-10)</FormLabel>
                      <Select onValueChange={(val) => field.onChange(Number(val))} defaultValue={String(field.value)}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecciona una puntuación" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {burnoutScoreValues.map(score => <SelectItem key={score} value={String(score)}>{score}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormDescription>1 = Muy bajo, 10 = Extremadamente alto.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shiftType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Turno</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un tipo" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {shiftTypeValues.map(type => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hoursWorked"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horas Trabajadas</FormLabel>
                      <FormControl><Input type="number" step="0.5" placeholder="Ej: 8.5" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="peakDemandLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nivel de Demanda Pico</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un nivel" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {demandLevelValues.map(level => <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="supportReceived"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nivel de Soporte Recibido</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un nivel" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {supportLevelValues.map(level => <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="productionPressureNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas: Presión por Producción (Opcional)</FormLabel>
                    <FormControl><Textarea placeholder="Detalles sobre la presión por objetivos de producción, falta de ingredientes, etc." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="salesPressureNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas: Presión por Ventas/Servicio (Opcional)</FormLabel>
                    <FormControl><Textarea placeholder="Detalles sobre la presión por volumen de comandas, clientes difíciles, etc." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="generalNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas Generales (Opcional)</FormLabel>
                    <FormControl><Textarea placeholder="Cualquier otra observación relevante sobre el bienestar del equipo o individuo." {...field} /></FormControl>
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
                <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
                  {isLoading ? <LoadingSpinner className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                  Guardar Registro
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
