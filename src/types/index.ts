export interface Recipe {
  id: string;
  name: string;
  ingredients: IngredientQuantity[];
  instructions: string;
  cost?: number; // Calculated or from AI
  prepTime?: number; // in minutes
  imageUrl?: string; // URL from AI or manual upload
  category?: string; // e.g., Appetizer, Main Course, Dessert
  cuisine?: string; // e.g., Italian, Mexican
  featured?: boolean; // For dashboard
  dataAiHint?: string;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string; // e.g., kg, L, piece
  costPerUnit: number;
  supplier?: string;
  allergen?: string; // e.g., "gluten", "dairy", "nuts" - could be an array for multiple
  lowStockThreshold?: number;
  currentStock?: number;
  category?: string; // Nueva propiedad para la categoría del ingrediente
  description?: string; // Nueva propiedad para la descripción del ingrediente
}

export interface IngredientQuantity {
  ingredientId: string;
  name?: string; // For display purposes if ingredient object not readily available
  quantity: number; // Numeric quantity
  unit: string; // Unit for this specific quantity, e.g., "grams", "ml", "cups"
}

export interface Menu {
  id: string;
  name: string;
  description?: string;
  recipes: Recipe[]; // Embedding recipes directly for simplicity, or use IDs
  totalCost?: number; // Calculated
  sellingPrice?: number; // Price at which the menu is sold
  date?: Date; // For daily/weekly menus
}

// For DataTable
export interface ColumnConfig<T> {
  accessorKey: keyof T | string;
  header: string;
  cell?: ({ row }: { row: { getValue: (key: string) => any } }) => React.ReactNode;
}
