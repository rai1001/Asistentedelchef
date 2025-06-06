
"use server";

import { z } from "zod";
import { adminDb } from "@/lib/firebase/config";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import type { IncidentType, OperationalIncident } from "@/types";

const incidentTypeValues: [IncidentType, ...IncidentType[]] = [
  'plate_returned', 
  'customer_complaint', 
  'equipment_failure', 
  'supply_issue', 
  'staff_issue',
  'safety_hygiene',
  'other'
];

const operationalIncidentSchema = z.object({
  hotelName: z.string().min(2, { message: "El nombre del hotel debe tener al menos 2 caracteres." }),
  date: z.date({ required_error: "La fecha de la incidencia es requerida." }),
  incidentType: z.enum(incidentTypeValues, { required_error: "El tipo de incidencia es requerido." }),
  description: z.string().min(10, { message: "La descripción debe tener al menos 10 caracteres." }),
  relatedRecipeOrDepartment: z.string().optional(),
  resolution: z.string().optional(),
  reportedBy: z.string().optional(),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).default('open'),
});

export type OperationalIncidentFormValues = z.infer<typeof operationalIncidentSchema>;

export async function addOperationalIncidentAction(
  data: OperationalIncidentFormValues
): Promise<{ success: boolean; incidentId?: string; error?: string }> {
  try {
    const validatedData = operationalIncidentSchema.parse(data);

    const incidentToSavePreClean: Omit<OperationalIncident, 'id' | 'createdAt' | 'updatedAt'> = {
        ...validatedData,
        date: Timestamp.fromDate(validatedData.date),
    };

    const dataToSave: Partial<typeof incidentToSavePreClean> = {};
    for (const key in incidentToSavePreClean) {
        if (Object.prototype.hasOwnProperty.call(incidentToSavePreClean, key)) {
            const value = incidentToSavePreClean[key as keyof typeof incidentToSavePreClean];
            if (value !== undefined) {
                (dataToSave as any)[key as keyof typeof incidentToSavePreClean] = value;
            }
        }
    }

    const docRef = await adminDb.collection("incidents").add({
      ...dataToSave,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { success: true, incidentId: docRef.id };
  } catch (error) {
    console.error("Error adding operational incident to Firestore (admin):", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Error de validación: " + error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') };
    }
    if (error instanceof Error) {
        return { success: false, error: error.message };
    }
    return { success: false, error: "No se pudo añadir la incidencia. Inténtalo de nuevo." };
  }
}
