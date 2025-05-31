
import type { Timestamp } from "firebase/firestore";

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
  category?: string;
  unit: string; // e.g., kg, L, piece (This is the base unit for costPerUnit)
  costPerUnit: number;
  supplier?: string;
  allergen?: string; // e.g., "gluten", "dairy", "nuts" - could be an array for multiple
  description?: string;
  lowStockThreshold?: number;
  currentStock?: number; // This might be better managed in a separate inventory collection
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

// For Inventory Management
export interface InventoryItem {
  id: string; // Firestore document ID of this inventory record
  ingredientId: string; // FK to the 'ingredients' collection
  hotelName: string; // Name of the hotel or location
  currentStock: number; // Current quantity in stock
  averageCostPerUnit?: number; // Weighted average cost for the unit defined in the Ingredient
  // unit is implicitly taken from the linked Ingredient document
  createdAt?: Timestamp; // Firestore Timestamp, for when item was created
  updatedAt?: Timestamp; // Firestore Timestamp, for when the stock was last updated
}

// Combined type for displaying inventory items with ingredient details
export interface DisplayInventoryItem extends InventoryItem {
  ingredientName: string;
  unit: string; // Base unit from the Ingredient document
  lowStockThreshold?: number; // From the Ingredient document
  isLowStock: boolean;
}

// For Waste Log
export interface WasteLogEntry {
  id: string; // Firestore document ID
  hotelName: string;
  ingredientId: string;
  ingredientName: string; // Denormalized for easier display
  quantity: number;
  unit: string; // Unit of the wasted quantity
  date: Timestamp; // Firestore Timestamp
  reason: string; // Could be enum: "Expired", "Spoiled", "Burnt", "Dropped", "Contaminated", "Overproduction", "Plate Waste", "Other"
  notes?: string;
  recordedBy?: string; // User ID or name, if auth is implemented
  createdAt?: Timestamp; // Firestore Timestamp
}

// For Production Planning
export interface ProductionPlanRecipeItem {
  recipeId: string;
  recipeName: string; // Denormalized for easier display
  targetQuantity: number;
  // unit could be derived from the recipe or specified if needed
}

export type ProductionPlanStatus = 'Planeado' | 'En Progreso' | 'Completado' | 'Cancelado';

export interface ProductionPlan {
  id: string;
  name: string;
  hotelName: string;
  planDate: Timestamp;
  recipes: ProductionPlanRecipeItem[];
  status: ProductionPlanStatus;
  notes?: string;
  totalIngredientsRequired?: any; // To be implemented later: structure for aggregated ingredients
  stockAnalysis?: any; // To be implemented later: structure for stock comparison
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// For Burnout Log
export type BurnoutScore = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type ShiftType = 'morning' | 'afternoon' | 'evening' | 'split' | 'full_day' | 'other';
export type DemandLevel = 'low' | 'medium' | 'high' | 'extreme';
export type SupportLevel = 'none' | 'poor' | 'adequate' | 'good' | 'excellent';

export interface BurnoutLogEntry {
  id: string; // Firestore document ID
  hotelName: string;
  date: Timestamp; // Firestore Timestamp for when the observation/log is made
  cookName?: string; // Optional: Name or identifier of the cook
  department: string; // "Partida" or department
  burnoutScore: BurnoutScore; // Scale of 1-10
  shiftType: ShiftType; // e.g., morning, evening, split
  hoursWorked: number; // Hours worked in that shift or day
  peakDemandLevel: DemandLevel; // Perceived peak demand during the shift
  supportReceived: SupportLevel; // Perceived level of support received
  productionPressureNotes?: string; // Specific notes on pressure from production targets
  salesPressureNotes?: string; // Specific notes on pressure from sales/service demands
  generalNotes?: string; // Any other relevant observations
  recordedBy?: string; // Optional: User who recorded the entry
  createdAt?: Timestamp; // Firestore Timestamp for when the record was created
}


// For DataTable
export interface ColumnConfig<T> {
  accessorKey: keyof T | string;
  header: string;
  cell?: ({ row }: { row: { getValue: (key: string) => any } }) => React.ReactNode;
}
