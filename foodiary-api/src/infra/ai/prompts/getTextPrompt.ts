import dedent from 'ts-dedent';

export function getTextPrompt() {
  return dedent`
    Analyze the meal described by the user. Estimate each stated food's calories, proteins, carbohydrates and fats using reasonable portions. Skip foods that cannot be identified.
    Name the meal according to its date and choose a suitable icon.
    Return the required structured data in Brazilian Portuguese.
  `;
}
