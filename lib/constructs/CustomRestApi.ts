import {
  aws_apigateway as apiGateway,
  aws_certificatemanager as certificateManager,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_route53 as route53,
  aws_route53_targets as route53Targets,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Environment } from '../SimpleNoteStack';
import { MicroservicesNames } from '../nestedStacks/EnvironmentNestedStack';
import { MicroService } from './MicroService';

export interface CustomRestApiProps {
  environment: Environment;
  stageName: string;
  description: string;
  baseDomainName?: string;
  lambdas: Record<MicroservicesNames, MicroService>;
}

export class CustomRestApi {
  api: apiGateway.RestApi;

  public role: iam.Role;

  zone: route53.IHostedZone | undefined;

  public lambdaMap = new Map<string, lambda.IFunction>();

  usagePlanMap = new Map<string, apiGateway.UsagePlan>();

  public defaultCorsPreflightOptionsConfig: apiGateway.CorsOptions = {
    allowOrigins: apiGateway.Cors.ALL_ORIGINS,
    allowMethods: apiGateway.Cors.ALL_METHODS,
    allowHeaders: [
      'Content-Type',
      'X-Amz-Date',
      'Authorization',
      'X-Api-Key',
      'X-Amz-Security-Token',
      'X-Amz-User-Agent',
    ],
  };

  constructor(
    private scope: Construct,
    private props: CustomRestApiProps,
  ) {
    this.zone = this.createDnsZone();
    this.api = this.createRestApi();
    this.role = this.grantApiAccessToLambdas();
    this.createDnsRecord();
  }

  private createRestApi() {
    const api = new apiGateway.RestApi(
      this.scope,
      `ApiSimpleNote${this.props.environment}`,
      {
        restApiName: `ApiSimpleNote${this.props.environment}`,
        description: this.props.description,
        domainName:
          this.props.baseDomainName && this.zone
            ? {
                domainName: this.getDomainName(),
                certificate: this.createCertificate({ zone: this.zone }),
                securityPolicy: apiGateway.SecurityPolicy.TLS_1_2,
                basePath: this.props.stageName,
              }
            : undefined,
        deployOptions: { stageName: this.props.stageName },
        defaultCorsPreflightOptions: this.defaultCorsPreflightOptionsConfig,
      },
    );

    return api;
  }

  private createDnsZone() {
    if (!this.props.baseDomainName) {
      return undefined;
    }

    return route53.HostedZone.fromLookup(this.scope, 'Zone', {
      domainName: this.props.baseDomainName,
    });
  }

  private createDnsRecord() {
    if (!this.zone) {
      return;
    }
    new route53.ARecord(this.scope, 'SiteAliasRecord', {
      recordName: this.getDomainName(),
      target: route53.RecordTarget.fromAlias(
        new route53Targets.ApiGateway(this.api),
      ),
      zone: this.zone,
    });
  }

  private createCertificate(params: { zone: route53.IHostedZone }) {
    const certificate = certificateManager.CertificateValidation.fromDns(
      params.zone,
    );

    return new certificateManager.Certificate(this.scope, 'ApiCertificate', {
      domainName: this.getDomainName(),
      validation: certificate,
    });
  }

  private getDomainName() {
    const environment =
      this.props.environment === Environment.PROD
        ? ''
        : `${this.props.environment.toLowerCase()}.`;

    return `api.simplenote.${environment}${this.props.baseDomainName}`;
  }

  private grantApiAccessToLambdas() {
    const apiRole = new iam.Role(
      this.scope,
      `ApiSimpleNote${this.props.environment}Role`,
      {
        roleName: `ApiSimpleNote${this.props.environment}Role`,
        assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      },
    );
    apiRole.addToPolicy(
      new iam.PolicyStatement({
        resources: Object.values(this.props.lambdas).map(
          (lambda) => lambda.lambda.functionArn,
        ),
        actions: ['lambda:InvokeFunction'],
      }),
    );
    return apiRole;
  }

  public createFullResource(params: {
    plural: { name: string; httpMethods?: string[] };
    singular: { name: string; httpMethods?: string[] };
    lambda: MicroservicesNames;
    parent?: apiGateway.Resource;
  }) {
    const plural = this.createResource({
      ...params.plural,
      parent: params.parent,
      lambda: params.lambda,
    });
    const singular = this.createResource({
      ...params.singular,
      parent: plural,
      lambda: params.lambda,
    });
    return { plural, singular };
  }

  public createResource(params: {
    name: string;
    parent?: apiGateway.Resource;
    httpMethods?: string[];
    lambda: MicroservicesNames;
    enableKey?: boolean;
  }) {
    const resource = params.parent
      ? params.parent.addResource(params.name)
      : this.api.root.addResource(params.name);

    if (params.lambda) {
      params.httpMethods?.forEach((httpMethod) => {
        resource.addMethod(
          httpMethod,
          new apiGateway.LambdaIntegration(
            this.props.lambdas[params.lambda].lambda,
            {
              credentialsRole: this.role,
            },
          ),
          {
            apiKeyRequired: params.enableKey,
          },
        );
      });
    }

    return resource;
  }
}
