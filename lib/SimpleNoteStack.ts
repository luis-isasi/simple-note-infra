import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentNestedStack } from './nestedStacks/EnvironmentNestedStack';
import {
  DevOpsNestedStack,
  type MicroserviceDevOps,
} from './nestedStacks/DevOpsNestedStack';
import { microservices as microservicesList } from './nestedStacks/EnvironmentNestedStack';

export enum Environment {
  CORE = 'Core',
  DEV = 'Dev',
  TEST = 'Test',
  PROD = 'Prod',
}

interface SimpleNoteStackProps extends StackProps {}

export class SimpleNoteStack extends Stack {
  constructor(scope: Construct, id: string, props: SimpleNoteStackProps) {
    super(scope, id, props);

    const devNestedStack = new EnvironmentNestedStack(this, {
      environment: Environment.DEV,
    });

    const microservicesForDevOps = this.getMicroservicesForDevOps({
      devNestedStack,
    });

    new DevOpsNestedStack(this, {
      test: true,
      production: false,
      microservices: microservicesForDevOps,
    });
  }

  private getMicroservicesForDevOps({
    devNestedStack,
    testNestedStack,
    productionNestedStack,
  }: {
    devNestedStack: EnvironmentNestedStack;
    testNestedStack?: EnvironmentNestedStack;
    productionNestedStack?: EnvironmentNestedStack;
  }): MicroserviceDevOps[] {
    const microservices = microservicesList.map((ms) => {
      const lambdaDev = devNestedStack.microservices[ms.name].lambda;
      const lambdaTest = testNestedStack?.microservices[ms.name].lambda;
      const lambdaProduction =
        productionNestedStack?.microservices[ms.name].lambda;

      return {
        name: ms.name,
        repositoryName: ms.repositoryName,
        lambdaDev: lambdaDev,
        lambdaTest: lambdaTest,
        lambdaProduction: lambdaProduction,
      };
    });

    return microservices;
  }
}
