import { config } from 'dotenv';
config();

import '@/ai/flows/generate-dish-image.ts';
import '@/ai/flows/generate-optimized-recipe.ts';
import '@/ai/flows/adapt-recipe.ts';