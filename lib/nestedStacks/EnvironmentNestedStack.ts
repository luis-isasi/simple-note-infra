import {
  NestedStack,
  NestedStackProps,
  Tags,
  Stack,
  aws_dynamodb as dynamodb,
  aws_iam as iam,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Environment } from '../SimpleNoteStack';
import { MicroService } from '../constructs/MicroService';
import { CustomRestApi } from '../constructs/CustomRestApi';
import { AuthNestedStack } from './AuthNestedStack';
import config from '../../config/config.json';

export enum MicroservicesNames {
  NOTES = 'Notes',
  CUSTOMERS = 'Customers',
}

export const microservices: {
  name: MicroservicesNames;
  repositoryName: string;
}[] = [
  { name: MicroservicesNames.NOTES, repositoryName: 'simple-note-core-ms' },
  { name: MicroservicesNames.CUSTOMERS, repositoryName: 'simple-note-customers-ms' },
];

interface EnvironmentNestedStackProps extends NestedStackProps {
  environment: Environment;
}

export class EnvironmentNestedStack extends NestedStack {
  public readonly api: CustomRestApi;
  public readonly auth: AuthNestedStack;

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

    this.auth = this.createAuthStack();

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

    // MS Customers
    const customersMs = new MicroService(this, {
      name: MicroservicesNames.CUSTOMERS,
      repositoryName: 'simple-note-customers-ms',
      environment: this.props.environment,
    });

    const ssmParamPath = `/simple-note/${this.props.environment.toLowerCase()}/turnstile-secret-key`;
    customersMs.lambda.addEnvironment('TURNSTILE_SECRET_KEY_PARAM', ssmParamPath);
    customersMs.lambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ssm:GetParameter'],
        resources: [
          `arn:aws:ssm:${Stack.of(this).region}:${Stack.of(this).account}:parameter/simple-note/*`,
        ],
      }),
    );

    const msList = [noteMs, customersMs];

    this.microservices = msList.reduce(
      (acc, ms) => {
        acc[ms.name as MicroservicesNames] = ms;
        return acc;
      },
      {} as Record<MicroservicesNames, MicroService>,
    );

    return msList;
  }

  private createAuthStack() {
    return new AuthNestedStack(this, {
      environment: this.props.environment,
      customersLambda: this.microservices[MicroservicesNames.CUSTOMERS].lambda,
    });
  }

  protected createCustomApi() {
    return new CustomRestApi(this, {
      environment: this.props.environment,
      stageName: 'v1',
      description: 'One API to rule them all',
      lambdas: this.microservices,
      baseDomainName: config.domain.baseDomain,
      userPool: this.auth.userPool,
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
