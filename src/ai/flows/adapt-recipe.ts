'use server';

/**
 * @fileOverview Adapts an existing recipe based on dietary restrictions, preparation time, and budget constraints.
 *
 * - adaptRecipe - A function that handles the recipe adaptation process.
 * - AdaptRecipeInput - The input type for the adaptRecipe function.
 * - AdaptRecipeOutput - The return type for the adaptRecipe function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AdaptRecipeInputSchema = z.object({
  recipeName: z.string().describe('The name of the recipe to adapt.'),
  originalRecipe: z.string().describe('The original recipe details including ingredients and instructions.'),
  dietaryRestrictions: z.string().describe('Dietary restrictions such as vegetarian, vegan, gluten-free, etc.'),
  maxPrepTime: z.number().describe('The maximum preparation time in minutes.'),
  maxBudget: z.number().describe('The maximum budget for the adapted recipe in dollars.'),
});
export type AdaptRecipeInput = z.infer<typeof AdaptRecipeInputSchema>;

const AdaptRecipeOutputSchema = z.object({
  adaptedRecipe: z.string().describe('The adapted recipe details including ingredients and instructions.'),
  costEstimate: z.number().describe('Estimated cost of the adapted recipe.'),
  prepTimeEstimate: z.number().describe('Estimated preparation time in minutes.'),
});
export type AdaptRecipeOutput = z.infer<typeof AdaptRecipeOutputSchema>;

export async function adaptRecipe(input: AdaptRecipeInput): Promise<AdaptRecipeOutput> {
  return adaptRecipeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'adaptRecipePrompt',
  input: {schema: AdaptRecipeInputSchema},
  output: {schema: AdaptRecipeOutputSchema},
  prompt: `You are an expert chef specializing in recipe adaptation.

  Adapt the given recipe based on the specified dietary restrictions, preparation time, and budget constraints. Provide the adapted recipe, estimated cost, and estimated preparation time.

  Recipe Name: {{{recipeName}}}
  Original Recipe: {{{originalRecipe}}}
  Dietary Restrictions: {{{dietaryRestrictions}}}
  Max Prep Time (minutes): {{{maxPrepTime}}}
  Max Budget (dollars): {{{maxBudget}}}

  Ensure the adapted recipe adheres to the dietary restrictions, does not exceed the maximum preparation time, and stays within the maximum budget.

  Output the adapted recipe including ingredients and instructions, the estimated cost of the recipe, and the estimated preparation time in minutes.
  `,
});

const adaptRecipeFlow = ai.defineFlow(
  {
    name: 'adaptRecipeFlow',
    inputSchema: AdaptRecipeInputSchema,
    outputSchema: AdaptRecipeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);


