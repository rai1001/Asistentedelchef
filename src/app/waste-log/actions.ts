
"use server";

import { z } from "zod";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Ingredient } from "@/types";
import { Timestamp } from "firebase/firestore";

const wasteLogEntrySchema = z.object({
  hotelName: z.string().min(2, { message: "El nombre del hotel debe tener al menos 2 caracteres." }),
  ingredientId: z.string().min(1, { message: "Debe seleccionar un ingrediente." }),
  quantity: z.coerce.number().positive({ message: "La cantidad debe ser un número positivo." }),
  unit: z.string().min(1, { message: "La unidad para la merma es requerida." }),
  date: z.date({ required_error: "La fecha de la merma es requerida." }),
  reason: z.string().min(3, { message: "El motivo debe tener al menos 3 caracteres." }),
  notes: z.string().optional(),
  recordedBy: z.string().optional(), // Could be enhanced with actual user data later
});

export type WasteLogEntryFormValues = z.infer<typeof wasteLogEntrySchema>;

export async function addWasteLogEntryAction(
  data: WasteLogEntryFormValues
): Promise<{ success: boolean; wasteLogEntryId?: string; error?: string }> {
  try {
    const validatedData = wasteLogEntrySchema.parse(data);

    const ingredientDocRef = doc(db, "ingredients", validatedData.ingredientId);
    const ingredientSnap = await getDoc(ingredientDocRef);

    if (!ingredientSnap.exists()) {
      return { success: false, error: `Ingrediente con ID ${validatedData.ingredientId} no encontrado.` };
    }
    const ingredientData = ingredientSnap.data() as Ingredient;

    const docRef = await addDoc(collection(db, "wasteLog"), {
      ...validatedData,
      ingredientName: ingredientData.name, // Denormalize name for easier querying/display
      date: Timestamp.fromDate(validatedData.date),
      createdAt: serverTimestamp(),
    });
    return { success: true, wasteLogEntryId: docRef.id };
  } catch (error) {
    console.error("Error adding waste log entry to Firestore:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Error de validación: " + error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') };
    }
    if (error instanceof Error) {
        return { success: false, error: error.message };
    }
    return { success: false, error: "No se pudo añadir la entrada de merma. Inténtalo de nuevo." };
  }
}
