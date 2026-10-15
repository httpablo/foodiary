import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const labelSchema = z.object({
  name: z.string().nullable(),
  quantity: z.string().nullable(),
  basis: z.string().nullable(),
  calories: z.number().nullable(),
  proteins: z.number().nullable(),
  carbohydrates: z.number().nullable(),
  fats: z.number().nullable(),
});

function cleanText(value: string | null, maxLength: number): string | null {
  const cleaned = value?.trim().slice(0, maxLength);
  return cleaned || null;
}

export type NutritionLabelResult = z.infer<typeof labelSchema>;

export class NutritionLabelAIGateway {
  private readonly client = new OpenAI({ timeout: 30000, maxRetries: 0 });

  async scan(image: Buffer): Promise<NutritionLabelResult> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4.1-mini',
      response_format: zodResponseFormat(labelSchema, 'nutrition_label'),
      messages: [
        {
          role: 'system',
          content: `Leia somente os dados visíveis da tabela nutricional fotografada. Responda em português do Brasil.
Escolha uma única coluna: priorize os valores por porção quando a porção estiver legível; caso contrário, use a coluna por 100 g ou 100 ml. Nunca misture colunas.
Se a quantidade ou a coluna correspondente não puder ser determinada, devolva null para a quantidade e para todos os valores numéricos.
"quantity" deve ser a medida exata da coluna escolhida, como "30 g", "200 ml" ou "100 g". "basis" deve dizer qual coluna foi usada, como "Porção do rótulo" ou "Por 100 g".
"name" é o nome do produto, se visível. "calories" é o valor energético em kcal da mesma coluna. Proteínas, carboidratos e gorduras devem estar em gramas da mesma coluna.
Se algum campo estiver ilegível, ausente ou ambíguo, use null. Não calcule nem estime valores. Ignore a coluna de %VD. Não use dados de outros produtos.`,
        },
        {
          role: 'user',
          content: [{
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${image.toString('base64')}`, detail: 'high' },
          }],
        },
      ],
    });

    const content = response.choices[0]?.message.content;
    if (!content) {
      throw new Error('Nutrition label analysis returned no content.');
    }
    const parsed = labelSchema.parse(JSON.parse(content));
    parsed.name = cleanText(parsed.name, 120);
    parsed.quantity = cleanText(parsed.quantity, 80);
    parsed.basis = cleanText(parsed.basis, 60);
    for (const key of ['calories', 'proteins', 'carbohydrates', 'fats'] as const) {
      const value = parsed[key];
      if (!parsed.quantity || (value !== null && (!Number.isFinite(value) || value < 0 || value > 10000))) {
        parsed[key] = null;
      }
    }
    return parsed;
  }
}
