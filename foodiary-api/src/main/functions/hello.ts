import { HelloController } from "@application/controllers/HelloController";
import { Registry } from "@kernel/di/Registry";
import { lambdaHttpAdapter } from "@main/adapters/lambdaHttpAdapter";
import "reflect-metadata";

const controller = Registry.getInstance().resolve(HelloController);

export const handler = lambdaHttpAdapter(controller);
