import { Construct } from 'constructs';
import { Environment } from '../SimpleNoteStack';
import {
  aws_codepipeline as codePipeline,
  aws_codepipeline_actions as codePipelineActions,
  aws_codebuild as codeBuild,
} from 'aws-cdk-lib';
import { CustomSourceStage } from './CustomSourceStage';
import { CustomBuildStage } from './customBuildStage';

interface CustomMicroservicePipelineProps {
  environment: Environment;
  microservice: string;
  repositoryName: string;
}

export class CustomMicroservicePipeline {
  private pipeline: codePipeline.Pipeline;

  public customSourceStage: CustomSourceStage;
  public customBuildStage: CustomBuildStage;

  constructor(
    protected scope: Construct,
    protected props: CustomMicroservicePipelineProps,
  ) {
    this.pipeline = new codePipeline.Pipeline(
      scope,
      `${props.microservice}Pipeline`,
      {
        pipelineName: `${props.microservice}`,
        restartExecutionOnUpdate: true,
        pipelineType: codePipeline.PipelineType.V2,
      },
    );

    this.customSourceStage = new CustomSourceStage(this.scope, {
      pipeline: this.pipeline,
      repositoryName: this.props.repositoryName,
    });

    this.customBuildStage = new CustomBuildStage(this.scope, {
      microservice: this.props.microservice,
      pipeline: this.pipeline,
      sourceCode: this.customSourceStage.sourceCode,
    });
  }
}
