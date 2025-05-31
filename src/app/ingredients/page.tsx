
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, MoreHorizontal, ShoppingBasket, AlertCircle, Pencil, Trash2, Loader2, FileUp } from "lucide-react";
import type { Ingredient } from "@/types";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, orderBy, doc, deleteDoc, Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import * as XLSX from 'xlsx';
import { addIngredientsBatchAction } from './actions';
import { LoadingSpinner } from '@/components/loading-spinner';

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchIngredients = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const ingredientsCollection = collection(db, "ingredients");
      const q = query(ingredientsCollection, orderBy("name", "asc"));
      const querySnapshot = await getDocs(q);
      const fetchedIngredients: Ingredient[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
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
  }, [toast]);

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  const handleEditIngredient = (id: string) => {
    alert(`Editar ingrediente ${id} no implementado. Se redirigirá a una página de edición en el futuro.`);
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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = e.target?.result;
        if (data) {
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json: Partial<Ingredient>[] = XLSX.utils.sheet_to_json(worksheet);
          
          // Basic validation for expected columns - more robust validation should be here or server-side
          if (json.length > 0 && !('name' in json[0] && 'unit' in json[0] && 'costPerUnit' in json[0])) {
            toast({
                title: "Error de Formato de Archivo",
                description: "El archivo XLSX no tiene las columnas obligatorias: name, unit, costPerUnit.",
                variant: "destructive",
            });
            setIsImporting(false);
            if(fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
            return;
          }

          const result = await addIngredientsBatchAction(json);

          if (result.success) {
            toast({
              title: "Importación Exitosa",
              description: `${result.count} ingredientes importados correctamente.`,
            });
            if (result.errors.length > 0) {
                toast({
                    title: "Algunos Errores en la Importación",
                    description: `${result.errors.length} ingredientes no pudieron ser importados. Revisa la consola para detalles.`,
                    variant: "warning",
                });
                console.warn("Errores de importación:", result.errors);
            }
            fetchIngredients(); // Refresh list
          } else {
            toast({
              title: "Error en la Importación",
              description: result.errors.length > 0 ? result.errors[0].message : "No se pudieron importar los ingredientes.",
              variant: "destructive",
            });
             console.error("Errores detallados de importación:", result.errors);
          }
        }
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      console.error("Error importing ingredients:", error);
      toast({
        title: "Error al importar",
        description: "Hubo un problema al procesar el archivo XLSX.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      if(fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
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
          <div className="flex gap-2">
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              onChange={handleFileChange} 
              className="hidden" 
              ref={fileInputRef} 
            />
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" disabled={isImporting}>
              {isImporting ? <LoadingSpinner className="mr-2" /> : <FileUp className="mr-2 h-4 w-4" />}
              Importar XLSX
            </Button>
            <Button asChild>
              <Link href="/ingredients/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Ingrediente
              </Link>
            </Button>
          </div>
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
