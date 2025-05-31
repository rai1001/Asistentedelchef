
"use server";

import { z } from "zod";
import { collection, addDoc, serverTimestamp, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Ingredient } from "@/types";

const ingredientSchema = z.object({
  name: z.string().min(2, { message: "El nombre del ingrediente debe tener al menos 2 caracteres." }),
  category: z.string().optional(),
  unit: z.string().min(1, { message: "La unidad es requerida." }),
  costPerUnit: z.coerce.number().positive({ message: "El costo por unidad debe ser un número positivo." }),
  supplier: z.string().optional(),
  allergen: z.string().optional(),
  description: z.string().optional(),
  lowStockThreshold: z.coerce.number().nonnegative({ message: "El umbral debe ser cero o positivo." }).optional(),
  currentStock: z.coerce.number().nonnegative({ message: "El stock debe ser cero o positivo." }).optional(),
});

type IngredientFormValues = z.infer<typeof ingredientSchema>;

export async function addIngredientAction(
  data: IngredientFormValues
): Promise<{ success: boolean; ingredientId?: string; error?: string }> {
  console.log("[addIngredientAction] Received data:", data);
  try {
    const validatedData = ingredientSchema.parse(data);
    console.log("[addIngredientAction] Validated data (raw from Zod):", validatedData);

    // Create a new object for Firestore, removing any undefined properties
    const dataToSave: Partial<IngredientFormValues> = {};
    for (const key in validatedData) {
      if (Object.prototype.hasOwnProperty.call(validatedData, key)) {
        const value = validatedData[key as keyof IngredientFormValues];
        if (value !== undefined) {
          dataToSave[key as keyof IngredientFormValues] = value;
        }
      }
    }
    console.log("[addIngredientAction] Data to save (cleaned):", dataToSave);


    const docRef = await addDoc(collection(db, "ingredients"), {
      ...dataToSave,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log("[addIngredientAction] Document written with ID: ", docRef.id);
    return { success: true, ingredientId: docRef.id };
  } catch (error) {
    console.error("[addIngredientAction] Error adding ingredient to Firestore:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Error de validación: " + error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') };
    }
    if (error instanceof Error) {
        return { success: false, error: `Error de servidor: ${error.message}` };
    }
    return { success: false, error: "No se pudo añadir el ingrediente. Inténtalo de nuevo." };
  }
}

// Schema for batch import - largely the same but id is not expected from client
const batchIngredientSchema = z.array(
  ingredientSchema.omit({ id: true }) 
);

export async function addIngredientsBatchAction(
  ingredientsData: Partial<Ingredient>[]
): Promise<{ success: boolean; count: number; errors: { index: number, message: string, data: any }[] }> {
  const ingredientsCollection = collection(db, "ingredients");
  const batch = writeBatch(db);
  let successCount = 0;
  const errorDetails: { index: number, message: string, data: any }[] = [];
  console.log("[addIngredientsBatchAction] Received ingredientsData count:", ingredientsData.length);

  for (let i = 0; i < ingredientsData.length; i++) {
    const ingredient = ingredientsData[i];
    console.log(`[addIngredientsBatchAction] Processing ingredient at index ${i}:`, ingredient);
    try {
      // Validate each ingredient. CostPerUnit, lowStockThreshold, currentStock must be numbers.
      const validatedData = ingredientSchema.parse({
        name: ingredient.name,
        category: ingredient.category,
        unit: ingredient.unit,
        costPerUnit: Number(ingredient.costPerUnit) || 0, // Default to 0 if NaN
        supplier: ingredient.supplier,
        allergen: ingredient.allergen,
        description: ingredient.description,
        lowStockThreshold: Number(ingredient.lowStockThreshold) || 0,
        currentStock: Number(ingredient.currentStock) || 0,
      });
      console.log(`[addIngredientsBatchAction] Validated data for index ${i}:`, validatedData);
      
      const dataToSave: Partial<IngredientFormValues> = {};
      for (const key in validatedData) {
        if (Object.prototype.hasOwnProperty.call(validatedData, key)) {
          const value = validatedData[key as keyof IngredientFormValues];
          if (value !== undefined) {
            dataToSave[key as keyof IngredientFormValues] = value;
          }
        }
      }

      const newDocRef = doc(ingredientsCollection); // Auto-generate ID
      batch.set(newDocRef, {
        ...dataToSave,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      successCount++;
    } catch (error) {
      console.error(`[addIngredientsBatchAction] Error processing ingredient at index ${i}:`, error, ingredient);
      let message = "Error desconocido al procesar el ingrediente.";
      if (error instanceof z.ZodError) {
        message = "Error de validación: " + error.errors.map(e => `${e.path.join('.')} - ${e.message}`).join(', ');
      } else if (error instanceof Error) {
        message = error.message;
      }
      errorDetails.push({ index: i, message, data: ingredient });
    }
  }

  console.log(`[addIngredientsBatchAction] Successfully validated ${successCount} ingredients. Errors on ${errorDetails.length} ingredients.`);

  if (successCount > 0) {
    try {
      await batch.commit();
      console.log("[addIngredientsBatchAction] Batch committed successfully.");
      return { success: true, count: successCount, errors: errorDetails };
    } catch (error) {
      console.error("[addIngredientsBatchAction] Error committing batch to Firestore:", error);
      return { success: false, count: 0, errors: [{ index: -1, message: "Error al guardar el lote en la base de datos.", data: null }, ...errorDetails] };
    }
  } else {
    console.warn("[addIngredientsBatchAction] No ingredients were successfully validated to be added to the batch.");
    return { success: false, count: 0, errors: errorDetails.length > 0 ? errorDetails : [{index: -1, message: "No se procesaron ingredientes válidos.", data: null}] };
  }
}
