import { aws_dynamodb as dynamodb, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';

interface CustomDynamoTableProps {
  tableName: string;
  partitionKey?: dynamodb.Attribute;
  sortKey?: dynamodb.Attribute;
}

export class CustomDynamoTable extends Construct {
  public readonly table: dynamodb.Table;
  public readonly tableName: string;

  constructor(scope: Construct, id: string, props: CustomDynamoTableProps) {
    super(scope, id);

    this.table = new dynamodb.Table(this, 'Table', {
      tableName: props.tableName,
      partitionKey: props.partitionKey ?? { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: props.sortKey,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.tableName = props.tableName;
  }
}
