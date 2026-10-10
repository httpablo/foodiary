import dedent from 'ts-dedent';

export function getImagePrompt() {
  return dedent`
    Identify only foods clearly visible in the photo. Estimate each portion in grams and its calories, proteins, carbohydrates and fats. Skip uncertain items instead of inventing them.
    Name the meal according to its date and choose a suitable icon.
    Return the required structured data in Brazilian Portuguese.
  `;
}
