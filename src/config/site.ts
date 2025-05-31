
import {
  Home,
  BookOpen,
  LayoutList,
  ShoppingBasket,
  Sparkles,
  Wand2,
  Image as ImageIcon,
  CookingPot,
  BarChartBig, // Añadido para KPIs
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const APP_NAME = "AsistenteDelChef";

export interface NavItemConfig {
  title: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
  matchIncludes?: boolean; // If true, path matches if it includes href
}

export interface NavItemGroupConfig {
  groupTitle: string;
  icon?: LucideIcon;
  items: NavItemConfig[];
}

export const sidebarNavItems: (NavItemConfig | NavItemGroupConfig)[] = [
  { title: "Dashboard", href: "/", icon: Home, matchIncludes: false },
  { title: "Analíticas (KPIs)", href: "/", icon: BarChartBig, matchIncludes: false }, // Nuevo enlace a KPIs, apunta al Dashboard
  { title: "Recetas", href: "/recipes", icon: BookOpen, matchIncludes: true },
  { title: "Menús", href: "/menus", icon: LayoutList, matchIncludes: true },
  { title: "Ingredientes", href: "/ingredients", icon: ShoppingBasket, matchIncludes: true },
  {
    groupTitle: "IA y Machine Learning", // Renombrado
    icon: CookingPot, // Se mantiene el icono temático
    items: [
      { title: "Optimizar Receta", href: "/ai/generate-optimized-recipe", icon: Sparkles, matchIncludes: false },
      { title: "Adaptar Receta", href: "/ai/adapt-recipe", icon: Wand2, matchIncludes: false },
      { title: "Generar Imagen", href: "/ai/generate-dish-image", icon: ImageIcon, matchIncludes: false },
    ],
  },
];
