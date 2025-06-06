
"use server";

import { z } from "zod";
import { adminDb } from "@/lib/firebase/config";
import { FieldValue } from "firebase-admin/firestore";

const inventoryItemSchema = z.object({
  ingredientId: z.string().min(1, { message: "Debe seleccionar un ingrediente." }),
  hotelName: z.string().min(2, { message: "El nombre del hotel debe tener al menos 2 caracteres." }),
  currentStock: z.coerce.number().nonnegative({ message: "El stock actual no puede ser negativo." }),
  averageCostPerUnit: z.coerce.number().nonnegative({ message: "El costo promedio no puede ser negativo." }).optional(),
});

export type InventoryItemFormValues = z.infer<typeof inventoryItemSchema>;

export async function addInventoryItemAction(
  data: InventoryItemFormValues
): Promise<{ success: boolean; inventoryItemId?: string; error?: string }> {
  try {
    const validatedData = inventoryItemSchema.parse(data);
    
    const dataToSave: Partial<InventoryItemFormValues> = {};
    for (const key in validatedData) {
        if (Object.prototype.hasOwnProperty.call(validatedData, key)) {
            const typedKey = key as keyof InventoryItemFormValues;
            const value = validatedData[typedKey];
            if (value !== undefined) {
                (dataToSave as any)[typedKey] = value;
            }
        }
    }

    const docRef = await adminDb.collection("inventory").add({
      ...dataToSave,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { success: true, inventoryItemId: docRef.id };
  } catch (error) {
    console.error("Error adding inventory item to Firestore (admin):", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Error de validación: " + error.errors.map(e => e.message).join(', ') };
    }
    if (error instanceof Error) {
        return { success: false, error: error.message };
    }
    return { success: false, error: "No se pudo añadir el artículo al inventario. Inténtalo de nuevo." };
  }
}
