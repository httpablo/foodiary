import { HelloController } from "@application/controllers/HelloController";
import { HelloUseCase } from "@application/usecases/HelloUseCase";
import { Registry } from "@kernel/di/Registry";
import { lambdaHttpAdapter } from "@main/adapters/lambdaHttpAdapter";
import "reflect-metadata";

const container = new Registry();

container.register(HelloUseCase);
container.register(HelloController);

const controller = container.resolve(HelloController);

export const handler = lambdaHttpAdapter(controller);
