import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentNestedStack } from './EnvironmentNestedStack';

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

    new EnvironmentNestedStack(this, {
      environment: Environment.DEV,
    });
  }
}
