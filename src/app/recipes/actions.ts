
"use server";

import { z } from "zod";
import { adminDb } from "@/lib/firebase/config";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import type { Ingredient, Recipe, IngredientQuantity, RecipeImportItem as RecipeImportItemType, RecipeNutritionAnalysisOutput } from "@/types";
import { analyzeRecipeNutrition } from "@/ai/flows/analyze-recipe-nutrition";

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
  dietaryTags: z.string().optional(),
  ingredients: z.array(ingredientQuantitySchema).min(1, "La receta debe tener al menos un ingrediente."),
});

export type RecipeFormValues = z.infer<typeof recipeFormSchema>;

export async function addRecipeAction(
  data: RecipeFormValues
): Promise<{ success: boolean; recipeId?: string; error?: string; cost?: number }> {
  console.log("[addRecipeAction] Received data (admin):", JSON.stringify(data, null, 2));
  try {
    const validatedData = recipeFormSchema.parse(data);
    console.log("[addRecipeAction] Validated data (admin):", JSON.stringify(validatedData, null, 2));

    let totalCost = 0;
    const processedIngredients: IngredientQuantity[] = [];
    let ingredientsStringForAI = "";

    console.log("[addRecipeAction] Processing ingredients (admin)...");
    for (const item of validatedData.ingredients) {
      console.log(`[addRecipeAction] Processing ingredient item (admin): ID='${item.ingredientId}', Qty: ${item.quantity}, Unit: '${item.unit}'`);
      if (!item.ingredientId) { 
        console.error("[addRecipeAction] Encountered an ingredient item with empty ID (admin).");
        return { success: false, error: "Se encontró un ingrediente sin seleccionar en la lista. Por favor, revisa los ingredientes de la receta." };
      }
      const ingredientDocRef = adminDb.collection("ingredients").doc(item.ingredientId);
      const ingredientSnap = await ingredientDocRef.get();

      if (!ingredientSnap.exists) {
        console.error(`[addRecipeAction] Ingredient with ID '${item.ingredientId}' not found (admin).`);
        return { success: false, error: `El ingrediente base con ID '${item.ingredientId}' no se encontró. Es posible que haya sido eliminado. Por favor, verifica la selección.` };
      }
      const ingredientData = ingredientSnap.data() as Ingredient;
      console.log(`[addRecipeAction] Found ingredient (admin): ${ingredientData.name}, Cost/Unit: ${ingredientData.costPerUnit}`);
      
      const ingredientCost = (ingredientData.costPerUnit || 0) * item.quantity;
      totalCost += ingredientCost;

      processedIngredients.push({
        ingredientId: item.ingredientId,
        name: ingredientData.name, 
        quantity: item.quantity,
        unit: item.unit,
      });
      ingredientsStringForAI += `${item.quantity}${item.unit} ${ingredientData.name}; `;
    }
    ingredientsStringForAI = ingredientsStringForAI.trim().slice(0, -1);
    console.log("[addRecipeAction] Processed ingredients (admin). Total cost:", totalCost);
    console.log("[addRecipeAction] Ingredients string for AI (admin):", ingredientsStringForAI || "Not generating AI string (empty)");

    const dietaryTagsArray = validatedData.dietaryTags?.split(',').map(tag => tag.trim()).filter(tag => tag) || [];
    console.log("[addRecipeAction] Dietary tags (admin):", dietaryTagsArray);

    const recipePreSave: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt' | 'nutritionalInfo'> = {
      name: validatedData.name,
      category: validatedData.category,
      prepTime: validatedData.prepTime,
      cuisine: validatedData.cuisine,
      instructions: validatedData.instructions,
      imageUrl: validatedData.imageUrl,
      dietaryTags: dietaryTagsArray,
      ingredients: processedIngredients,
      cost: isNaN(totalCost) ? 0 : totalCost,
    };
    
    const recipeToSave: Partial<typeof recipePreSave> = {};
    for (const key in recipePreSave) {
      if (Object.prototype.hasOwnProperty.call(recipePreSave, key)) {
        const value = recipePreSave[key as keyof typeof recipePreSave];
        if (value !== undefined) {
          (recipeToSave as any)[key as keyof typeof recipePreSave] = value;
        }
      }
    }
    console.log("[addRecipeAction] Recipe object to save (admin, cleaned, without nutritionalInfo):", JSON.stringify(recipeToSave, null, 2));

    const docRef = await adminDb.collection("recipes").add({
      ...recipeToSave,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log("[addRecipeAction] Recipe base document written with ID (admin): ", docRef.id);

    if (ingredientsStringForAI) {
      console.log("[addRecipeAction] Calling AI for nutritional analysis for recipe (admin):", validatedData.name);
      analyzeRecipeNutrition({ recipeName: validatedData.name, ingredientsString: ingredientsStringForAI })
        .then(nutritionData => {
          if (nutritionData) {
            const cleanNutritionData: Partial<RecipeNutritionAnalysisOutput> = { ...nutritionData };
            if (cleanNutritionData.disclaimer === undefined) {
              delete cleanNutritionData.disclaimer; 
            }
            console.log("[addRecipeAction] Nutritional info received for recipe ID (admin)", docRef.id, ":", JSON.stringify(cleanNutritionData, null, 2));
            adminDb.collection("recipes").doc(docRef.id).update({
              nutritionalInfo: cleanNutritionData,
              updatedAt: FieldValue.serverTimestamp(),
            }).then(() => {
              console.log("[addRecipeAction] Recipe updated with nutritional info for ID (admin):", docRef.id);
            }).catch(updateError => {
              console.error("[addRecipeAction] Error updating recipe (ID (admin):", docRef.id, ") with nutritional info:", updateError);
            });
          } else {
            console.warn("[addRecipeAction] AI did not return nutritional data for recipe (admin):", validatedData.name, "(ID:", docRef.id, ")");
          }
        })
        .catch(aiError => {
          console.error("[addRecipeAction] Error getting nutritional analysis from AI for recipe (ID (admin):", docRef.id, "):", aiError);
        });
    } else {
        console.log("[addRecipeAction] No ingredients string for AI, skipping nutritional analysis for recipe (ID (admin):", docRef.id, ").");
    }

    return { success: true, recipeId: docRef.id, cost: recipeToSave.cost };
  } catch (error) {
    console.error("[addRecipeAction] Error adding recipe (admin):", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Error de validación: " + error.errors.map(e => `${e.path.join('.')} - ${e.message}`).join(', ') };
    }
    if (error instanceof Error) {
        return { success: false, error: `Error de servidor: ${error.message}` };
    }
    return { success: false, error: "No se pudo añadir la receta. Inténtalo de nuevo." };
  }
}

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
  recipesData: Partial<RecipeImportItemType>[]
): Promise<{ success: boolean; importedCount: number; errorCount: number; errors: ImportErrorDetail[] }> {
  
  console.log("[importRecipesAction] Starting recipe import (admin). Number of items:", recipesData.length);
  const ingredientsCollection = adminDb.collection("ingredients");
  const ingredientsSnapshot = await ingredientsCollection.get();
  const ingredientsMap = new Map<string, Ingredient>();
  ingredientsSnapshot.docs.forEach(docSnap => { 
    const ingredient = { id: docSnap.id, ...docSnap.data() } as Ingredient;
    ingredientsMap.set(ingredient.name.toLowerCase(), ingredient);
  });
  console.log("[importRecipesAction] Loaded (admin)", ingredientsMap.size, "ingredients into map.");

  const recipesCollection = adminDb.collection("recipes");
  const batch = adminDb.batch();
  let importedCount = 0;
  const errorDetails: ImportErrorDetail[] = [];

  for (let i = 0; i < recipesData.length; i++) {
    const rawRecipeData = recipesData[i];
    const currentRecipeNameForLog = rawRecipeData.name || `Fila ${i+2}`;
    console.log(`[importRecipesAction] Processing row ${i+2} (admin), recipe: ${currentRecipeNameForLog}`);
    try {
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
      console.log(`[importRecipesAction] Core data validated for ${currentRecipeNameForLog} (admin).`);
      
      const recipeIngredients: IngredientQuantity[] = [];
      let currentRecipeCost = 0;
      const ingredientParseErrors: string[] = [];
      let ingredientsStringForAI = "";

      if (validatedRecipeCore.ingredientsString) {
        const ingredientsPairs = validatedRecipeCore.ingredientsString.split(';').map(s => s.trim()).filter(s => s);
        console.log(`[importRecipesAction] Parsing ${ingredientsPairs.length} ingredient pairs for ${currentRecipeNameForLog} (admin).`);
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
                name: foundIngredient.name, 
                quantity: ingQuantity,
                unit: ingUnit,
              });
              currentRecipeCost += (foundIngredient.costPerUnit || 0) * ingQuantity;
              ingredientsStringForAI += `${ingQuantity}${ingUnit} ${foundIngredient.name}; `;
            } else {
              ingredientParseErrors.push(`Ingrediente '${ingName}' no encontrado en la biblioteca.`);
            }
          } else {
            ingredientParseErrors.push(`Formato incorrecto para ingrediente en cadena: '${pair}'. Debe ser 'Nombre:Cantidad:Unidad'.`);
          }
        }
      }
      ingredientsStringForAI = ingredientsStringForAI.trim().slice(0, -1);
      
      if (recipeIngredients.length === 0 && validatedRecipeCore.ingredientsString) {
         ingredientParseErrors.push('No se pudieron procesar ingredientes válidos de la cadena proporcionada.');
      }
      if (ingredientParseErrors.length > 0) {
        console.warn(`[importRecipesAction] Ingredient parse errors for ${currentRecipeNameForLog} (admin):`, ingredientParseErrors);
        errorDetails.push({ rowIndex: i, recipeName: currentRecipeNameForLog, errors: ingredientParseErrors });
        continue; 
      }
      console.log(`[importRecipesAction] Ingredients processed for ${currentRecipeNameForLog} (admin). Count: ${recipeIngredients.length}, Cost: ${currentRecipeCost}`);

      const dietaryTagsArray = validatedRecipeCore.dietaryTags?.split(',').map(tag => tag.trim()).filter(tag => tag) || [];
      
      const recipePreImport = {
        name: validatedRecipeCore.name,
        category: validatedRecipeCore.category,
        prepTime: validatedRecipeCore.prepTime,
        cuisine: validatedRecipeCore.cuisine,
        instructions: validatedRecipeCore.instructions,
        imageUrl: validatedRecipeCore.imageUrl,
        dietaryTags: dietaryTagsArray,
        ingredients: recipeIngredients,
        cost: isNaN(currentRecipeCost) ? 0 : currentRecipeCost,
      };

      const recipeToImportInBatch: Partial<typeof recipePreImport> = {};
      for (const key in recipePreImport) {
        if (Object.prototype.hasOwnProperty.call(recipePreImport, key)) {
          const value = recipePreImport[key as keyof typeof recipePreImport];
          if (value !== undefined) {
            (recipeToImportInBatch as any)[key as keyof typeof recipePreImport] = value;
          }
        }
      }

      const newRecipeDocRef = recipesCollection.doc(); 
      batch.set(newRecipeDocRef, {
        ...recipeToImportInBatch,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      importedCount++;
      console.log(`[importRecipesAction] Recipe ${currentRecipeNameForLog} (ID: ${newRecipeDocRef.id}) added to batch (admin).`);

      if (ingredientsStringForAI) {
         console.log(`[importRecipesAction] Queueing nutritional analysis for ${currentRecipeNameForLog} (ID: ${newRecipeDocRef.id}) (admin)`);
         analyzeRecipeNutrition({ recipeName: validatedRecipeCore.name, ingredientsString: ingredientsStringForAI })
          .then(nutritionData => {
            if (nutritionData) {
              const cleanNutritionData: Partial<RecipeNutritionAnalysisOutput> = { ...nutritionData };
              if (cleanNutritionData.disclaimer === undefined) {
                delete cleanNutritionData.disclaimer;
              }
              console.log(`[importRecipesAction] Nutritional info received for ${currentRecipeNameForLog} (ID: ${newRecipeDocRef.id}) (admin):`, JSON.stringify(cleanNutritionData, null, 2));
              adminDb.collection("recipes").doc(newRecipeDocRef.id).update({ 
                nutritionalInfo: cleanNutritionData,
                updatedAt: FieldValue.serverTimestamp(),
              }).catch(updateError => {
                console.warn(`[importRecipesAction] Error updating imported recipe ${currentRecipeNameForLog} (ID: ${newRecipeDocRef.id}) with nutritional info (admin):`, updateError);
              });
            } else {
                console.warn(`[importRecipesAction] AI did not return nutritional data for ${currentRecipeNameForLog} (ID: ${newRecipeDocRef.id}) (admin)`);
            }
          })
          .catch(aiError => {
            console.warn(`[importRecipesAction] Error getting nutritional analysis for imported recipe ${currentRecipeNameForLog} (ID: ${newRecipeDocRef.id}) (admin):`, aiError);
          });
      }

    } catch (error: any) {
      let messages = ["Error desconocido al procesar la receta."];
      if (error instanceof z.ZodError) {
        messages = error.errors.map(e => `${e.path.join('.') || 'Campo'}: ${e.message}`);
      } else if (error.message) {
        messages = [error.message];
      }
      console.error(`[importRecipesAction] Error processing ${currentRecipeNameForLog} (admin):`, messages, rawRecipeData);
      errorDetails.push({ rowIndex: i, recipeName: currentRecipeNameForLog, errors: messages });
    }
  }

  console.log(`[importRecipesAction] Batch processing complete (admin). Imported: ${importedCount}, Errors: ${errorDetails.length}`);
  if (importedCount > 0) {
    try {
      await batch.commit();
      console.log("[importRecipesAction] Batch committed successfully (admin).");
    } catch (commitError: any) {
      console.error("[importRecipesAction] Error committing recipes batch to Firestore (admin):", commitError);
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
