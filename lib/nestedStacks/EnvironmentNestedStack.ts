import {
  NestedStack,
  NestedStackProps,
  Tags,
  aws_dynamodb as dynamodb,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Environment } from '../SimpleNoteStack';
import { MicroService } from '../constructs/MicroService';
import { CustomRestApi } from '../constructs/CustomRestApi';
import config from '../../config/config.json';

export enum MicroservicesNames {
  NOTES = 'Notes',
}

export const microservices: {
  name: MicroservicesNames;
  repositoryName: string;
}[] = [
  { name: MicroservicesNames.NOTES, repositoryName: 'simple-note-core-ms' },
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
    // MS Notes
    const noteMs = new MicroService(this, {
      name: MicroservicesNames.NOTES,
      repositoryName: 'simple-note-core-ms',
      environment: this.props.environment,
    });

    noteMs.addDynamoTable({
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'creationDate', type: dynamodb.AttributeType.NUMBER },
    });

    const microservices = [noteMs];

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
      lambdas: this.microservices ?? [],
      baseDomainName: config.domain.baseDomain,
    });
  }

  private addMicroserviceRoutes() {
    this.api.createFullResource({
      plural: { name: 'notes', httpMethods: ['GET', 'POST'] },
      singular: { name: '{noteId}', httpMethods: ['GET', 'PUT', 'DELETE'] },
      lambda: MicroservicesNames.NOTES,
    });
  }
}
