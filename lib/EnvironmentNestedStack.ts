import { NestedStack, NestedStackProps, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Environment } from './SimpleNoteStack';
import { ApiGateway } from './constructs/ApiGateway';
import { MicroService } from './constructs/MicroService';

interface EnvironmentNestedStackProps extends NestedStackProps {
  environment: Environment;
}

export class EnvironmentNestedStack extends NestedStack {
  public readonly apiGateway: ApiGateway;

  constructor(
    scope: Construct,
    private props: EnvironmentNestedStackProps,
  ) {
    super(scope, `${props.environment}Stack`, props);
    Tags.of(this).add('Environment', props.environment);

    // Crear API Gateway HTTP API con dominio personalizado automático
    this.apiGateway = new ApiGateway(this, {
      environment: this.props.environment,
    });

    this.createMicroServices();
  }

  private createMicroServices() {
    const simpleNoteCoreMs = new MicroService(this, {
      microservice: 'SimpleNote',
      repositoryName: 'simple-note-core-ms',
      environment: this.props.environment,
    });

    return [simpleNoteCoreMs];
  }
}
