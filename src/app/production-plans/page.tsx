
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, PlusCircle, AlertCircle, Loader2, Eye, Edit, Trash2 as DeleteIcon } from "lucide-react";
import type { ProductionPlan, ProductionPlanStatus } from "@/types"; 
import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, orderBy, Timestamp, doc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";


export default function ProductionPlansPage() {
  const [productionPlans, setProductionPlans] = useState<ProductionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchProductionPlans = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const plansCollection = collection(db, "productionPlans");
      const q = query(plansCollection, orderBy("planDate", "desc"));
      const querySnapshot = await getDocs(q);
      const fetchedPlans: ProductionPlan[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          hotelName: data.hotelName,
          planDate: data.planDate, // Keep as Firestore Timestamp
          recipes: data.recipes || [],
          status: data.status || 'Planeado',
          notes: data.notes,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        } as ProductionPlan;
      });
      setProductionPlans(fetchedPlans);
    } catch (err) {
      console.error("Error fetching production plans:", err);
      setError("No se pudieron cargar los planes de producción. Inténtalo de nuevo más tarde.");
      toast({
        title: "Error al cargar planes",
        description: "Hubo un problema al obtener los datos de Firestore.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProductionPlans();
  }, [fetchProductionPlans]);
  
  const formatDate = (timestamp: any) => {
    if (timestamp instanceof Timestamp) {
      return format(timestamp.toDate(), "PP", { locale: es });
    }
    if (timestamp && typeof timestamp.seconds === 'number') {
        return format(new Date(timestamp.seconds * 1000), "PP", { locale: es });
    }
    return "Fecha inválida";
  };

  const getStatusBadgeVariant = (status: ProductionPlanStatus) => {
    switch (status) {
      case 'Planeado': return 'secondary';
      case 'En Progreso': return 'default';
      case 'Completado': return 'outline'; // Success-like, using available variants
      case 'Cancelado': return 'destructive';
      default: return 'outline';
    }
  };

  const handleViewDetails = (planId: string) => {
    // Placeholder for future navigation to a detailed plan view page
    // router.push(`/production-plans/${planId}`);
    toast({ title: "Vista de Detalles", description: `Navegar a detalles del plan ${planId} (no implementado).` });
  };

  const handleEditPlan = (planId: string) => {
     toast({ title: "Editar Plan", description: `Funcionalidad de editar plan ${planId} no implementada.` });
  }

  const handleDeletePlan = async (planId: string, planName: string) => {
     if (confirm(`¿Seguro que quieres eliminar el plan "${planName}"? Esta acción no se puede deshacer.`)) {
      try {
        await deleteDoc(doc(db, "productionPlans", planId));
        setProductionPlans(prev => prev.filter(p => p.id !== planId));
        toast({
          title: "Plan Eliminado",
          description: `El plan "${planName}" ha sido eliminado.`,
        });
      } catch (error) {
        console.error("Error deleting plan:", error);
        toast({
          title: "Error al eliminar",
          description: `No se pudo eliminar el plan "${planName}".`,
          variant: "destructive",
        });
      }
    }
  }


  return (
    <div className="space-y-8">
      <PageHeader
        title="Planes de Producción"
        icon={ClipboardList}
        description="Gestiona tus planes de producción para organizar la cocina eficientemente."
        actions={
          <Button asChild>
            <Link href="/production-plans/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Crear Nuevo Plan
            </Link>
          </Button>
        }
      />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Listado de Planes de Producción</CardTitle>
          <CardDescription>
            Visualiza y administra tus planes de producción programados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Cargando planes de producción...</p>
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
                  <TableHead>Nombre del Plan</TableHead>
                  <TableHead>Hotel/Ubicación</TableHead>
                  <TableHead>Fecha Planificada</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-center hidden md:table-cell">Nº Recetas</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productionPlans.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                      No hay planes de producción. Comienza creando uno.
                    </TableCell>
                  </TableRow>
                )}
                {productionPlans.map((plan) => (
                  <TableRow key={plan.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium text-foreground">{plan.name}</TableCell>
                    <TableCell>{plan.hotelName}</TableCell>
                    <TableCell>{formatDate(plan.planDate)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={getStatusBadgeVariant(plan.status)}>{plan.status}</Badge>
                    </TableCell>
                    <TableCell className="text-center hidden md:table-cell">{plan.recipes.length}</TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleViewDetails(plan.id)}>
                            <Eye className="mr-2 h-4 w-4" /> Ver Detalles
                          </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => handleEditPlan(plan.id)}>
                            <Edit className="mr-2 h-4 w-4" /> Editar Plan
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDeletePlan(plan.id, plan.name)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                            <DeleteIcon className="mr-2 h-4 w-4" /> Eliminar Plan
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardHeader>
            <CardTitle className="font-headline">Próximas Funcionalidades de Planificación</CardTitle>
        </CardHeader>
        <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Vista detallada del plan con listado de recetas y cantidades.</li>
                <li>Cálculo automático del total de ingredientes requeridos para un plan.</li>
                <li>Análisis de stock: comparación de ingredientes requeridos vs. inventario disponible.</li>
                <li>Generación de hoja de producción imprimible.</li>
                <li>Simulación y cambio de estado del plan (Planeado, En Progreso, Completado, Cancelado).</li>
            </ul>
        </CardContent>
      </Card>
    </div>
  );
}
