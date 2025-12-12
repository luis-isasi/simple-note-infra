import { aws_lambda as lambda, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Environment } from '../SimpleNoteStack';
import { MicroservicesNames } from '../nestedStacks/EnvironmentNestedStack';

interface MicroServiceStackProps {
  name: MicroservicesNames;
  environment: Environment;
  repositoryName: string;
  isFirstDeployment?: boolean;
}

export class MicroService extends Construct {
  public lambda: lambda.Function;
  public environment: Environment;
  public repositoryName: string;
  public name: string;

  constructor(
    private scope: Construct,
    private props: MicroServiceStackProps,
  ) {
    super(scope, props.name);

    Tags.of(this).add('Environment', this.props.name);

    this.lambda = this.createLambda();

    this.environment = this.props.environment;
    this.repositoryName = this.props.repositoryName;
    this.name = this.props.name;
  }

  private createLambda() {
    const customLambda = new lambda.Function(
      this,
      `${this.props.name}${this.props.environment}`,
      {
        functionName: `${this.props.name}${this.props.environment}`,
        runtime: lambda.Runtime.NODEJS_22_X,
        handler: `handlers/index.handler`,
        code: lambda.Code.fromInline(
          'exports.handler = function(event, context) { console.log(event); }',
        ),
      },
    );

    return customLambda;
  }
}
