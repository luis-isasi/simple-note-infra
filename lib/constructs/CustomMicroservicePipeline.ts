import { Construct } from 'constructs';
import { Environment } from '../SimpleNoteStack';
import {
  aws_codepipeline as codePipeline,
  aws_codepipeline_actions as codePipelineActions,
  aws_codebuild as codeBuild,
  aws_lambda as lambda,
} from 'aws-cdk-lib';
import { CustomSourceStage } from './CustomSourceStage';
import { CustomBuildStage } from './customBuildStage';
import { CustomDeploymentStage } from './customDeploymentStage';

interface CustomMicroservicePipelineProps {
  environment: Environment;
  microservice: string;
  repositoryName: string;
  lambda: lambda.IFunction;
}

export class CustomMicroservicePipeline {
  private pipeline: codePipeline.Pipeline;

  public customSourceStage: CustomSourceStage;
  public customBuildStage: CustomBuildStage;
  public customDeploymentStage: CustomDeploymentStage;

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

    // Dev
    this.customDeploymentStage = new CustomDeploymentStage(this.scope, {
      microservice: this.props.microservice,
      pipeline: this.pipeline,
      artifact: this.customBuildStage.artifact,
      artifactsBucket: this.pipeline.artifactBucket,
      lambda: this.props.lambda,
      environment: this.props.environment,
    });
  }
}
