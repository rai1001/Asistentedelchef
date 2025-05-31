'use server';

/**
 * @fileOverview Generates a recipe based on available ingredients and a target cost.
 *
 * - generateOptimizedRecipe - A function that generates an optimized recipe.
 * - GenerateOptimizedRecipeInput - The input type for the generateOptimizedRecipe function.
 * - GenerateOptimizedRecipeOutput - The return type for the generateOptimizedRecipe function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateOptimizedRecipeInputSchema = z.object({
  ingredients: z
    .string()
    .describe('A comma-separated list of available ingredients.'),
  targetCost: z.number().describe('The target cost for the recipe.'),
  recipeName: z.string().optional().describe('The name of the recipe being generated'),
});
export type GenerateOptimizedRecipeInput = z.infer<
  typeof GenerateOptimizedRecipeInputSchema
>;

const GenerateOptimizedRecipeOutputSchema = z.object({
  recipe: z.string().describe('The generated recipe based on the ingredients.'),
  cost: z.number().describe('The estimated cost of the generated recipe.'),
});
export type GenerateOptimizedRecipeOutput = z.infer<
  typeof GenerateOptimizedRecipeOutputSchema
>;

export async function generateOptimizedRecipe(
  input: GenerateOptimizedRecipeInput
): Promise<GenerateOptimizedRecipeOutput> {
  return generateOptimizedRecipeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateOptimizedRecipePrompt',
  input: {schema: GenerateOptimizedRecipeInputSchema},
  output: {schema: GenerateOptimizedRecipeOutputSchema},
  prompt: `You are an expert chef specializing in cost optimization.

You will generate a recipe based on the available ingredients and the target cost.
The recipe should be delicious and meet the specified cost target.

Ingredients: {{{ingredients}}}
Target Cost: {{{targetCost}}}
Recipe Name: {{{recipeName}}}

Consider different cooking methods and ingredient combinations to achieve the best results.
Output the recipe along with its estimated cost.  Do not exceed the target cost.
If no recipe name is provided, generate one.
`,
});

const generateOptimizedRecipeFlow = ai.defineFlow(
  {
    name: 'generateOptimizedRecipeFlow',
    inputSchema: GenerateOptimizedRecipeInputSchema,
    outputSchema: GenerateOptimizedRecipeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
