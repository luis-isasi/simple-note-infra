import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentNestedStack } from './EnvironmentNestedStack';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export enum Environment {
  DEV = 'Dev',
  TEST = 'Test',
  PROD = 'Prod',
}

interface SimpleNoteStackProps extends StackProps {}

export class SimpleNoteStack extends Stack {
  constructor(scope: Construct, id: string, props: SimpleNoteStackProps) {
    super(scope, id, props);

    const developmentStack = new EnvironmentNestedStack(this, {
      environment: Environment.DEV,
    });
  }
}
