import { Construct } from 'constructs';
import { Environment } from '../SimpleNoteStack';
import {
  aws_apigatewayv2 as apigatewayv2,
  aws_certificatemanager as acm,
  aws_route53 as route53,
  aws_lambda as lambda,
  Duration,
} from 'aws-cdk-lib';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';

const BASE_DOMAIN_NAME = 'luis-isasi.com';
const SUB_DOMAIN_NAME = 'simplenote';

interface ApiGatewayProps {
  environment: Environment;
}

export class ApiGateway extends Construct {
  public readonly api: apigatewayv2.HttpApi;
  public readonly domainName: apigatewayv2.DomainName;
  public readonly certificate: acm.Certificate;
  public readonly zone: route53.IHostedZone;
  public readonly fullDomainName: string;
  public lambdaMap = new Map<string, lambda.IFunction>();

  constructor(
    scope: Construct,
    private props: ApiGatewayProps,
  ) {
    super(scope, `SimpleNoteApi${props.environment}`);

    // Construir el dominio automáticamente
    const envSuffix =
      props.environment === Environment.PROD
        ? ''
        : `.${props.environment.toLowerCase()}`;
    this.fullDomainName = `${SUB_DOMAIN_NAME}${envSuffix}.${BASE_DOMAIN_NAME}`;

    this.zone = this.createDnsZone();
    this.certificate = this.createCertificate();
    this.api = this.createApiGateway();
    this.domainName = this.createCustomDomain();
  }

  private createDnsZone(): route53.IHostedZone {
    return route53.HostedZone.fromLookup(this, 'Zone', {
      domainName: BASE_DOMAIN_NAME,
    });
  }

  private createCertificate(): acm.Certificate {
    // Crear certificado automáticamente con validación DNS
    const certificate = new acm.Certificate(
      this,
      `CertificateApi${this.props.environment}`,
      {
        domainName: this.fullDomainName,
        validation: acm.CertificateValidation.fromDns(this.zone),
      },
    );

    return certificate;
  }

  private createApiGateway(): apigatewayv2.HttpApi {
    const apiGateway = new apigatewayv2.HttpApi(
      this,
      `SimpleNoteHttpApi${this.props.environment}`,
      {
        apiName: `simplenote-api-${this.props.environment.toLowerCase()}`,
        description: `Simple Note HTTP API - ${this.props.environment}`,
        corsPreflight: {
          allowOrigins: ['*'],
          allowMethods: [
            apigatewayv2.CorsHttpMethod.GET,
            apigatewayv2.CorsHttpMethod.POST,
            apigatewayv2.CorsHttpMethod.PUT,
            apigatewayv2.CorsHttpMethod.DELETE,
            apigatewayv2.CorsHttpMethod.PATCH,
            apigatewayv2.CorsHttpMethod.OPTIONS,
          ],
          allowHeaders: [
            'Content-Type',
            'X-Amz-Date',
            'Authorization',
            'X-Api-Key',
            'X-Amz-Security-Token',
          ],
          maxAge: Duration.days(1),
        },
      },
    );

    return apiGateway;
  }

  private createCustomDomain(): apigatewayv2.DomainName {
    // Crear el dominio personalizado para HTTP API
    const customDomain = new apigatewayv2.DomainName(this, 'CustomDomain', {
      domainName: this.fullDomainName,
      certificate: this.certificate,
    });

    // Crear el stage v1
    const v1Stage = new apigatewayv2.HttpStage(
      this,
      `V1Stage${this.props.environment}`,
      {
        httpApi: this.api,
        stageName: 'v1',
        autoDeploy: true,
      },
    );

    // Crear el mapeo de API
    new apigatewayv2.ApiMapping(this, `ApiMapping${this.props.environment}`, {
      api: this.api,
      domainName: customDomain,
      stage: v1Stage,
    });

    // Crear registro DNS automáticamente
    const recordName = this.fullDomainName.replace(`.${BASE_DOMAIN_NAME}`, '');

    new route53.ARecord(this, `DomainRecord${this.props.environment}`, {
      zone: this.zone,
      recordName: recordName,
      target: route53.RecordTarget.fromAlias({
        bind: () => ({
          dnsName: customDomain.regionalDomainName,
          hostedZoneId: customDomain.regionalHostedZoneId,
        }),
      }),
    });

    return customDomain;
  }

  // Método helper para agregar rutas de microservicios
  public addMicroserviceRoute(
    path: string,
    lambda: lambda.IFunction,
    methods: apigatewayv2.HttpMethod[] = [apigatewayv2.HttpMethod.ANY],
  ): void {
    const integration = new HttpLambdaIntegration(`${path}Integration`, lambda);

    methods.forEach((method) => {
      this.api.addRoutes({
        path: path,
        methods: [method],
        integration: integration,
      });
    });

    // Guardar referencia del lambda
    this.lambdaMap.set(path, lambda);
  }
}
