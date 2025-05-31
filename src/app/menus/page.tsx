
"use client";

import React from 'react';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, FileUp, LayoutList, TrendingUp, DollarSign, Percent } from "lucide-react";
import type { Menu, Recipe } from "@/types";

const sampleRecipes: Recipe[] = [
  { id: '1', name: "Paella Valenciana", category: "Plato Principal", cost: 12.50, prepTime: 60, cuisine: "Española", ingredients: [], instructions: "" },
  { id: '2', name: "Sopa de Tomate Casera", category: "Entrante", cost: 4.00, prepTime: 30, cuisine: "Internacional", ingredients: [], instructions: "" },
  { id: '3', name: "Tiramisú Clásico", category: "Postre", cost: 6.75, prepTime: 25, cuisine: "Italiana", ingredients: [], instructions: "" },
];

const initialMenus: Menu[] = [
  { id: '1', name: "Menú del Día - Lunes", recipes: [sampleRecipes[0], sampleRecipes[1]], totalCost: 16.50, sellingPrice: 25.00, description: "Un menú equilibrado para empezar la semana." },
  { id: '2', name: "Menú Degustación Fin de Semana", recipes: sampleRecipes, totalCost: 23.25, sellingPrice: 40.00, description: "Experiencia completa con nuestros mejores platos." },
];


export default function MenusPage() {
  const [menus, setMenus] = React.useState<Menu[]>(initialMenus);

  const handleCreateMenu = () => {
    alert("Funcionalidad 'Crear Menú' no implementada. El drag-and-drop no está implementado.");
  };

  const handleImportXLSX = () => {
    alert("Funcionalidad 'Importar XLSX' no implementada.");
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
            <Button onClick={handleCreateMenu}>
              <PlusCircle className="mr-2 h-4 w-4" /> Crear Menú
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {menus.length === 0 && (
            <Card className="md:col-span-2 lg:col-span-3">
                <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">No hay menús creados. ¡Empieza añadiendo uno!</p>
                </CardContent>
            </Card>
        )}
        {menus.map(menu => {
          const profit = menu.sellingPrice && menu.totalCost ? menu.sellingPrice - menu.totalCost : undefined;
          const profitMargin = profit && menu.sellingPrice ? (profit / menu.sellingPrice) * 100 : undefined;

          return (
            <Card key={menu.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
              <CardHeader>
                <CardTitle className="font-headline">{menu.name}</CardTitle>
                <CardDescription>{menu.description || "Sin descripción."}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Recetas Incluidas:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {menu.recipes.map(recipe => (
                    <li key={recipe.id}>{recipe.name}</li>
                  ))}
                </ul>
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
                        <span className="font-semibold text-green-600">€{profit.toFixed(2)}</span>
                    </div>
                  )}
                  {profitMargin !== undefined && (
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground flex items-center"><Percent className="h-4 w-4 mr-1 text-blue-600" />Margen Beneficio Est.:</span>
                        <span className="font-semibold text-blue-600">{profitMargin.toFixed(1)}%</span>
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
