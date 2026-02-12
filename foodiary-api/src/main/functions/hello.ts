import { HelloController } from "../../application/controllers/HelloController";
import { lambdaHttpAdapter } from "../adapters/lambdaHttpAdapter";

const controller = new HelloController();

export const handler = lambdaHttpAdapter(controller);
