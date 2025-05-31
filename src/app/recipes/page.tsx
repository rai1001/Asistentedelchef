"use client";

import React from 'react';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, FileUp, MoreHorizontal, BookOpen, Pencil, Trash2 } from "lucide-react";
import type { Recipe } from "@/types";
import Image from "next/image";

const initialRecipes: Recipe[] = [
  { id: '1', name: "Paella Valenciana", category: "Plato Principal", cost: 12.50, prepTime: 60, cuisine: "Española", ingredients: [], instructions: "", imageUrl: "https://placehold.co/64x64/A3B18A/F5F5DC?text=P", dataAiHint:"paella food" },
  { id: '2', name: "Sopa de Tomate Casera", category: "Entrante", cost: 4.00, prepTime: 30, cuisine: "Internacional", ingredients: [], instructions: "", imageUrl: "https://placehold.co/64x64/A3B18A/F5F5DC?text=S", dataAiHint:"tomato soup" },
  { id: '3', name: "Tiramisú Clásico", category: "Postre", cost: 6.75, prepTime: 25, cuisine: "Italiana", ingredients: [], instructions: "", imageUrl: "https://placehold.co/64x64/A3B18A/F5F5DC?text=T", dataAiHint:"tiramisu dessert" },
];

export default function RecipesPage() {
  const [recipes, setRecipes] = React.useState<Recipe[]>(initialRecipes);
  const [searchTerm, setSearchTerm] = React.useState('');

  const handleAddRecipe = () => {
    // Placeholder: navigation or modal for new recipe
    alert("Funcionalidad 'Añadir Receta' no implementada.");
  };

  const handleImportXLSX = () => {
    alert("Funcionalidad 'Importar XLSX' no implementada.");
  };
  
  const handleEditRecipe = (id: string) => {
    alert(`Editar receta ${id} no implementado.`);
  };

  const handleDeleteRecipe = (id: string) => {
    if(confirm(`¿Seguro que quieres eliminar la receta ${recipes.find(r=>r.id===id)?.name}?`)) {
        setRecipes(prev => prev.filter(recipe => recipe.id !== id));
        // Add toast notification here
    }
  };

  const filteredRecipes = recipes.filter(recipe => 
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.cuisine?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Gestión de Recetas" 
        icon={BookOpen}
        description="Administra tu catálogo de recetas, calcula costos y organiza tu cocina."
        actions={
          <div className="flex gap-2">
            <Button onClick={handleImportXLSX} variant="outline">
              <FileUp className="mr-2 h-4 w-4" /> Importar XLSX
            </Button>
            <Button onClick={handleAddRecipe}>
              <PlusCircle className="mr-2 h-4 w-4" /> Añadir Receta
            </Button>
          </div>
        }
      />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Listado de Recetas</CardTitle>
          <CardDescription>
            Visualiza, edita y organiza todas tus recetas disponibles.
            {/* Placeholder for search input */}
            {/* <Input placeholder="Buscar recetas..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm mt-2" /> */}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              {filteredRecipes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                    No se encontraron recetas.
                  </TableCell>
                </TableRow>
              )}
              {filteredRecipes.map((recipe) => (
                <TableRow key={recipe.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="hidden sm:table-cell">
                    <Image
                      src={recipe.imageUrl || "https://placehold.co/64x64.png"}
                      alt={recipe.name}
                      width={48}
                      height={48}
                      className="rounded-md object-cover aspect-square"
                      data-ai-hint={recipe.dataAiHint as string}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{recipe.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{recipe.category}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{recipe.cuisine}</TableCell>
                  <TableCell className="hidden lg:table-cell text-right">{recipe.prepTime ?? 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    {recipe.cost?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? 'N/A'}
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
                        <DropdownMenuItem onClick={() => handleDeleteRecipe(recipe.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
