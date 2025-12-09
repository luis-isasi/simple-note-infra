import {
  aws_codepipeline as codePipeline,
  aws_codepipeline_actions as codePipelineActions,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface CustomSourceStageProps {
  pipeline: codePipeline.Pipeline;
  repositoryName: string;
}

export class CustomSourceStage {
  protected prefix: string;
  public sourceStage: codePipeline.IStage;

  public sourceCode: codePipeline.Artifact;

  constructor(
    // eslint-disable-next-line no-unused-vars
    private scope: Construct,
    private props: CustomSourceStageProps,
  ) {
    this.sourceStage = props.pipeline.addStage({
      stageName: 'Source',
    });

    // Create and expose the source output artifact to be used by downstream actions
    this.sourceCode = new codePipeline.Artifact(`SourceOutput`);

    this.sourceStage.addAction(
      new codePipelineActions.CodeStarConnectionsSourceAction({
        actionName: 'Checkout',
        triggerOnPush: true,
        branch: 'main',
        output: this.sourceCode,
        owner: 'luis-isasi',
        repo: this.props.repositoryName,
        connectionArn:
          'arn:aws:codeconnections:us-east-2:192474940472:connection/f2e2863a-6462-4d84-a881-2360e3e66bef',
      }),
    );
  }
}
