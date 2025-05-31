
"use server";

import { z } from "zod";
import { collection, addDoc, serverTimestamp, doc, getDoc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Ingredient, Recipe, IngredientQuantity } from "@/types";

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
): Promise<{ success: boolean; recipeId?: string; error?: string; cost?: number }> {
  try {
    const validatedData = recipeFormSchema.parse(data);

    let totalCost = 0;
    const processedIngredients: IngredientQuantity[] = [];

    for (const item of validatedData.ingredients) {
      const ingredientDocRef = doc(db, "ingredients", item.ingredientId);
      const ingredientSnap = await getDoc(ingredientDocRef);

      if (!ingredientSnap.exists()) {
        throw new Error(`Ingrediente con ID ${item.ingredientId} no encontrado.`);
      }
      const ingredientData = ingredientSnap.data() as Ingredient;
      
      const ingredientCost = (ingredientData.costPerUnit || 0) * item.quantity;
      totalCost += ingredientCost;

      processedIngredients.push({
        ingredientId: item.ingredientId,
        name: ingredientData.name, // Store name for easier display, helps avoid extra lookups
        quantity: item.quantity,
        unit: item.unit,
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
      cost: totalCost,
    };

    const docRef = await addDoc(collection(db, "recipes"), {
      ...recipeToSave,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { success: true, recipeId: docRef.id, cost: totalCost };
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

// Schema for recipe import from XLSX
const recipeImportItemSchema = z.object({
  name: z.string().min(3, "El nombre de la receta es obligatorio y debe tener al menos 3 caracteres."),
  category: z.string().optional(),
  prepTime: z.coerce.number().int().nonnegative().optional(),
  cuisine: z.string().optional(),
  instructions: z.string().min(10, "Las instrucciones son obligatorias y deben tener al menos 10 caracteres."),
  imageUrl: z.string().url().optional().or(z.literal('')),
  dietaryTags: z.string().optional(),
  ingredientsString: z.string().min(1, "La cadena de ingredientes es obligatoria."),
});

export type RecipeImportItem = z.infer<typeof recipeImportItemSchema>;

interface ImportErrorDetail {
  rowIndex: number;
  recipeName: string;
  errors: string[];
}

export async function importRecipesAction(
  recipesData: Partial<RecipeImportItem>[]
): Promise<{ success: boolean; importedCount: number; errorCount: number; errors: ImportErrorDetail[] }> {
  
  const ingredientsCollection = collection(db, "ingredients");
  const ingredientsSnapshot = await getDocs(ingredientsCollection);
  const ingredientsMap = new Map<string, Ingredient>();
  ingredientsSnapshot.docs.forEach(doc => {
    const ingredient = { id: doc.id, ...doc.data() } as Ingredient;
    ingredientsMap.set(ingredient.name.toLowerCase(), ingredient);
  });

  const recipesCollection = collection(db, "recipes");
  const batch = writeBatch(db);
  let importedCount = 0;
  const errorDetails: ImportErrorDetail[] = [];

  for (let i = 0; i < recipesData.length; i++) {
    const rawRecipeData = recipesData[i];
    try {
      // Validate the main structure of the recipe data from XLSX
      const validatedRecipeCore = recipeImportItemSchema.parse({
        name: rawRecipeData.name,
        category: rawRecipeData.category,
        prepTime: rawRecipeData.prepTime ? Number(rawRecipeData.prepTime) : undefined,
        cuisine: rawRecipeData.cuisine,
        instructions: rawRecipeData.instructions,
        imageUrl: rawRecipeData.imageUrl,
        dietaryTags: rawRecipeData.dietaryTags,
        ingredientsString: rawRecipeData.ingredientsString,
      });
      
      const recipeIngredients: IngredientQuantity[] = [];
      let currentRecipeCost = 0;
      const ingredientParseErrors: string[] = [];

      if (validatedRecipeCore.ingredientsString) {
        const ingredientsPairs = validatedRecipeCore.ingredientsString.split(';').map(s => s.trim()).filter(s => s);
        for (const pair of ingredientsPairs) {
          const parts = pair.split(':').map(p => p.trim());
          if (parts.length === 3) {
            const ingName = parts[0];
            const ingQuantity = parseFloat(parts[1]);
            const ingUnit = parts[2];

            if (isNaN(ingQuantity) || ingQuantity <= 0) {
              ingredientParseErrors.push(`Cantidad inválida '${parts[1]}' para ingrediente '${ingName}'.`);
              continue;
            }

            const foundIngredient = ingredientsMap.get(ingName.toLowerCase());
            if (foundIngredient) {
              recipeIngredients.push({
                ingredientId: foundIngredient.id,
                name: foundIngredient.name, // Store name for display
                quantity: ingQuantity,
                unit: ingUnit,
              });
              currentRecipeCost += (foundIngredient.costPerUnit || 0) * ingQuantity;
            } else {
              ingredientParseErrors.push(`Ingrediente '${ingName}' no encontrado en la biblioteca.`);
            }
          } else {
            ingredientParseErrors.push(`Formato incorrecto para ingrediente en cadena: '${pair}'. Debe ser 'Nombre:Cantidad:Unidad'.`);
          }
        }
      }
      
      if (recipeIngredients.length === 0 && validatedRecipeCore.ingredientsString) {
         ingredientParseErrors.push('No se pudieron procesar ingredientes válidos de la cadena proporcionada.');
      }
      if (ingredientParseErrors.length > 0) {
        errorDetails.push({ rowIndex: i, recipeName: validatedRecipeCore.name || `Fila ${i+2}`, errors: ingredientParseErrors });
        continue; 
      }


      const dietaryTagsArray = validatedRecipeCore.dietaryTags?.split(',').map(tag => tag.trim()).filter(tag => tag) || [];
      
      const newRecipeDocRef = doc(recipesCollection); // Auto-generate ID
      batch.set(newRecipeDocRef, {
        name: validatedRecipeCore.name,
        category: validatedRecipeCore.category,
        prepTime: validatedRecipeCore.prepTime,
        cuisine: validatedRecipeCore.cuisine,
        instructions: validatedRecipeCore.instructions,
        imageUrl: validatedRecipeCore.imageUrl,
        dietaryTags: dietaryTagsArray,
        ingredients: recipeIngredients,
        cost: currentRecipeCost,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      importedCount++;

    } catch (error: any) {
      let messages = ["Error desconocido al procesar la receta."];
      if (error instanceof z.ZodError) {
        messages = error.errors.map(e => `${e.path.join('.') || 'Campo'}: ${e.message}`);
      } else if (error.message) {
        messages = [error.message];
      }
      errorDetails.push({ rowIndex: i, recipeName: rawRecipeData.name || `Fila ${i+2}`, errors: messages });
    }
  }

  if (importedCount > 0) {
    try {
      await batch.commit();
    } catch (commitError: any) {
      console.error("Error committing recipes batch to Firestore:", commitError);
      // Add a general batch commit error, keeping existing individual errors
      errorDetails.push({ rowIndex: -1, recipeName: "Error de Lote General", errors: ["Error al guardar el lote de recetas en la base de datos: " + commitError.message] });
      return { success: false, importedCount: 0, errorCount: recipesData.length, errors: errorDetails };
    }
  }
  
  return { 
    success: importedCount > 0 || errorDetails.length === 0, 
    importedCount, 
    errorCount: errorDetails.length, 
    errors: errorDetails 
  };
}
