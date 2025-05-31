
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 as WasteIcon, PlusCircle, AlertCircle, Loader2 } from "lucide-react"; // Renamed Trash2 to WasteIcon
import type { WasteLogEntry } from "@/types"; 
import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function WasteLogPage() {
  const [wasteEntries, setWasteEntries] = useState<WasteLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Placeholder: Fetching logic will be added in the next step
  useEffect(() => {
    const fetchWasteEntries = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const wasteLogCollection = collection(db, "wasteLog");
            const q = query(wasteLogCollection, orderBy("date", "desc"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            const fetchedEntries: WasteLogEntry[] = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    hotelName: data.hotelName,
                    ingredientId: data.ingredientId,
                    ingredientName: data.ingredientName,
                    quantity: data.quantity,
                    unit: data.unit,
                    date: data.date, // Keep as Firestore Timestamp or convert as needed
                    reason: data.reason,
                    notes: data.notes,
                    recordedBy: data.recordedBy,
                    createdAt: data.createdAt,
                } as WasteLogEntry;
            });
            setWasteEntries(fetchedEntries);
        } catch (err) {
            console.error("Error fetching waste log entries:", err);
            setError("No se pudieron cargar las entradas de merma. Inténtalo de nuevo más tarde.");
            toast({
                title: "Error al cargar mermas",
                description: "Hubo un problema al obtener los datos de Firestore.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };
    fetchWasteEntries();
  }, [toast]);
  
  const formatDate = (timestamp: any) => {
    if (timestamp instanceof Timestamp) {
      return format(timestamp.toDate(), "PP", { locale: es });
    }
    if (timestamp && typeof timestamp.seconds === 'number') { // Handle plain objects from Firestore cache/SSR
        return format(new Date(timestamp.seconds * 1000), "PP", { locale: es });
    }
    return "Fecha inválida";
  };


  return (
    <div className="space-y-8">
      <PageHeader
        title="Registro de Mermas y Desperdicios"
        icon={WasteIcon}
        description="Visualiza y gestiona las pérdidas de ingredientes registradas."
        actions={
          <Button asChild>
            <Link href="/waste-log/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Añadir Registro de Merma
            </Link>
          </Button>
        }
      />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Historial de Mermas</CardTitle>
          <CardDescription>
            Listado de todas las mermas de ingredientes registradas.
            {/* Placeholder for search/filter input */}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Cargando registros de mermas...</p>
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
                  <TableHead>Ingrediente</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="hidden md:table-cell">Notas</TableHead>
                  {/* <TableHead className="text-right">Acciones</TableHead> */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {wasteEntries.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                      No hay registros de mermas. Comienza añadiendo uno.
                    </TableCell>
                  </TableRow>
                )}
                {wasteEntries.map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>{formatDate(entry.date)}</TableCell>
                    <TableCell className="font-medium text-foreground">{entry.hotelName}</TableCell>
                    <TableCell>{entry.ingredientName}</TableCell>
                    <TableCell className="text-right">{entry.quantity.toLocaleString()}</TableCell>
                    <TableCell>{entry.unit}</TableCell>
                    <TableCell>{entry.reason}</TableCell>
                    <TableCell className="hidden md:table-cell truncate max-w-xs" title={entry.notes}>{entry.notes || "-"}</TableCell>
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
    </div>
  );
}
