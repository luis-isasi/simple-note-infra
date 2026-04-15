import {
  NestedStack,
  NestedStackProps,
  CfnOutput,
  RemovalPolicy,
  aws_cognito as cognito,
  aws_lambda as lambda,
  aws_ssm as ssm,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Environment } from '../SimpleNoteStack';

interface AuthNestedStackProps extends NestedStackProps {
  environment: Environment;
  customersLambda: lambda.IFunction;
}

export class AuthNestedStack extends NestedStack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, props: AuthNestedStackProps) {
    super(scope, `${props.environment}AuthStack`, props);

    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `SimpleNoteUserPool${props.environment}`,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      lambdaTriggers: {
        preSignUp: props.customersLambda,
        preAuthentication: props.customersLambda,
      },
      removalPolicy:
        props.environment === Environment.PROD
          ? RemovalPolicy.RETAIN
          : RemovalPolicy.DESTROY,
    });

    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: `SimpleNoteFrontend${props.environment}`,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      generateSecret: false,
    });

    new CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      exportName: `SimpleNoteUserPoolId${props.environment}`,
    });

    new CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      exportName: `SimpleNoteUserPoolClientId${props.environment}`,
    });

    // Placeholder — update value manually in AWS Console after deploy.
    // Note: CloudFormation does not support SecureString; change the type
    // to SecureString in the console once you set the real Cloudflare secret key.
    new ssm.StringParameter(this, 'TurnstileSecretKeyParam', {
      parameterName: `/simple-note/${props.environment.toLowerCase()}/turnstile-secret-key`,
      stringValue: 'PLACEHOLDER',
      description: `Cloudflare Turnstile Secret Key for ${props.environment}`,
    });
  }
}
