
"use server";

import { z } from "zod";
import { adminDb } from "@/lib/firebase/config";
import { FieldValue } from "firebase-admin/firestore";
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
  console.log("[addIngredientAction] Received data for parsing (admin):", JSON.stringify(data, null, 2));
  try {
    const validatedData = ingredientSchema.parse(data);
    console.log("[addIngredientAction] Validated data (admin, raw from Zod):", JSON.stringify(validatedData, null, 2));

    const dataToSave: Partial<IngredientFormValues> = {};
    for (const key in validatedData) {
      if (Object.prototype.hasOwnProperty.call(validatedData, key)) {
        const typedKey = key as keyof IngredientFormValues;
        const value = validatedData[typedKey];
        if (value !== undefined) {
          (dataToSave as any)[typedKey] = value;
        }
      }
    }
    console.log("[addIngredientAction] Data to save to Firestore (admin, cleaned of undefined):", JSON.stringify(dataToSave, null, 2));

    const docRef = await adminDb.collection("ingredients").add({
      ...dataToSave,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log("[addIngredientAction] Document written with ID (admin): ", docRef.id);
    return { success: true, ingredientId: docRef.id };
  } catch (error) {
    console.error("[addIngredientAction] Error adding ingredient to Firestore (admin):", error);
    if (error instanceof z.ZodError) {
      console.error("[addIngredientAction] Zod validation errors (admin):", JSON.stringify(error.errors, null, 2));
      return { success: false, error: "Error de validación: " + error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') };
    }
    if (error instanceof Error) {
        return { success: false, error: `Error de servidor: ${error.message}` };
    }
    return { success: false, error: "No se pudo añadir el ingrediente. Inténtalo de nuevo." };
  }
}

export async function addIngredientsBatchAction(
  ingredientsData: Partial<Ingredient>[]
): Promise<{ success: boolean; count: number; errors: { index: number, message: string, data: any }[] }> {
  const ingredientsCollection = adminDb.collection("ingredients");
  const batch = adminDb.batch();
  let successCount = 0;
  const errorDetails: { index: number, message: string, data: any }[] = [];
  console.log("[addIngredientsBatchAction] Received ingredientsData count (admin):", ingredientsData.length);

  for (let i = 0; i < ingredientsData.length; i++) {
    const ingredient = ingredientsData[i];
    console.log(`[addIngredientsBatchAction] Processing ingredient at index ${i} (admin):`, ingredient);
    try {
      const validatedData = ingredientSchema.parse({
        name: ingredient.name,
        category: ingredient.category,
        unit: ingredient.unit,
        costPerUnit: Number(ingredient.costPerUnit) || 0,
        supplier: ingredient.supplier,
        allergen: ingredient.allergen,
        description: ingredient.description,
        lowStockThreshold: Number(ingredient.lowStockThreshold) || 0,
        currentStock: Number(ingredient.currentStock) || 0,
      });
      console.log(`[addIngredientsBatchAction] Validated data for index ${i} (admin):`, validatedData);
      
      const dataToSave: Partial<IngredientFormValues> = {};
      for (const key in validatedData) {
        if (Object.prototype.hasOwnProperty.call(validatedData, key)) {
          const typedKey = key as keyof IngredientFormValues;
          const value = validatedData[typedKey];
          if (value !== undefined) {
            (dataToSave as any)[typedKey] = value;
          }
        }
      }

      const newDocRef = ingredientsCollection.doc(); 
      batch.set(newDocRef, {
        ...dataToSave,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      successCount++;
    } catch (error) {
      console.error(`[addIngredientsBatchAction] Error processing ingredient at index ${i} (admin):`, error, ingredient);
      let message = "Error desconocido al procesar el ingrediente.";
      if (error instanceof z.ZodError) {
        message = "Error de validación: " + error.errors.map(e => `${e.path.join('.')} - ${e.message}`).join(', ');
      } else if (error instanceof Error) {
        message = error.message;
      }
      errorDetails.push({ index: i, message, data: ingredient });
    }
  }

  console.log(`[addIngredientsBatchAction] Successfully validated ${successCount} ingredients (admin). Errors on ${errorDetails.length} ingredients.`);

  if (successCount > 0) {
    try {
      await batch.commit();
      console.log("[addIngredientsBatchAction] Batch committed successfully (admin).");
      return { success: true, count: successCount, errors: errorDetails };
    } catch (error) {
      console.error("[addIngredientsBatchAction] Error committing batch to Firestore (admin):", error);
      return { success: false, count: 0, errors: [{ index: -1, message: "Error al guardar el lote en la base de datos.", data: null }, ...errorDetails] };
    }
  } else {
    console.warn("[addIngredientsBatchAction] No ingredients were successfully validated to be added to the batch (admin).");
    return { success: false, count: 0, errors: errorDetails.length > 0 ? errorDetails : [{index: -1, message: "No se procesaron ingredientes válidos.", data: null}] };
  }
}
