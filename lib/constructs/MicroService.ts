import { aws_lambda as lambda, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Environment } from '../SimpleNoteStack';
import { CustomMicroservicePipeline } from './CustomMicroservicePipeline';

interface MicroServiceStackProps {
  microservice: string;
  environment: Environment;
  repositoryName: string;
  isFirstDeployment?: boolean;
}

export class MicroService extends Construct {
  private lambda: lambda.Function;

  constructor(
    private scope: Construct,
    private props: MicroServiceStackProps,
  ) {
    super(scope, props.microservice);

    Tags.of(this).add('Environment', this.props.microservice);
    this.lambda = this.createLambda();

    if (this.props.isFirstDeployment !== true) {
      this.createCustomPipeline();
    }
  }

  private createLambda() {
    const customLambda = new lambda.Function(
      this,
      `${this.props.microservice}${this.props.environment}`,
      {
        functionName: `${this.props.microservice}${this.props.environment}`,
        runtime: lambda.Runtime.NODEJS_22_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline(
          'exports.handler = function(event, context) { console.log(event); }',
        ),
      },
    );

    return customLambda;
  }

  private createCustomPipeline() {
    new CustomMicroservicePipeline(this.scope, {
      microservice: this.props.microservice,
      environment: this.props.environment,
      repositoryName: this.props.repositoryName,
    });
  }
}
