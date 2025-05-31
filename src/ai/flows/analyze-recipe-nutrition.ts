
'use server';
/**
 * @fileOverview A Genkit flow to analyze the estimated nutritional content of a recipe.
 *
 * - analyzeRecipeNutrition - A function that handles the recipe nutritional analysis.
 * - RecipeNutritionAnalysisInput - The input type for the analyzeRecipeNutrition function.
 * - RecipeNutritionAnalysisOutput - The return type for the analyzeRecipeNutrition function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { RecipeNutritionAnalysisInput as RecipeNutritionAnalysisInputType, RecipeNutritionAnalysisOutput as RecipeNutritionAnalysisOutputType } from '@/types';


const RecipeNutritionAnalysisInputSchema = z.object({
  recipeName: z.string().describe('The name of the recipe to analyze.'),
  ingredientsString: z.string().describe('A string detailing the ingredients and their quantities for the recipe. For example: "200g Chicken Breast, 1 large Onion, 50ml Olive Oil".'),
});
// Exporting the Zod schema-inferred type for internal use in the flow if needed
// but the main exported types come from @/types
// export type RecipeNutritionAnalysisInput = z.infer<typeof RecipeNutritionAnalysisInputSchema>;


const RecipeNutritionAnalysisOutputSchema = z.object({
  calories: z.number().describe('Estimated total calories for the recipe.'),
  proteinGrams: z.number().describe('Estimated total protein in grams for the recipe.'),
  fatGrams: z.number().describe('Estimated total fat in grams for the recipe.'),
  carbohydrateGrams: z.number().describe('Estimated total carbohydrates in grams for the recipe.'),
  disclaimer: z.string().optional().describe('A brief disclaimer about the accuracy of the estimation.'),
});
// export type RecipeNutritionAnalysisOutput = z.infer<typeof RecipeNutritionAnalysisOutputSchema>;


export async function analyzeRecipeNutrition(input: RecipeNutritionAnalysisInputType): Promise<RecipeNutritionAnalysisOutputType> {
  return analyzeRecipeNutritionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeRecipeNutritionPrompt',
  input: {schema: RecipeNutritionAnalysisInputSchema},
  output: {schema: RecipeNutritionAnalysisOutputSchema},
  prompt: `You are a nutritional analysis expert.
Based on the recipe named '{{recipeName}}' with the following ingredients and their quantities:
{{{ingredientsString}}}

Provide an estimated nutritional analysis for the ENTIRE RECIPE as described.
Include:
- Total calories (as a number).
- Total protein in grams (as a number).
- Total fat in grams (as a number).
- Total carbohydrates in grams (as a number).
- A brief disclaimer stating that these are estimates and actual values may vary based on specific ingredient choices and preparation methods.

Ensure your output strictly adheres to the requested JSON schema format.
Focus on providing numerical estimates for calories, protein, fat, and carbohydrates.
`,
});

const analyzeRecipeNutritionFlow = ai.defineFlow(
  {
    name: 'analyzeRecipeNutritionFlow',
    inputSchema: RecipeNutritionAnalysisInputSchema,
    outputSchema: RecipeNutritionAnalysisOutputSchema,
  },
  async (input: RecipeNutritionAnalysisInputType) => {
    const {output} = await prompt(input);
    if (!output) {
        throw new Error("The AI model did not return an output for nutritional analysis.");
    }
    return output;
  }
);
