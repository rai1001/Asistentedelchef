
"use server";

import { z } from "zod";
import { adminDb } from "@/lib/firebase/config";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import type { ProductionPlan } from "@/types";

const productionPlanRecipeItemSchema = z.object({
  recipeId: z.string().min(1, "Debe seleccionar una receta."),
  recipeName: z.string().min(1, "El nombre de la receta es requerido."),
  targetQuantity: z.coerce.number().positive("La cantidad objetivo debe ser positiva."),
});

const productionPlanFormSchema = z.object({
  name: z.string().min(3, { message: "El nombre del plan debe tener al menos 3 caracteres." }),
  hotelName: z.string().min(2, { message: "El nombre del hotel debe tener al menos 2 caracteres." }),
  planDate: z.date({ required_error: "La fecha del plan es requerida." }),
  recipes: z.array(productionPlanRecipeItemSchema).min(1, { message: "Debe incluir al menos una receta en el plan." }),
  notes: z.string().optional(),
});

export type ProductionPlanFormValues = z.infer<typeof productionPlanFormSchema>;

export async function addProductionPlanAction(
  data: ProductionPlanFormValues
): Promise<{ success: boolean; productionPlanId?: string; error?: string }> {
  try {
    const validatedData = productionPlanFormSchema.parse(data);

    const planToSavePreClean: Omit<ProductionPlan, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'totalIngredientsRequired' | 'stockAnalysis'> = {
      name: validatedData.name,
      hotelName: validatedData.hotelName,
      planDate: Timestamp.fromDate(validatedData.planDate),
      recipes: validatedData.recipes, 
      notes: validatedData.notes,
    };

    const dataToSave: Partial<typeof planToSavePreClean> = {};
    for (const key in planToSavePreClean) {
        if (Object.prototype.hasOwnProperty.call(planToSavePreClean, key)) {
            const value = planToSavePreClean[key as keyof typeof planToSavePreClean];
            if (value !== undefined) {
                (dataToSave as any)[key as keyof typeof planToSavePreClean] = value;
            }
        }
    }
    
    const docRef = await adminDb.collection("productionPlans").add({
      ...dataToSave,
      status: 'Planeado', 
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { success: true, productionPlanId: docRef.id };
  } catch (error) {
    console.error("Error adding production plan to Firestore (admin):", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Error de validación: " + error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') };
    }
    if (error instanceof Error) {
        return { success: false, error: error.message };
    }
    return { success: false, error: "No se pudo añadir el plan de producción. Inténtalo de nuevo." };
  }
}
