'use server';

/**
 * @fileOverview A flow to generate a photorealistic image of a dish.
 *
 * - generateDishImage - A function that handles the dish image generation process.
 * - GenerateDishImageInput - The input type for the generateDishImage function.
 * - GenerateDishImageOutput - The return type for the generateDishImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDishImageInputSchema = z.object({
  dishDescription: z
    .string()
    .describe('The description of the dish to generate an image for.'),
});
export type GenerateDishImageInput = z.infer<typeof GenerateDishImageInputSchema>;

const GenerateDishImageOutputSchema = z.object({
  imageUrl: z.string().describe('The URL of the generated dish image.'),
});
export type GenerateDishImageOutput = z.infer<typeof GenerateDishImageOutputSchema>;

export async function generateDishImage(input: GenerateDishImageInput): Promise<GenerateDishImageOutput> {
  return generateDishImageFlow(input);
}

const generateDishImageFlow = ai.defineFlow(
  {
    name: 'generateDishImageFlow',
    inputSchema: GenerateDishImageInputSchema,
    outputSchema: GenerateDishImageOutputSchema,
  },
  async input => {
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: `Generate a photorealistic image of a dish described as: ${input.dishDescription}`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    return {imageUrl: media.url!};
  }
);
