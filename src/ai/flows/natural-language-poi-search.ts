'use server';
/**
 * @fileOverview A natural language point of interest (POI) search AI agent.
 *
 * - naturalLanguagePoiSearch - A function that handles the POI search process.
 * - NaturalLanguagePoiSearchInput - The input type for the naturalLanguagePoiSearch function.
 * - NaturalLanguagePoiSearchOutput - The return type for the naturalLanguagePoiSearch function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const NaturalLanguagePoiSearchInputSchema = z.object({
  query: z
    .string()
    .describe(
      'A natural language description of the point of interest (POI) to search for, e.g., \'nearby coffee shops\', \'historical landmarks near my location\'.'
    ),
});
export type NaturalLanguagePoiSearchInput = z.infer<typeof NaturalLanguagePoiSearchInputSchema>;

const NaturalLanguagePoiSearchOutputSchema = z.object({
  poiDescription: z.string().describe('A description of the points of interest found.'),
  latitude: z.number().describe('The latitude of the POI.'),
  longitude: z.number().describe('The longitude of the POI.'),
});
export type NaturalLanguagePoiSearchOutput = z.infer<typeof NaturalLanguagePoiSearchOutputSchema>;

export async function naturalLanguagePoiSearch(
  input: NaturalLanguagePoiSearchInput
): Promise<NaturalLanguagePoiSearchOutput> {
  return naturalLanguagePoiSearchFlow(input);
}

const prompt = ai.definePrompt({
  name: 'naturalLanguagePoiSearchPrompt',
  input: {schema: NaturalLanguagePoiSearchInputSchema},
  output: {schema: NaturalLanguagePoiSearchOutputSchema},
  prompt: `You are a helpful assistant that helps users find points of interest (POIs).

You will take the user's natural language description of the POI and use it to find the most relevant place.

If the user provides a location, you will use it to find POIs near that location. If not, you will use the user's current location.

Description: {{{query}}}`,
});

const naturalLanguagePoiSearchFlow = ai.defineFlow(
  {
    name: 'naturalLanguagePoiSearchFlow',
    inputSchema: NaturalLanguagePoiSearchInputSchema,
    outputSchema: NaturalLanguagePoiSearchOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
