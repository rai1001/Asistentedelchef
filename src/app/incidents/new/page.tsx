
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AlertOctagon, Save, ArrowLeft, CalendarIcon } from "lucide-react";
import { LoadingSpinner } from '@/components/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { addOperationalIncidentAction, type OperationalIncidentFormValues } from '../actions';
import type { IncidentType } from "@/types";
import { cn } from "@/lib/utils";

const incidentTypeValues: { value: IncidentType, label: string }[] = [
  { value: 'plate_returned', label: 'Plato Devuelto' },
  { value: 'customer_complaint', label: 'Reclamación de Cliente' },
  { value: 'equipment_failure', label: 'Fallo de Equipo' },
  { value: 'supply_issue', label: 'Problema de Suministro/Proveedor' },
  { value: 'staff_issue', label: 'Incidencia de Personal' },
  { value: 'safety_hygiene', label: 'Incidencia de Seguridad/Higiene' },
  { value: 'other', label: 'Otro Tipo de Incidencia' },
];

const incidentStatusValues: { value: 'open' | 'in_progress' | 'resolved' | 'closed', label: string }[] = [
    { value: 'open', label: 'Abierta' },
    { value: 'in_progress', label: 'En Progreso' },
    { value: 'resolved', label: 'Resuelta' },
    { value: 'closed', label: 'Cerrada' },
];


const operationalIncidentSchemaFE = z.object({
  hotelName: z.string().min(2, { message: "El nombre del hotel debe tener al menos 2 caracteres." }),
  date: z.date({ required_error: "La fecha de la incidencia es requerida." }),
  incidentType: z.enum(incidentTypeValues.map(it => it.value) as [IncidentType, ...IncidentType[]], { required_error: "El tipo de incidencia es requerido." }),
  description: z.string().min(10, { message: "La descripción debe tener al menos 10 caracteres." }),
  relatedRecipeOrDepartment: z.string().optional(),
  resolution: z.string().optional(),
  reportedBy: z.string().optional(),
  status: z.enum(incidentStatusValues.map(s => s.value) as ['open', ...Array<'in_progress' | 'resolved' | 'closed'>]).default('open'),
});


export default function NewIncidentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<OperationalIncidentFormValues>({
    resolver: zodResolver(operationalIncidentSchemaFE),
    defaultValues: {
      hotelName: "",
      date: new Date(),
      description: "",
      relatedRecipeOrDepartment: "",
      resolution: "",
      reportedBy: "",
      status: 'open',
    },
  });

  async function onSubmit(values: OperationalIncidentFormValues) {
    setIsLoading(true);
    try {
      const result = await addOperationalIncidentAction(values);
      if (result.success) {
        toast({
          title: "Incidencia Registrada",
          description: `La incidencia de tipo "${incidentTypeValues.find(it => it.value === values.incidentType)?.label || values.incidentType}" ha sido registrada.`,
        });
        router.push('/incidents'); 
      } else {
        toast({
          title: "Error al registrar incidencia",
          description: result.error || "No se pudo guardar la incidencia.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting incident form:", error);
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
        title="Registrar Nueva Incidencia Operativa"
        icon={AlertOctagon}
        description="Documenta cualquier incidencia para su seguimiento y resolución."
        actions={
          <Button variant="outline" asChild>
            <Link href="/incidents">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Historial de Incidencias
            </Link>
          </Button>
        }
      />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Detalles de la Incidencia</CardTitle>
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
                      <FormLabel>Fecha y Hora de la Incidencia</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                              {field.value ? format(field.value, "PPP p", { locale: es }) : <span>Elige una fecha y hora</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus locale={es} />
                          {/* Basic time picker might be needed here or use a library if precise time is critical */}
                        </PopoverContent>
                      </Popover>
                      <FormDescription>Se registrará la fecha actual si no se modifica.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="incidentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Incidencia</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un tipo" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {incidentTypeValues.map(type => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción Detallada</FormLabel>
                    <FormControl><Textarea placeholder="Describe qué ocurrió, cuándo, dónde, quién estuvo involucrado, etc." className="min-h-[100px]" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="relatedRecipeOrDepartment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Receta / Partida / Equipo Afectado (Opcional)</FormLabel>
                      <FormControl><Input placeholder="Ej: Paella Valenciana, Cuarto Frío, Horno X" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado de la Incidencia</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un estado" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {incidentStatusValues.map(status => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="resolution"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resolución Aplicada o Propuesta (Opcional)</FormLabel>
                    <FormControl><Textarea placeholder="Describe las acciones tomadas o las que se planean tomar." className="min-h-[80px]" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="reportedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reportado Por (Opcional)</FormLabel>
                    <FormControl><Input placeholder="Tu nombre o iniciales" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
                  {isLoading ? <LoadingSpinner className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                  Guardar Incidencia
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
