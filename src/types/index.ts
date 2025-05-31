
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
  dietaryTags?: string[]; // e.g., ["vegan", "gluten-free"]
  createdAt?: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string; // e.g., kg, L, piece (This is the base unit for costPerUnit)
  costPerUnit: number;
  supplier?: string;
  allergen?: string; // e.g., "gluten", "dairy", "nuts" - could be an array for multiple
  lowStockThreshold?: number;
  currentStock?: number;
  category?: string;
  description?: string;
  createdAt?: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
}

export interface IngredientQuantity {
  ingredientId: string; // ID from the 'ingredients' collection
  name?: string; // For display purposes in forms, not strictly needed for saving if ID is present
  quantity: number; // Numeric quantity for the recipe
  unit: string; // Unit for this specific quantity in the recipe, e.g., "grams", "ml", "cups", "pieces"
}

// Represents a simplified recipe structure for embedding within a Menu
export interface MenuRecipeItem {
  id: string;
  name: string;
  cost?: number; 
  // Add any other fields from Recipe you want to denormalize into the menu, e.g., category
}

export interface Menu {
  id: string;
  name: string;
  description?: string;
  recipes: MenuRecipeItem[]; // Array of simplified recipe items
  totalCost?: number; // Calculated
  sellingPrice?: number; // Price at which the menu is sold
  hotel?: string;
  period?: 'daily' | 'weekly' | 'monthly' | 'event' | 'other'; // Defines the recurrence or type
  startDate?: any; // Firestore Timestamp or ISO string
  endDate?: any; // Firestore Timestamp or ISO string (optional, e.g., for daily menus startDate might be enough)
  createdAt?: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
}

// For DataTable
export interface ColumnConfig<T> {
  accessorKey: keyof T | string;
  header: string;
  cell?: ({ row }: { row: { getValue: (key: string) => any } }) => React.ReactNode;
}
