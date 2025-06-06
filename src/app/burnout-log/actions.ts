
"use server";

import { z } from "zod";
import { adminDb } from "@/lib/firebase/config";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import type { BurnoutScore, ShiftType, DemandLevel, SupportLevel, BurnoutLogEntry } from "@/types";

const burnoutScoreValues: [BurnoutScore, ...BurnoutScore[]] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const shiftTypeValues: [ShiftType, ...ShiftType[]] = ['morning', 'afternoon', 'evening', 'split', 'full_day', 'other'];
const demandLevelValues: [DemandLevel, ...DemandLevel[]] = ['low', 'medium', 'high', 'extreme'];
const supportLevelValues: [SupportLevel, ...SupportLevel[]] = ['none', 'poor', 'adequate', 'good', 'excellent'];

const burnoutLogEntrySchema = z.object({
  hotelName: z.string().min(2, { message: "El nombre del hotel debe tener al menos 2 caracteres." }),
  date: z.date({ required_error: "La fecha del registro es requerida." }),
  cookName: z.string().optional(),
  department: z.string().min(2, { message: "La partida/departamento es requerida." }),
  burnoutScore: z.coerce.number().refine((val): val is BurnoutScore => burnoutScoreValues.includes(val as BurnoutScore), {
    message: "La puntuación de burnout debe ser un número entre 1 y 10.",
  }),
  shiftType: z.enum(shiftTypeValues, { required_error: "El tipo de turno es requerido." }),
  hoursWorked: z.coerce.number().positive({ message: "Las horas trabajadas deben ser un número positivo." }),
  peakDemandLevel: z.enum(demandLevelValues, { required_error: "El nivel de demanda pico es requerido." }),
  supportReceived: z.enum(supportLevelValues, { required_error: "El nivel de soporte recibido es requerido." }),
  productionPressureNotes: z.string().optional(),
  salesPressureNotes: z.string().optional(),
  generalNotes: z.string().optional(),
  recordedBy: z.string().optional(),
});

export type BurnoutLogEntryFormValues = z.infer<typeof burnoutLogEntrySchema>;

export async function addBurnoutLogEntryAction(
  data: BurnoutLogEntryFormValues
): Promise<{ success: boolean; entryId?: string; error?: string }> {
  try {
    const validatedData = burnoutLogEntrySchema.parse(data);

    const entryToSavePreClean: Omit<BurnoutLogEntry, 'id' | 'createdAt'> = {
        ...validatedData,
        date: Timestamp.fromDate(validatedData.date),
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

    const docRef = await adminDb.collection("burnoutLogs").add({
      ...dataToSave,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { success: true, entryId: docRef.id };
  } catch (error) {
    console.error("Error adding burnout log entry to Firestore (admin):", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Error de validación: " + error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') };
    }
    if (error instanceof Error) {
        return { success: false, error: error.message };
    }
    return { success: false, error: "No se pudo añadir la entrada de burnout. Inténtalo de nuevo." };
  }
}
