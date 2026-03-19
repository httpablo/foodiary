import "reflect-metadata";
import { SignInController } from "@application/controllers/SignInController";
import { Registry } from "@kernel/di/Registry";
import { lambdaHttpAdapter } from "@main/adapters/lambdaHttpAdapter";

const controller = Registry.getInstance().resolve(SignInController);

export const handler = lambdaHttpAdapter(controller);
