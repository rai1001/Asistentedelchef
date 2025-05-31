
"use server";

import { z } from "zod";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

const formSchema = z.object({
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

type IngredientFormValues = z.infer<typeof formSchema>;

export async function addIngredientAction(
  data: IngredientFormValues
): Promise<{ success: boolean; ingredientId?: string; error?: string }> {
  try {
    const validatedData = formSchema.parse(data);
    const docRef = await addDoc(collection(db, "ingredients"), {
      ...validatedData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, ingredientId: docRef.id };
  } catch (error) {
    console.error("Error adding ingredient to Firestore:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Error de validación: " + error.errors.map(e => e.message).join(', ') };
    }
    return { success: false, error: "No se pudo añadir el ingrediente. Inténtalo de nuevo." };
  }
}
