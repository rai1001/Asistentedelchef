"use client";

import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertTriangle, Users, Utensils, Home } from "lucide-react";
import Image from "next/image";
import type { Recipe } from "@/types";
import React from "react";

const placeholderRecipes: Recipe[] = [
  { id: '1', name: "Paella Valenciana", category: "Plato Principal", cost: 12.5, prepTime: 60, cuisine: "Española", featured: true, ingredients: [], instructions: "", imageUrl: "https://placehold.co/100x75/A3B18A/F5F5DC?text=Paella" , dataAiHint: "paella food" },
  { id: '2', name: "Sopa de Tomate Casera", category: "Entrante", cost: 4.0, prepTime: 30, cuisine: "Internacional", featured: true, ingredients: [], instructions: "", imageUrl: "https://placehold.co/100x75/A3B18A/F5F5DC?text=Sopa" , dataAiHint: "tomato soup"},
  { id: '3', name: "Tiramisú Clásico", category: "Postre", cost: 6.75, prepTime: 25, cuisine: "Italiana", featured: true, ingredients: [], instructions: "", imageUrl: "https://placehold.co/100x75/A3B18A/F5F5DC?text=Tiramisu", dataAiHint: "tiramisu dessert" },
  { id: '4', name: "Ensalada César con Pollo", category: "Plato Principal", cost: 8.20, prepTime: 20, cuisine: "Americana", featured: false, ingredients: [], instructions: "", imageUrl: "https://placehold.co/100x75/A3B18A/F5F5DC?text=Ensalada", dataAiHint: "caesar salad" },
];

export default function DashboardPage() {
  const [kpiData, setKpiData] = React.useState({
    lowStock: 5,
    monthlySales: 12500.75,
    burnoutRisk: 3,
  });
  const [featuredRecipes, setFeaturedRecipes] = React.useState<Recipe[]>(placeholderRecipes.filter(r => r.featured));

  // Placeholder for data fetching
  React.useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      // Update with fetched data if needed
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader title="Panel de Control" icon={Home} description="Resumen general de la operativa de tu cocina." />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          title="Ingredientes Bajos en Stock"
          value={kpiData.lowStock}
          icon={AlertTriangle}
          description="Productos que necesitan reabastecimiento."
        />
        <KpiCard
          title="Ventas del Mes (Estimado)"
          value={`€${kpiData.monthlySales.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={TrendingUp}
          description="Proyección basada en ventas actuales."
        />
        <KpiCard
          title="Riesgo de Burnout (Equipo)"
          value={`${kpiData.burnoutRisk} / 10`}
          icon={Users}
          description="Nivel de estrés y carga laboral del personal."
        />
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline">
            <Utensils className="h-6 w-6 text-primary" />
            Recetas Destacadas
          </CardTitle>
          <CardDescription>Una selección de tus recetas más populares o de temporada.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px] hidden sm:table-cell">Imagen</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="hidden md:table-cell">Cocina</TableHead>
                <TableHead className="text-right">Costo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {featuredRecipes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No hay recetas destacadas disponibles.
                  </TableCell>
                </TableRow>
              )}
              {featuredRecipes.map((recipe) => (
                <TableRow key={recipe.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="hidden sm:table-cell">
                    <Image
                      src={recipe.imageUrl || "https://placehold.co/100x75.png"}
                      alt={recipe.name}
                      width={100}
                      height={75}
                      className="rounded-md object-cover aspect-[4/3]"
                      data-ai-hint={recipe.dataAiHint as string}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{recipe.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{recipe.category}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{recipe.cuisine}</TableCell>
                  <TableCell className="text-right">
                    €{recipe.cost?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? 'N/A'}
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
