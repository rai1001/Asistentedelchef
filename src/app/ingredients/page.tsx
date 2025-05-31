
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, MoreHorizontal, ShoppingBasket, AlertCircle, Pencil, Trash2, Loader2 } from "lucide-react";
import type { Ingredient } from "@/types";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, orderBy, doc, deleteDoc, Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const fetchIngredients = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const ingredientsCollection = collection(db, "ingredients");
        const q = query(ingredientsCollection, orderBy("name", "asc"));
        const querySnapshot = await getDocs(q);
        const fetchedIngredients: Ingredient[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          // Ensure timestamps are handled if they exist and are needed, though not displayed yet
          return {
            id: doc.id,
            name: data.name,
            unit: data.unit,
            costPerUnit: data.costPerUnit,
            supplier: data.supplier,
            allergen: data.allergen,
            lowStockThreshold: data.lowStockThreshold,
            currentStock: data.currentStock,
            category: data.category,
            description: data.description,
            // createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : undefined,
            // updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : undefined,
          } as Ingredient;
        });
        setIngredients(fetchedIngredients);
      } catch (err) {
        console.error("Error fetching ingredients:", err);
        setError("No se pudieron cargar los ingredientes. Inténtalo de nuevo más tarde.");
        toast({
          title: "Error al cargar ingredientes",
          description: "Hubo un problema al obtener los datos de Firestore.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchIngredients();
  }, [toast]);

  const handleEditIngredient = (id: string) => {
    // TODO: Implement navigation to an edit page or open a modal
    alert(`Editar ingrediente ${id} no implementado. Se redirigirá a una página de edición en el futuro.`);
    // router.push(`/ingredients/edit/${id}`);
  };

  const handleDeleteIngredient = async (id: string, name: string) => {
    if (confirm(`¿Seguro que quieres eliminar el ingrediente "${name}"? Esta acción no se puede deshacer.`)) {
      try {
        await deleteDoc(doc(db, "ingredients", id));
        setIngredients(prev => prev.filter(ing => ing.id !== id));
        toast({
          title: "Ingrediente Eliminado",
          description: `El ingrediente "${name}" ha sido eliminado con éxito.`,
        });
      } catch (error) {
        console.error("Error deleting ingredient:", error);
        toast({
          title: "Error al eliminar",
          description: `No se pudo eliminar el ingrediente "${name}". Inténtalo de nuevo.`,
          variant: "destructive",
        });
      }
    }
  };

  const filteredIngredients = useMemo(() => {
    if (!searchTerm) return ingredients;
    return ingredients.filter(ingredient =>
      ingredient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ingredient.category && ingredient.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (ingredient.allergen && ingredient.allergen.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (ingredient.supplier && ingredient.supplier.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [ingredients, searchTerm]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Biblioteca de Ingredientes"
        icon={ShoppingBasket}
        description="Gestiona todos tus ingredientes, proveedores, alérgenos y niveles de stock desde Firestore."
        actions={
          <Button asChild>
            <Link href="/ingredients/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Añadir Ingrediente
            </Link>
          </Button>
        }
      />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Listado de Ingredientes</CardTitle>
          <CardDescription>
            Visualiza y administra tu inventario de ingredientes.
             <Input 
              placeholder="Buscar ingredientes..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="max-w-sm mt-2"
            />
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Cargando ingredientes...</p>
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
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden md:table-cell">Categoría</TableHead>
                  <TableHead className="hidden md:table-cell">Unidad</TableHead>
                  <TableHead className="text-right">Costo/Unidad (€)</TableHead>
                  <TableHead className="hidden lg:table-cell">Alérgeno</TableHead>
                  <TableHead className="hidden sm:table-cell text-center">Stock</TableHead>
                  <TableHead className="w-[50px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIngredients.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                      No se encontraron ingredientes que coincidan con tu búsqueda o no hay ingredientes registrados.
                    </TableCell>
                  </TableRow>
                )}
                {filteredIngredients.map((ingredient) => (
                  <TableRow key={ingredient.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium text-foreground">{ingredient.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{ingredient.category ?? '-'}</TableCell>
                    <TableCell className="hidden md:table-cell">{ingredient.unit}</TableCell>
                    <TableCell className="text-right">
                      {ingredient.costPerUnit?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0,00'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {ingredient.allergen ? <Badge variant="destructive" className="capitalize font-normal"><AlertCircle className="h-3 w-3 mr-1" />{ingredient.allergen}</Badge> : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-center">
                      {ingredient.currentStock !== undefined && ingredient.lowStockThreshold !== undefined && ingredient.currentStock < ingredient.lowStockThreshold ? (
                        <Badge variant="destructive">Bajo ({ingredient.currentStock})</Badge>
                      ) : (
                        <Badge variant={ingredient.currentStock === undefined || ingredient.currentStock === null ? "outline" : "secondary"}>
                          {ingredient.currentStock ?? 'N/A'}
                        </Badge>
                      )}
                    </TableCell>
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
                          <DropdownMenuItem onClick={() => handleEditIngredient(ingredient.id)}>
                            <Pencil className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDeleteIngredient(ingredient.id, ingredient.name)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
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
    </div>
  );
}
