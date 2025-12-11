import { NestedStack, NestedStackProps, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Environment } from './SimpleNoteStack';
import { ApiGateway } from './constructs/ApiGateway';
import { MicroService } from './constructs/MicroService';

enum Microservices {
  SIMPLE_NOTE = 'simpleNote',
}

interface EnvironmentNestedStackProps extends NestedStackProps {
  environment: Environment;
}

export class EnvironmentNestedStack extends NestedStack {
  public readonly apiGateway: ApiGateway;

  private microservicesMap: Map<Microservices, MicroService> = new Map();

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

    const microservices = this.createMicroServices();

    microservices.forEach((ms) => {
      this.microservicesMap.set(ms.microserviceName as Microservices, ms);
    });

    this.addMicroserviceRoutes();
  }

  private createMicroServices() {
    const simpleNoteCoreMs = new MicroService(this, {
      microservice: Microservices.SIMPLE_NOTE,
      repositoryName: 'simple-note-core-ms',
      environment: this.props.environment,
    });

    return [simpleNoteCoreMs];
  }

  private addMicroserviceRoutes() {
    this.apiGateway.addMicroserviceRoute({
      path: '/notes',
      lambda: this.microservicesMap.get(Microservices.SIMPLE_NOTE)!.lambda,
      methods: ['GET'],
    });
  }
}
