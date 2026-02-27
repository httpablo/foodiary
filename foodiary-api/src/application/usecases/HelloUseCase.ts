export class HelloUseCase {
  async execute(input: HelloUseCase.Input): Promise<HelloUseCase.Output> {
    return {
      helloUseCase: input.email,
    };
  }
}

export namespace HelloUseCase {
  export type Input = {
    email: string;
  };

  export type Output = {
    helloUseCase: string;
  };
}

// The HelloUseCase class defines a use case for handling a "hello" operation. It has an execute method that takes an input of type HelloUseCase.Input and returns a promise that resolves to HelloUseCase.Output. The input contains an email string, and the output contains a helloUseCase string that is set to the value of the input email.
