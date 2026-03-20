import { PreTokenGenerationV2TriggerEvent } from "aws-lambda";

export async function handler(event: PreTokenGenerationV2TriggerEvent) {
  const internalId = event.request.userAttributes["custom:internalId"];

  event.response = {
    claimsAndScopeOverrideDetails: {
      accessTokenGeneration: {
        claimsToAddOrOverride: internalId ? { internalId } : {},
      },
    },
  };

  return event;
}
