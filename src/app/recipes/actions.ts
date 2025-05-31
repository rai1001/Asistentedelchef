
"use server";

import { z } from "zod";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Ingredient, Recipe } from "@/types";

const ingredientQuantitySchema = z.object({
  ingredientId: z.string().min(1, "Se debe seleccionar un ingrediente."),
  quantity: z.coerce.number().positive("La cantidad debe ser positiva."),
  unit: z.string().min(1, "La unidad es requerida para el ingrediente."),
});

const recipeFormSchema = z.object({
  name: z.string().min(3, { message: "El nombre de la receta debe tener al menos 3 caracteres." }),
  category: z.string().optional(),
  prepTime: z.coerce.number().int().nonnegative("El tiempo de preparación debe ser un número positivo o cero.").optional(),
  cuisine: z.string().optional(),
  instructions: z.string().min(10, { message: "Las instrucciones deben tener al menos 10 caracteres." }),
  imageUrl: z.string().url({ message: "Introduce una URL válida para la imagen." }).optional().or(z.literal('')),
  dietaryTags: z.string().optional(), // Comma-separated string, will be converted to array
  ingredients: z.array(ingredientQuantitySchema).min(1, "La receta debe tener al menos un ingrediente."),
});

export type RecipeFormValues = z.infer<typeof recipeFormSchema>;

export async function addRecipeAction(
  data: RecipeFormValues
): Promise<{ success: boolean; recipeId?: string; error?: string }> {
  try {
    const validatedData = recipeFormSchema.parse(data);

    let totalCost = 0;
    const processedIngredients = [];

    for (const item of validatedData.ingredients) {
      const ingredientDocRef = doc(db, "ingredients", item.ingredientId);
      const ingredientSnap = await getDoc(ingredientDocRef);

      if (!ingredientSnap.exists()) {
        throw new Error(`Ingrediente con ID ${item.ingredientId} no encontrado.`);
      }
      const ingredientData = ingredientSnap.data() as Ingredient;
      
      // Simplified cost calculation: assumes ingredient.costPerUnit is for the unit used in recipe.
      // Or that quantity specified is directly multipliable.
      // TODO: Implement unit conversion for more accurate costing if base unit differs from recipe unit.
      const ingredientCost = ingredientData.costPerUnit * item.quantity;
      totalCost += ingredientCost;

      processedIngredients.push({
        ingredientId: item.ingredientId,
        quantity: item.quantity,
        unit: item.unit,
        // name: ingredientData.name, // Optionally store name for easier display later, reduces lookups
      });
    }

    const dietaryTagsArray = validatedData.dietaryTags?.split(',').map(tag => tag.trim()).filter(tag => tag) || [];

    const recipeToSave: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'> = {
      name: validatedData.name,
      category: validatedData.category,
      prepTime: validatedData.prepTime,
      cuisine: validatedData.cuisine,
      instructions: validatedData.instructions,
      imageUrl: validatedData.imageUrl,
      dietaryTags: dietaryTagsArray,
      ingredients: processedIngredients,
      cost: totalCost, // Calculated cost
    };

    const docRef = await addDoc(collection(db, "recipes"), {
      ...recipeToSave,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { success: true, recipeId: docRef.id };
  } catch (error) {
    console.error("Error adding recipe to Firestore:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Error de validación: " + error.errors.map(e => e.message).join(', ') };
    }
    if (error instanceof Error) {
        return { success: false, error: error.message };
    }
    return { success: false, error: "No se pudo añadir la receta. Inténtalo de nuevo." };
  }
}
