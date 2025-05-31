
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertOctagon, PlusCircle, AlertCircle as AlertIcon, Loader2, MoreHorizontal } from "lucide-react"; // Renamed AlertCircle to AlertIcon
import type { OperationalIncident, IncidentType } from "@/types"; 
import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";


const incidentTypeLabels: Record<IncidentType, string> = {
  plate_returned: 'Plato Devuelto',
  customer_complaint: 'Reclamación Cliente',
  equipment_failure: 'Fallo de Equipo',
  supply_issue: 'Problema Suministro',
  staff_issue: 'Incidencia Personal',
  safety_hygiene: 'Seguridad/Higiene',
  other: 'Otro',
};

const incidentStatusLabels: Record<OperationalIncident['status'] & string, string> = {
    open: 'Abierta',
    in_progress: 'En Progreso',
    resolved: 'Resuelta',
    closed: 'Cerrada',
};


export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<OperationalIncident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchIncidents = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const incidentsCollection = collection(db, "incidents");
            const q = query(incidentsCollection, orderBy("date", "desc"));
            const querySnapshot = await getDocs(q);
            const fetchedIncidents: OperationalIncident[] = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                } as OperationalIncident;
            });
            setIncidents(fetchedIncidents);
        } catch (err) {
            console.error("Error fetching incidents:", err);
            setError("No se pudieron cargar las incidencias. Inténtalo de nuevo más tarde.");
            toast({
                title: "Error al cargar incidencias",
                description: "Hubo un problema al obtener los datos de Firestore.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };
    fetchIncidents();
  }, [toast]);
  
  const formatDate = (timestamp: any) => {
    if (timestamp instanceof Timestamp) {
      return format(timestamp.toDate(), "PPp", { locale: es }); // Added time
    }
    if (timestamp && typeof timestamp.seconds === 'number') {
        return format(new Date(timestamp.seconds * 1000), "PPp", { locale: es });
    }
    return "Fecha inválida";
  };

  const getStatusBadgeVariant = (status?: OperationalIncident['status']) => {
    switch (status) {
      case 'open': return 'destructive';
      case 'in_progress': return 'default'; // Using 'default' as a stand-in for warning/active
      case 'resolved': return 'secondary';
      case 'closed': return 'outline';
      default: return 'outline';
    }
  }


  return (
    <div className="space-y-8">
      <PageHeader
        title="Historial de Incidencias Operativas"
        icon={AlertOctagon}
        description="Analiza las incidencias registradas para mejorar la operativa."
        actions={
          <Button asChild>
            <Link href="/incidents/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Registrar Nueva Incidencia
            </Link>
          </Button>
        }
      />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Listado de Incidencias</CardTitle>
          <CardDescription>
            Visualiza todas las incidencias operativas documentadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Cargando incidencias...</p>
            </div>
          )}
          {!isLoading && error && (
            <div className="text-center text-destructive py-10">
              <AlertIcon className="mx-auto h-12 w-12 mb-4" />
              <p>{error}</p>
            </div>
          )}
          {!isLoading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Hotel</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="hidden md:table-cell">Descripción (Extracto)</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  {/* <TableHead className="text-right">Acciones</TableHead> */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                      No hay incidencias registradas.
                    </TableCell>
                  </TableRow>
                )}
                {incidents.map((incident) => (
                  <TableRow key={incident.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>{formatDate(incident.date)}</TableCell>
                    <TableCell className="font-medium text-foreground">{incident.hotelName}</TableCell>
                    <TableCell>{incidentTypeLabels[incident.incidentType] || incident.incidentType}</TableCell>
                    <TableCell className="hidden md:table-cell truncate max-w-xs" title={incident.description}>
                        {incident.description.substring(0, 75)}{incident.description.length > 75 ? "..." : ""}
                    </TableCell>
                    <TableCell className="text-center">
                        <Badge variant={getStatusBadgeVariant(incident.status)}>{incidentStatusLabels[incident.status || 'open'] || incident.status}</Badge>
                    </TableCell>
                    {/* 
                    <TableCell className="text-right">
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => alert(`Ver detalle de incidencia ${incident.id} (No implementado)`)}>
                            Ver Detalles
                          </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => alert(`Editar incidencia ${incident.id} (No implementado)`)}>
                            Editar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
            <CardTitle className="font-headline">Próximas Funcionalidades para Incidencias</CardTitle>
        </CardHeader>
        <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Filtros avanzados para el historial (por tipo, hotel, estado, rango de fechas).</li>
                <li>Vista detallada de cada incidencia.</li>
                <li>Posibilidad de editar incidencias y cambiar su estado.</li>
                <li>Notificaciones o asignaciones basadas en el tipo o gravedad de la incidencia.</li>
            </ul>
        </CardContent>
      </Card>
    </div>
  );
}
