
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, FileUp, LayoutList, TrendingUp, DollarSign, Percent, CalendarDays, Hotel, AlertCircle, Loader2 } from "lucide-react";
import type { Menu, MenuRecipeItem } from "@/types";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Helper function to safely convert Firestore Timestamp or string to Date object
const convertToDate = (dateInput: any): Date | null => {
  if (!dateInput) return null;
  if (dateInput instanceof Timestamp) {
    return dateInput.toDate();
  }
  if (typeof dateInput === 'string') {
    const parsedDate = new Date(dateInput);
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
  }
  // If it's already a Date object (less likely from Firestore directly unless transformed)
  if (dateInput instanceof Date) {
    return dateInput;
  }
  return null;
};

// Helper function to format date ranges
const formatDateRange = (startDate: any, endDate: any, period: Menu['period']): string => {
  const start = convertToDate(startDate);
  const end = convertToDate(endDate);

  if (!start) return "Fechas no especificadas";

  const formattedStart = format(start, 'PP', { locale: es });

  if (period === 'daily' || !end || format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
    return formattedStart;
  }
  
  const formattedEnd = format(end, 'PP', { locale: es });
  return `${formattedStart} - ${formattedEnd}`;
};


export default function MenusPage() {
  const [menus, setMenus] = React.useState<Menu[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchMenus = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const menusCollection = collection(db, "menus");
        // Consider ordering by startDate in descending order to see newest menus first
        const q = query(menusCollection, orderBy("startDate", "desc")); 
        const querySnapshot = await getDocs(q);
        const fetchedMenus: Menu[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          // Ensure recipes is an array, even if Firestore returns undefined or null
          const recipesData = data.recipes || [];
          const recipes: MenuRecipeItem[] = recipesData.map((r: any) => ({
            id: r.id,
            name: r.name,
            cost: r.cost,
          }));

          return {
            id: doc.id,
            name: data.name,
            description: data.description,
            recipes: recipes, 
            totalCost: data.totalCost,
            sellingPrice: data.sellingPrice,
            hotel: data.hotel,
            period: data.period,
            startDate: data.startDate, 
            endDate: data.endDate,     
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          } as Menu;
        });
        setMenus(fetchedMenus);
      } catch (err) {
        console.error("Error fetching menus:", err);
        setError("No se pudieron cargar los menús. Inténtalo de nuevo más tarde.");
        toast({
          title: "Error al cargar menús",
          description: "Hubo un problema al obtener los datos de Firestore.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchMenus();
  }, [toast]);


  const handleImportXLSX = () => {
    alert("Funcionalidad 'Importar XLSX para Menús' no implementada.");
  };

  const getPeriodLabel = (period?: Menu['period']): string => {
    if (!period) return 'No especificado';
    switch (period) {
      case 'daily': return 'Diario';
      case 'weekly': return 'Semanal';
      case 'monthly': return 'Mensual';
      case 'event': return 'Evento Especial';
      case 'other': return 'Otro';
      default: return period;
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Gestión de Menús" 
        icon={LayoutList}
        description="Crea y organiza tus menús. Analiza su rentabilidad con herramientas de ingeniería de menús."
        actions={
          <div className="flex gap-2">
            <Button onClick={handleImportXLSX} variant="outline">
              <FileUp className="mr-2 h-4 w-4" /> Importar XLSX
            </Button>
            <Button asChild>
              <Link href="/menus/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Crear Menú
              </Link>
            </Button>
          </div>
        }
      />

      <Card className="shadow-md">
        <CardHeader>
            <CardTitle className="font-headline text-xl">Ingeniería de Menús</CardTitle>
            <CardDescription>
            La ingeniería de menús te ayuda a analizar la rentabilidad y popularidad de tus platos y menús. Métricas como el costo, precio de venta y margen de beneficio son fundamentales para tomar decisiones estratégicas y optimizar tu oferta.
            </CardDescription>
        </CardHeader>
      </Card>

      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-muted-foreground">Cargando menús...</p>
        </div>
      )}
      {!isLoading && error && (
        <Card className="md:col-span-2 lg:col-span-3">
          <CardContent className="pt-6 text-center text-destructive">
            <AlertCircle className="mx-auto h-12 w-12 mb-4" />
            <p>{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {!isLoading && !error && menus.length === 0 && (
            <Card className="md:col-span-2 lg:col-span-3">
                <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">No hay menús creados. ¡Empieza añadiendo uno!</p>
                </CardContent>
            </Card>
        )}
        {!isLoading && !error && menus.map(menu => {
          const profit = menu.sellingPrice && menu.totalCost ? menu.sellingPrice - menu.totalCost : undefined;
          const profitMargin = profit !== undefined && menu.sellingPrice && menu.sellingPrice !== 0 ? (profit / menu.sellingPrice) * 100 : undefined;

          return (
            <Card key={menu.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
              <CardHeader>
                <CardTitle className="font-headline">{menu.name}</CardTitle>
                <CardDescription>{menu.description || "Sin descripción."}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-3">
                <div>
                  <h4 className="font-semibold mb-1 text-sm text-muted-foreground flex items-center"><Hotel className="h-4 w-4 mr-2 text-primary/70" />Hotel:</h4>
                  <p className="text-sm ml-6">{menu.hotel || "No especificado"}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1 text-sm text-muted-foreground flex items-center"><CalendarDays className="h-4 w-4 mr-2 text-primary/70" />Período y Fechas:</h4>
                  <p className="text-sm ml-6">{getPeriodLabel(menu.period)}</p>
                  <p className="text-sm ml-6">{formatDateRange(menu.startDate, menu.endDate, menu.period)}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1 text-sm text-muted-foreground">Recetas Incluidas ({menu.recipes?.length || 0}):</h4>
                  {menu.recipes && menu.recipes.length > 0 ? (
                     <ScrollArea className="h-24 text-sm ml-6">
                        <ul className="list-disc list-inside space-y-1 pr-2">
                        {menu.recipes.map(recipe => (
                            <li key={recipe.id} className="truncate" title={recipe.name}>
                                {recipe.name} 
                                {recipe.cost !== undefined && <span className="text-xs text-muted-foreground"> (€{recipe.cost.toFixed(2)})</span>}
                            </li>
                        ))}
                        </ul>
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-muted-foreground ml-6">No hay recetas asignadas.</p>
                  )}
                </div>
              </CardContent>
              <CardContent className="border-t pt-4 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground flex items-center"><DollarSign className="h-4 w-4 mr-1 text-primary/80" />Costo Total Est.:</span>
                      <span className="font-semibold">€{menu.totalCost?.toFixed(2) || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground flex items-center"><TrendingUp className="h-4 w-4 mr-1 text-primary/80" />Precio de Venta:</span>
                      <span className="font-semibold">€{menu.sellingPrice?.toFixed(2) || 'N/A'}</span>
                  </div>
                  {profit !== undefined && (
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground flex items-center"><DollarSign className="h-4 w-4 mr-1 text-green-600" />Beneficio Bruto Est.:</span>
                        <span className={`font-semibold ${profit < 0 ? 'text-destructive' : 'text-green-600'}`}>€{profit.toFixed(2)}</span>
                    </div>
                  )}
                  {profitMargin !== undefined && menu.sellingPrice && menu.sellingPrice > 0 && (
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground flex items-center"><Percent className="h-4 w-4 mr-1 text-blue-600" />Margen Beneficio Est.:</span>
                        <span className={`font-semibold ${profitMargin < 0 ? 'text-destructive' : 'text-blue-600'}`}>{profitMargin.toFixed(1)}%</span>
                    </div>
                  )}
                  <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => alert(`Gestionar menú ${menu.name} no implementado`)}>
                      Gestionar Menú
                  </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card>
        <CardHeader>
            <CardTitle className="font-headline">Área de Composición de Menús (Placeholder)</CardTitle>
            <CardDescription>Aquí iría la funcionalidad de arrastrar y soltar recetas para crear menús. Esta característica no está implementada en esta versión.</CardDescription>
        </CardHeader>
        <CardContent className="min-h-[200px] border-2 border-dashed border-border rounded-md flex items-center justify-center">
            <p className="text-muted-foreground">Zona de Drag & Drop (No funcional)</p>
        </CardContent>
      </Card>
    </div>
  );
}
