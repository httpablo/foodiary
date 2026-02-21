import { HelloController } from "@application/controllers/HelloController";
import { lambdaHttpAdapter } from "@main/adapters/lambdaHttpAdapter";
import "reflect-metadata";

const controller = new HelloController();

export const handler = lambdaHttpAdapter(controller);
