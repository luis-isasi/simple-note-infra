import {
  NestedStack,
  NestedStackProps,
  aws_lambda as lambda,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CustomMicroservicePipeline } from '../constructs/CustomMicroservicePipeline';
import { MicroservicesNames } from './EnvironmentNestedStack';

export interface MicroserviceDevOps {
  name: MicroservicesNames;
  repositoryName: string;
  lambdaDev: lambda.IFunction;
  lambdaTest?: lambda.IFunction;
  lambdaProduction?: lambda.IFunction;
}

interface DevOpsNestedStackProps extends NestedStackProps {
  test?: boolean;
  production?: boolean;
  microservices: MicroserviceDevOps[];
}

export class DevOpsNestedStack extends NestedStack {
  constructor(scope: Construct, props: DevOpsNestedStackProps) {
    super(scope, 'SimpleNoteDevOps', props);

    // create pipelines for each microservice in the development environment or in the test environment if it exists
    const microservices = Object.values(props.microservices);

    microservices.forEach(
      ({ name, repositoryName, lambdaDev, lambdaTest, lambdaProduction }) => {
        new CustomMicroservicePipeline(this, {
          microservice: name,
          repositoryName,
          lambdaDev,
          lambdaTest,
          lambdaProduction,
        });
      },
    );
  }
}
