import { NestedStack, NestedStackProps, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Environment } from '../SimpleNoteStack';
import { MicroService } from '../constructs/MicroService';
import { CustomRestApi } from '../constructs/CustomRestApi';
import config from '../../config/config.json';

export enum MicroservicesNames {
  SIMPLE_NOTE = 'simpleNote',
}

export const microservices: {
  name: MicroservicesNames;
  repositoryName: string;
}[] = [
  {
    name: MicroservicesNames.SIMPLE_NOTE,
    repositoryName: 'simple-note-core-ms',
  },
];

interface EnvironmentNestedStackProps extends NestedStackProps {
  environment: Environment;
}

export class EnvironmentNestedStack extends NestedStack {
  public readonly api: CustomRestApi;

  public microservices: Record<MicroservicesNames, MicroService> = {} as Record<
    MicroservicesNames,
    MicroService
  >;

  constructor(
    scope: Construct,
    private props: EnvironmentNestedStackProps,
  ) {
    super(scope, `${props.environment}Stack`, props);
    Tags.of(this).add('Environment', props.environment);

    this.createMicroServices();

    this.api = this.createCustomApi();

    this.addMicroserviceRoutes();
  }

  private createMicroServices() {
    const simpleNoteCoreMs = new MicroService(this, {
      name: MicroservicesNames.SIMPLE_NOTE,
      repositoryName: 'simple-note-core-ms',
      environment: this.props.environment,
    });

    const microservices = [simpleNoteCoreMs];

    this.microservices = microservices.reduce(
      (acc, ms) => {
        acc[ms.name as MicroservicesNames] = ms;
        return acc;
      },
      {} as Record<MicroservicesNames, MicroService>,
    );

    return microservices;
  }

  protected createCustomApi() {
    return new CustomRestApi(this, {
      environment: this.props.environment,
      stageName: 'v1',
      description: 'One API to rule them all',
      lambdas: this.microservices,
      baseDomainName: config.domain.baseDomain,
    });
  }

  private addMicroserviceRoutes() {
    this.api.createFullResource({
      plural: { name: 'notes', httpMethods: ['GET'] },
      singular: { name: '{note}', httpMethods: [] },
      lambda: MicroservicesNames.SIMPLE_NOTE,
    });
  }
}
