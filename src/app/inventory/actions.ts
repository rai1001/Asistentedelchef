
"use server";

import { z } from "zod";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

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
    
    const docRef = await addDoc(collection(db, "inventory"), {
      ...validatedData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, inventoryItemId: docRef.id };
  } catch (error) {
    console.error("Error adding inventory item to Firestore:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Error de validación: " + error.errors.map(e => e.message).join(', ') };
    }
    return { success: false, error: "No se pudo añadir el artículo al inventario. Inténtalo de nuevo." };
  }
}
