
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, FileUp, MoreHorizontal, BookOpen, Pencil, Trash2, Loader2, AlertCircle } from "lucide-react";
import type { Recipe } from "@/types";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, orderBy, doc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { importRecipesAction, type RecipeImportItem } from './actions';
import { LoadingSpinner } from '@/components/loading-spinner';

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchRecipes = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const recipesCollection = collection(db, "recipes");
      const q = query(recipesCollection, orderBy("name", "asc"));
      const querySnapshot = await getDocs(q);
      const fetchedRecipes: Recipe[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          category: data.category,
          cost: data.cost,
          prepTime: data.prepTime,
          cuisine: data.cuisine,
          imageUrl: data.imageUrl,
          dataAiHint: data.dataAiHint,
          dietaryTags: data.dietaryTags || [],
          ingredients: data.ingredients || [],
          instructions: data.instructions,
        } as Recipe;
      });
      setRecipes(fetchedRecipes);
    } catch (err) {
      console.error("Error fetching recipes:", err);
      setError("No se pudieron cargar las recetas. Inténtalo de nuevo más tarde.");
      toast({
        title: "Error al cargar recetas",
        description: "Hubo un problema al obtener los datos de Firestore.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const handleEditRecipe = (id: string) => {
    alert(`Editar receta ${id} no implementado. Se redirigirá a una página de edición en el futuro.`);
    // Potentially: router.push(`/recipes/edit/${id}`);
  };

  const handleDeleteRecipe = async (id: string, name: string) => {
    if (confirm(`¿Seguro que quieres eliminar la receta "${name}"? Esta acción no se puede deshacer.`)) {
      try {
        await deleteDoc(doc(db, "recipes", id));
        setRecipes(prev => prev.filter(rec => rec.id !== id));
        toast({
          title: "Receta Eliminada",
          description: `La receta "${name}" ha sido eliminada con éxito.`,
        });
      } catch (error) {
        console.error("Error deleting recipe:", error);
        toast({
          title: "Error al eliminar",
          description: `No se pudo eliminar la receta "${name}". Inténtalo de nuevo.`,
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
          const jsonData: Partial<RecipeImportItem>[] = XLSX.utils.sheet_to_json(worksheet, {defval: ""}); // Capture all columns even if empty
          
          // Basic validation for expected columns
          if (jsonData.length > 0 && (!('name' in jsonData[0]) || !('instructions' in jsonData[0]) || !('ingredientsString' in jsonData[0]))) {
            toast({
                title: "Error de Formato de Archivo",
                description: "El archivo XLSX no tiene las columnas obligatorias: name, instructions, ingredientsString.",
                variant: "destructive",
            });
            setIsImporting(false);
            if(fileInputRef.current) fileInputRef.current.value = "";
            return;
          }

          const result = await importRecipesAction(jsonData);

          if (result.success) {
            toast({
              title: "Importación de Recetas Completada",
              description: `${result.importedCount} recetas importadas correctamente. ${result.errorCount > 0 ? `${result.errorCount} recetas con errores.` : ''}`,
            });
            if (result.errors.length > 0) {
                result.errors.forEach(err => {
                    console.warn(`Error importando receta "${err.recipeName}" (fila ${err.rowIndex + 2}): ${err.errors.join(', ')}`);
                });
                 toast({
                    title: "Detalles de Errores de Importación",
                    description: `Algunas recetas no pudieron importarse. ${result.errors.map(e => `Fila ${e.rowIndex+2}: ${e.errors[0]}`).slice(0,3).join('; ')}... Revisa la consola para más detalles.`,
                    variant: "warning",
                    duration: 9000,
                });
            }
            fetchRecipes(); // Refresh list
          } else {
            toast({
              title: "Error en la Importación de Recetas",
              description: result.errors.length > 0 ? `Errores: ${result.errors.map(e => e.errors[0]).join('; ')}` : "No se pudieron importar las recetas.",
              variant: "destructive",
              duration: 9000,
            });
             console.error("Errores detallados de importación de recetas:", result.errors);
          }
        }
      };
      reader.readAsArrayBuffer(file); // Use readAsArrayBuffer for binary types
    } catch (error) {
      console.error("Error importing recipes:", error);
      toast({
        title: "Error al importar recetas",
        description: "Hubo un problema al procesar el archivo XLSX.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      if(fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
    }
  };


  const filteredRecipes = useMemo(() => {
    if (!searchTerm) return recipes;
    return recipes.filter(recipe => 
      recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (recipe.category && recipe.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (recipe.cuisine && recipe.cuisine.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (recipe.dietaryTags && recipe.dietaryTags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
    );
  }, [recipes, searchTerm]);

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Gestión de Recetas" 
        icon={BookOpen}
        description="Administra tu catálogo de recetas, calcula costos y organiza tu cocina."
        actions={
          <div className="flex gap-2">
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              onChange={handleFileChange} 
              className="hidden" 
              ref={fileInputRef} 
              id="recipe-file-input"
            />
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" disabled={isImporting}>
              {isImporting ? <LoadingSpinner className="mr-2" /> : <FileUp className="mr-2 h-4 w-4" />}
              Importar XLSX (Recetas)
            </Button>
            <Button asChild>
              <Link href="/recipes/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Receta
              </Link>
            </Button>
          </div>
        }
      />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Listado de Recetas</CardTitle>
          <CardDescription>
            Visualiza, edita y organiza todas tus recetas disponibles.
            <Input 
              placeholder="Buscar recetas..." 
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
              <p className="ml-4 text-muted-foreground">Cargando recetas...</p>
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
                  <TableHead className="hidden sm:table-cell w-[80px]">Imagen</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="hidden md:table-cell">Cocina</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">Tiempo (min)</TableHead>
                  <TableHead className="text-right">Costo (€)</TableHead>
                  <TableHead className="w-[50px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecipes.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                      No se encontraron recetas que coincidan con tu búsqueda o no hay recetas registradas.
                    </TableCell>
                  </TableRow>
                )}
                {filteredRecipes.map((recipe) => (
                  <TableRow key={recipe.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="hidden sm:table-cell">
                      <Image
                        src={recipe.imageUrl || "https://placehold.co/64x64/eeeeee/A3B18A?text=R"}
                        alt={recipe.name}
                        width={48}
                        height={48}
                        className="rounded-md object-cover aspect-square"
                        data-ai-hint={recipe.dataAiHint || "food recipe"}
                      />
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{recipe.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{recipe.category || "-"}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{recipe.cuisine || "-"}</TableCell>
                    <TableCell className="hidden lg:table-cell text-right">{recipe.prepTime ?? '-'}</TableCell>
                    <TableCell className="text-right">
                      {recipe.cost?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '-'}
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
                          <DropdownMenuItem onClick={() => handleEditRecipe(recipe.id)}>
                            <Pencil className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDeleteRecipe(recipe.id, recipe.name)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
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
       <Card className="shadow-md mt-8">
        <CardHeader>
            <CardTitle className="font-headline text-lg">Plantilla para Importar Recetas (XLSX)</CardTitle>
            <CardDescription>
                Usa el siguiente formato en tu archivo XLSX. La primera fila debe ser la cabecera. Los nombres de columna deben coincidir.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="font-semibold mb-2">Columnas Requeridas:</p>
            <ul className="list-disc list-inside text-sm space-y-1 mb-4">
                <li><code className="bg-muted px-1 rounded">name</code> (Nombre de la Receta)</li>
                <li><code className="bg-muted px-1 rounded">instructions</code> (Instrucciones detalladas)</li>
                <li><code className="bg-muted px-1 rounded">ingredientsString</code> (Texto con ingredientes. Formato: <code className="bg-muted px-1 rounded text-xs">NombreIng1:Cant1:Uni1;NombreIng2:Cant2:Uni2</code>)</li>
            </ul>
            <p className="font-semibold mb-2">Columnas Opcionales:</p>
            <ul className="list-disc list-inside text-sm space-y-1">
                <li><code className="bg-muted px-1 rounded">category</code> (Ej: Entrante, Plato Principal)</li>
                <li><code className="bg-muted px-1 rounded">prepTime</code> (Tiempo en minutos, ej: 30)</li>
                <li><code className="bg-muted px-1 rounded">cuisine</code> (Ej: Italiana, Mexicana)</li>
                <li><code className="bg-muted px-1 rounded">imageUrl</code> (URL completa de la imagen)</li>
                <li><code className="bg-muted px-1 rounded">dietaryTags</code> (Ej: vegetariana, sin gluten)</li>
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
                Ejemplo para la columna <code className="bg-muted px-1 rounded">ingredientsString</code>: <code className="bg-muted px-1 rounded text-xs">Tomates Frescos:200:g;Cebolla:1:unidad;Aceite de Oliva Virgen Extra:15:ml</code>.
                Los nombres de los ingredientes deben existir previamente en tu Biblioteca de Ingredientes para un cálculo de costos preciso.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}

