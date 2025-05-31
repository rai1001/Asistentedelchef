
"use server";

import { z } from "zod";
import { adminDb } from "@/lib/firebase/config";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import type { Ingredient, WasteLogEntry } from "@/types";

const wasteLogEntrySchema = z.object({
  hotelName: z.string().min(2, { message: "El nombre del hotel debe tener al menos 2 caracteres." }),
  ingredientId: z.string().min(1, { message: "Debe seleccionar un ingrediente." }),
  quantity: z.coerce.number().positive({ message: "La cantidad debe ser un número positivo." }),
  unit: z.string().min(1, { message: "La unidad para la merma es requerida." }),
  date: z.date({ required_error: "La fecha de la merma es requerida." }),
  reason: z.string().min(3, { message: "El motivo debe tener al menos 3 caracteres." }),
  notes: z.string().optional(),
  recordedBy: z.string().optional(),
});

export type WasteLogEntryFormValues = z.infer<typeof wasteLogEntrySchema>;

export async function addWasteLogEntryAction(
  data: WasteLogEntryFormValues
): Promise<{ success: boolean; wasteLogEntryId?: string; error?: string }> {
  try {
    const validatedData = wasteLogEntrySchema.parse(data);

    const ingredientDocRef = adminDb.collection("ingredients").doc(validatedData.ingredientId);
    const ingredientSnap = await ingredientDocRef.get();

    if (!ingredientSnap.exists) {
      return { success: false, error: `Ingrediente con ID ${validatedData.ingredientId} no encontrado.` };
    }
    const ingredientData = ingredientSnap.data() as Ingredient;

    const entryToSavePreClean: Omit<WasteLogEntry, 'id' | 'createdAt' | 'ingredientName'> = {
        hotelName: validatedData.hotelName,
        ingredientId: validatedData.ingredientId,
        quantity: validatedData.quantity,
        unit: validatedData.unit,
        date: Timestamp.fromDate(validatedData.date),
        reason: validatedData.reason,
        notes: validatedData.notes,
        recordedBy: validatedData.recordedBy,
    };
    
    const dataToSave: Partial<typeof entryToSavePreClean> = {};
    for (const key in entryToSavePreClean) {
        if (Object.prototype.hasOwnProperty.call(entryToSavePreClean, key)) {
            const value = entryToSavePreClean[key as keyof typeof entryToSavePreClean];
            if (value !== undefined) {
                (dataToSave as any)[key as keyof typeof entryToSavePreClean] = value;
            }
        }
    }

    const docRef = await adminDb.collection("wasteLog").add({
      ...dataToSave,
      ingredientName: ingredientData.name, 
      createdAt: FieldValue.serverTimestamp(),
    });
    return { success: true, wasteLogEntryId: docRef.id };
  } catch (error) {
    console.error("Error adding waste log entry to Firestore (admin):", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Error de validación: " + error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') };
    }
    if (error instanceof Error) {
        return { success: false, error: error.message };
    }
    return { success: false, error: "No se pudo añadir la entrada de merma. Inténtalo de nuevo." };
  }
}
