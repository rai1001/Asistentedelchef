
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Archive, PlusCircle, AlertCircle, Loader2, Search } from "lucide-react";
import type { InventoryItem, Ingredient, DisplayInventoryItem } from "@/types";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';

export default function InventoryPage() {
  const [inventory, setInventory] = useState<DisplayInventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const fetchInventoryData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const ingredientsCollection = collection(db, "ingredients");
        const ingredientsSnapshot = await getDocs(ingredientsCollection);
        const ingredientsMap = new Map<string, Ingredient>();
        ingredientsSnapshot.forEach(doc => {
          ingredientsMap.set(doc.id, { id: doc.id, ...doc.data() } as Ingredient);
        });

        const inventoryCollection = collection(db, "inventory");
        const inventoryQuery = query(inventoryCollection); // Potentially add orderBy later
        const inventorySnapshot = await getDocs(inventoryQuery);
        
        const fetchedInventoryItems: DisplayInventoryItem[] = [];
        inventorySnapshot.forEach(doc => {
          const item = { id: doc.id, ...doc.data() } as InventoryItem;
          const ingredient = ingredientsMap.get(item.ingredientId);

          if (ingredient) {
            const currentStock = item.currentStock || 0;
            const lowStockThreshold = ingredient.lowStockThreshold || 0;
            fetchedInventoryItems.push({
              ...item,
              ingredientName: ingredient.name,
              unit: ingredient.unit,
              lowStockThreshold: ingredient.lowStockThreshold,
              isLowStock: currentStock < lowStockThreshold,
            });
          } else {
            // Handle case where ingredient for an inventory item might be missing
            // This could be logged or an error shown for this specific item
            console.warn(`Ingrediente con ID ${item.ingredientId} no encontrado para el item de inventario ${item.id}`);
            // Optionally, still add it with placeholder data or skip
            fetchedInventoryItems.push({
                ...item,
                ingredientName: `Ingrediente Desconocido (ID: ${item.ingredientId})`,
                unit: 'N/A',
                isLowStock: false,
            });
          }
        });
        setInventory(fetchedInventoryItems);
      } catch (err) {
        console.error("Error fetching inventory data:", err);
        setError("No se pudo cargar el inventario. Inténtalo de nuevo más tarde.");
        toast({
          title: "Error al cargar inventario",
          description: "Hubo un problema al obtener los datos de Firestore.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInventoryData();
  }, [toast]);

  const filteredInventory = useMemo(() => {
    if (!searchTerm) return inventory;
    return inventory.filter(item =>
      item.ingredientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.hotelName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [inventory, searchTerm]);

  const handleAddItem = () => {
    alert("Funcionalidad 'Añadir Artículo a Inventario' no implementada.");
    // Future: router.push('/inventory/new');
  };

  const handleRegisterPurchase = () => {
    alert("Funcionalidad 'Registrar Compra' no implementada.");
    // Future: router.push('/inventory/purchases/new');
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Gestión de Inventario"
        icon={Archive}
        description="Visualiza y gestiona los niveles de stock de tus ingredientes por hotel."
        actions={
          <div className="flex gap-2">
            <Button onClick={handleRegisterPurchase} variant="outline">
                Registrar Compra
            </Button>
            <Button onClick={handleAddItem}>
              <PlusCircle className="mr-2 h-4 w-4" /> Añadir Artículo
            </Button>
          </div>
        }
      />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Stock Actual</CardTitle>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <CardDescription>
                Listado de ingredientes en inventario, sus cantidades y alertas de stock bajo.
            </CardDescription>
            <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                type="search"
                placeholder="Buscar por ingrediente u hotel..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pl-8 w-full"
                />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Cargando inventario...</p>
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
                  <TableHead>Ingrediente</TableHead>
                  <TableHead>Hotel</TableHead>
                  <TableHead className="text-right">Stock Actual</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Umbral Bajo</TableHead>
                  <TableHead className="text-center">Alerta</TableHead>
                  {/* <TableHead className="text-right">Acciones</TableHead> */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                      {inventory.length === 0 ? "No hay artículos en el inventario." : "No se encontraron artículos que coincidan con tu búsqueda."}
                    </TableCell>
                  </TableRow>
                )}
                {filteredInventory.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium text-foreground">{item.ingredientName}</TableCell>
                    <TableCell>{item.hotelName}</TableCell>
                    <TableCell className="text-right">{item.currentStock.toLocaleString()}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right hidden md:table-cell">{item.lowStockThreshold?.toLocaleString() ?? '-'}</TableCell>
                    <TableCell className="text-center">
                      {item.isLowStock ? (
                        <Badge variant="destructive" className="cursor-default">
                          <AlertCircle className="h-3 w-3 mr-1" /> Stock Bajo
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="cursor-default">Normal</Badge>
                      )}
                    </TableCell>
                    {/* <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => alert(`Acciones para ${item.ingredientName} no implementado`)}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell> */}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
       <Card className="mt-6">
        <CardHeader>
            <CardTitle className="font-headline">Próximas Funcionalidades de Inventario</CardTitle>
        </CardHeader>
        <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Formulario para añadir nuevos artículos al inventario (vinculados a la biblioteca de ingredientes).</li>
                <li>Formulario para registrar compras de ingredientes, actualizando stock y coste promedio ponderado.</li>
                <li>Capacidad para ajustar manualmente el stock.</li>
                <li>Historial de movimientos de inventario por artículo.</li>
            </ul>
        </CardContent>
      </Card>
    </div>
  );
}
