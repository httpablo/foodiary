import { HelloController } from "@application/controllers/HelloController";
import { container } from "@kernel/di/container";
import { lambdaHttpAdapter } from "@main/adapters/lambdaHttpAdapter";
import "reflect-metadata";

const controller = container.resolve(HelloController);

export const handler = lambdaHttpAdapter(controller);
