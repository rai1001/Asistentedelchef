
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HeartPulse, PlusCircle, AlertCircle, Loader2 } from "lucide-react";
import type { BurnoutLogEntry } from "@/types"; 
import { db } from "@/lib/firebase/client"; // UPDATED IMPORT
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

export default function BurnoutLogPage() {
  const [burnoutEntries, setBurnoutEntries] = useState<BurnoutLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchBurnoutEntries = async () => {
        setIsLoading(true);
        setError(null);
        if (!db) {
          setError("La configuración de Firebase (cliente) no está disponible.");
          setIsLoading(false);
          toast({
            title: "Error de Configuración",
            description: "La base de datos del cliente no está inicializada. Revisa las variables de entorno.",
            variant: "destructive",
          });
          return;
        }
        try {
            const logCollection = collection(db, "burnoutLogs");
            const q = query(logCollection, orderBy("date", "desc"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            const fetchedEntries: BurnoutLogEntry[] = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data
                } as BurnoutLogEntry;
            });
            setBurnoutEntries(fetchedEntries);
        } catch (err) {
            console.error("Error fetching burnout log entries:", err);
            setError("No se pudieron cargar las entradas de burnout. Inténtalo de nuevo más tarde.");
            toast({
                title: "Error al cargar registros de burnout",
                description: "Hubo un problema al obtener los datos de Firestore.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };
    fetchBurnoutEntries();
  }, [toast]);
  
  const formatDate = (timestamp: any) => {
    if (timestamp instanceof Timestamp) {
      return format(timestamp.toDate(), "PP", { locale: es });
    }
    if (timestamp && typeof timestamp.seconds === 'number') {
        return format(new Date(timestamp.seconds * 1000), "PP", { locale: es });
    }
    return "Fecha inválida";
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 8) return "destructive";
    if (score >= 5) return "default"; // or a custom 'warning' variant if defined
    return "secondary";
  }


  return (
    <div className="space-y-8">
      <PageHeader
        title="Historial de Registro de Burnout"
        icon={HeartPulse}
        description="Analiza el bienestar del equipo a lo largo del tiempo."
        actions={
          <Button asChild>
            <Link href="/burnout-log/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nuevo Registro
            </Link>
          </Button>
        }
      />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Listado de Registros de Burnout</CardTitle>
          <CardDescription>
            Visualiza las entradas de burnout para identificar tendencias y tomar acciones.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Cargando registros...</p>
            </div>
          )}
          {!isLoading && error && (
            <div className="text-center text-destructive py-10">
              <AlertCircle className="mx-auto h-12 w-12 mb-4" />
              <p>{error}</p>
            </div>
          )}
          {!isLoading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Hotel</TableHead>
                  <TableHead>Cocinero</TableHead>
                  <TableHead>Partida</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead className="hidden md:table-cell">Turno</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">Horas</TableHead>
                  {/* <TableHead className="text-right">Acciones</TableHead> */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {burnoutEntries.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                      No hay registros de burnout. Comienza añadiendo uno.
                    </TableCell>
                  </TableRow>
                )}
                {burnoutEntries.map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>{formatDate(entry.date)}</TableCell>
                    <TableCell className="font-medium text-foreground">{entry.hotelName}</TableCell>
                    <TableCell>{entry.cookName || "-"}</TableCell>
                    <TableCell>{entry.department}</TableCell>
                    <TableCell className="text-center">
                        <Badge variant={getScoreBadgeVariant(entry.burnoutScore)}>{entry.burnoutScore}/10</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell capitalize">{entry.shiftType.replace('_', ' ')}</TableCell>
                    <TableCell className="hidden lg:table-cell text-right">{entry.hoursWorked}</TableCell>
                    {/* 
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => alert(`Acciones para ${entry.id} no implementado`)}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell> 
                    */}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
       <Card className="mt-6">
        <CardHeader>
            <CardTitle className="font-headline">Próximas Funcionalidades de Bienestar</CardTitle>
        </CardHeader>
        <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Filtros avanzados para el historial (por hotel, partida, rango de fechas, etc.).</li>
                <li>Gráficas para visualizar tendencias de burnout.</li>
                <li>Edición y eliminación de registros (con permisos adecuados).</li>
                <li>Integración con alertas o notificaciones para scores preocupantes.</li>
            </ul>
        </CardContent>
      </Card>
    </div>
  );
}
