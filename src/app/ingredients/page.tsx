"use client";

import React from 'react';
import Link from 'next/link';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, FileUp, MoreHorizontal, ShoppingBasket, AlertCircle, Pencil, Trash2 } from "lucide-react";
import type { Ingredient } from "@/types";
// import { Input } from "@/components/ui/input"; // For search

const initialIngredients: Ingredient[] = [
  { id: '1', name: "Tomates Frescos", unit: "kg", costPerUnit: 2.5, supplier: "Proveedor Local Verduras", allergen: undefined, lowStockThreshold: 5, currentStock: 10, category: "Verduras", description: "Tomates maduros para ensalada y salsa." },
  { id: '2', name: "Harina de Trigo", unit: "kg", costPerUnit: 1.2, supplier: "Distribuidor Harinas SA", allergen: "gluten", lowStockThreshold: 10, currentStock: 8, category: "Secos", description: "Harina de trigo común para panadería y repostería." },
  { id: '3', name: "Aceite de Oliva Virgen Extra", unit: "L", costPerUnit: 8.0, supplier: "Almazara El Olivo", allergen: undefined, lowStockThreshold: 2, currentStock: 3, category: "Aceites", description: "Aceite de oliva de alta calidad." },
  { id: '4', name: "Leche Entera", unit: "L", costPerUnit: 0.9, supplier: "Granja Lechera Local", allergen: "dairy", lowStockThreshold: 5, currentStock: 12, category: "Lácteos", description: "Leche fresca pasteurizada." },
  { id: '5', name: "Huevos Frescos", unit: "docena", costPerUnit: 2.0, supplier: "Granja Avícola Eco", allergen: "egg", lowStockThreshold: 3, currentStock: 2, category: "Huevos", description: "Huevos de gallinas criadas en libertad." },
];

export default function IngredientsPage() {
  const [ingredients, setIngredients] = React.useState<Ingredient[]>(initialIngredients);
  const [searchTerm, setSearchTerm] = React.useState('');

  const handleEditIngredient = (id: string) => {
    alert(`Editar ingrediente ${id} no implementado.`);
  };

  const handleDeleteIngredient = (id: string) => {
     if(confirm(`¿Seguro que quieres eliminar el ingrediente ${ingredients.find(i=>i.id===id)?.name}?`)) {
        setIngredients(prev => prev.filter(ing => ing.id !== id));
        // Add toast notification here
    }
  };

  const filteredIngredients = ingredients.filter(ingredient =>
    ingredient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ingredient.category && ingredient.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (ingredient.allergen && ingredient.allergen.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (ingredient.supplier && ingredient.supplier.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Biblioteca de Ingredientes"
        icon={ShoppingBasket}
        description="Gestiona todos tus ingredientes, proveedores, alérgenos y niveles de stock."
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
            {/* <Input placeholder="Buscar ingredientes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm mt-2" /> */}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              {filteredIngredients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                    No se encontraron ingredientes.
                  </TableCell>
                </TableRow>
              )}
              {filteredIngredients.map((ingredient) => (
                <TableRow key={ingredient.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium text-foreground">{ingredient.name}</TableCell>
                  <TableCell className="hidden md:table-cell">{ingredient.category ?? '-'}</TableCell>
                  <TableCell className="hidden md:table-cell">{ingredient.unit}</TableCell>
                  <TableCell className="text-right">
                    {ingredient.costPerUnit.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {ingredient.allergen ? <Badge variant="destructive" className="capitalize font-normal"><AlertCircle className="h-3 w-3 mr-1" />{ingredient.allergen}</Badge> : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-center">
                    {ingredient.currentStock !== undefined && ingredient.lowStockThreshold !== undefined && ingredient.currentStock < ingredient.lowStockThreshold ? (
                      <Badge variant="destructive">Bajo ({ingredient.currentStock})</Badge>
                    ) : (
                      <Badge variant="secondary">{ingredient.currentStock ?? 'N/A'}</Badge>
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
                        <DropdownMenuItem onClick={() => handleDeleteIngredient(ingredient.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
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
