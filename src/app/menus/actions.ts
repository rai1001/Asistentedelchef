
"use server";

import { z } from "zod";
import { adminDb } from "@/lib/firebase/config";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import type { Recipe, Menu, MenuRecipeItem } from "@/types";

const menuFormSchema = z.object({
  name: z.string().min(3, { message: "El nombre del menú debe tener al menos 3 caracteres." }),
  description: z.string().optional(),
  hotel: z.string().optional(),
  period: z.enum(['daily', 'weekly', 'monthly', 'event', 'other'], {
    errorMap: () => ({ message: "Selecciona un período válido." })
  }),
  startDate: z.date({ required_error: "La fecha de inicio es requerida." }),
  endDate: z.date().optional(),
  recipeIds: z.array(z.string()).min(1, { message: "Debes seleccionar al menos una receta." }),
  sellingPrice: z.coerce.number().positive({ message: "El precio de venta debe ser un número positivo." }).optional(),
});

export type MenuFormValues = z.infer<typeof menuFormSchema>;

export async function addMenuAction(
  data: MenuFormValues
): Promise<{ success: boolean; menuId?: string; error?: string }> {
  try {
    const validatedData = menuFormSchema.parse(data);

    let totalCost = 0;
    const menuRecipes: MenuRecipeItem[] = [];

    if (validatedData.recipeIds.length > 0) {
      const recipesQuery = adminDb.collection("recipes").where(admin.firestore.FieldPath.documentId(), "in", validatedData.recipeIds);
      const recipesSnapshot = await recipesQuery.get();
      
      const foundRecipesMap = new Map<string, Recipe>();
      recipesSnapshot.docs.forEach(docSnap => {
        foundRecipesMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as Recipe);
      });

      for (const recipeId of validatedData.recipeIds) {
        const recipeData = foundRecipesMap.get(recipeId);
        if (!recipeData) {
          console.warn(`Receta con ID ${recipeId} no encontrada. Será omitida del menú.`);
          continue;
        }
        
        const recipeItemForMenu: MenuRecipeItem = {
          id: recipeData.id,
          name: recipeData.name,
        };
        if (recipeData.cost !== undefined && recipeData.cost !== null) { // Ensure cost is a valid number
            totalCost += recipeData.cost;
            recipeItemForMenu.cost = recipeData.cost;
        } else {
            // Handle case where cost might be undefined or null, perhaps log it or assign a default
            console.warn(`Costo no definido para la receta ${recipeData.name} (ID: ${recipeId}). No se sumará al costo total del menú.`);
        }
        menuRecipes.push(recipeItemForMenu);
      }
    }
    
    const menuToSavePreClean: Omit<Menu, 'id' | 'createdAt' | 'updatedAt'> = {
      name: validatedData.name,
      description: validatedData.description,
      hotel: validatedData.hotel,
      period: validatedData.period,
      startDate: Timestamp.fromDate(validatedData.startDate),
      endDate: validatedData.endDate ? Timestamp.fromDate(validatedData.endDate) : undefined,
      recipes: menuRecipes,
      totalCost: totalCost,
      sellingPrice: validatedData.sellingPrice,
    };

    const menuToSave: Partial<Omit<Menu, 'id' | 'createdAt' | 'updatedAt'>> = {};
    for (const key in menuToSavePreClean) {
        if (Object.prototype.hasOwnProperty.call(menuToSavePreClean, key)) {
            const typedKey = key as keyof typeof menuToSavePreClean;
            const value = menuToSavePreClean[typedKey];
            if (value !== undefined) {
                (menuToSave as any)[typedKey] = value;
            }
        }
    }
    
    if (menuToSave.endDate === undefined) {
        menuToSave.endDate = null; 
    }

    const docRef = await adminDb.collection("menus").add({
      ...menuToSave,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { success: true, menuId: docRef.id };
  } catch (error) {
    console.error("Error adding menu to Firestore (admin):", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Error de validación: " + error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') };
    }
    if (error instanceof Error) {
        return { success: false, error: error.message };
    }
    return { success: false, error: "No se pudo añadir el menú. Inténtalo de nuevo." };
  }
}
