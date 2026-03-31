import { aws_lambda as lambda, aws_dynamodb as dynamodb, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Environment } from '../SimpleNoteStack';
import { MicroservicesNames } from '../nestedStacks/EnvironmentNestedStack';
import { CustomDynamoTable } from './CustomDynamoTable';

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

  addDynamoTable(props?: {
    tableNameSuffix?: string;
    partitionKey?: dynamodb.Attribute;
    sortKey?: dynamodb.Attribute;
  }): CustomDynamoTable {
    const suffix = props?.tableNameSuffix
      ? props.tableNameSuffix.charAt(0).toUpperCase() + props.tableNameSuffix.slice(1)
      : '';
    const tableName = `${this.props.name}${suffix}${this.props.environment}`;
    const envVarName = props?.tableNameSuffix
      ? `${props.tableNameSuffix.toUpperCase().replace(/-/g, '_')}_TABLE_NAME`
      : `${this.props.name.toUpperCase()}_TABLE_NAME`;
    const constructId = props?.tableNameSuffix ?? 'Main';

    const dynamoTable = new CustomDynamoTable(this, constructId, {
      tableName,
      partitionKey: props?.partitionKey,
      sortKey: props?.sortKey,
    });

    this.lambda.addEnvironment(envVarName, tableName);
    dynamoTable.table.grantReadWriteData(this.lambda);

    return dynamoTable;
  }

  private createLambda() {
    const lambdaName = `Sn${this.props.name}Ms${this.props.environment}`;
    const customLambda = new lambda.Function(
      this,
      lambdaName,
      {
        functionName: lambdaName,
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
