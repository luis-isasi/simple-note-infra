import { Construct } from 'constructs';
import {
  aws_codepipeline as codePipeline,
  aws_codepipeline_actions as codePipelineActions,
  aws_codebuild as codeBuild,
} from 'aws-cdk-lib';

export interface CustomBuildStageProps {
  microservice: string;
  pipeline: codePipeline.Pipeline;
  sourceCode: codePipeline.Artifact;
}

export class CustomBuildStage {
  public buildProject: codeBuild.PipelineProject;

  public artifact: codePipeline.Artifact;
  constructor(
    private scope: Construct,
    private props: CustomBuildStageProps,
  ) {
    this.buildProject = this.createBuildProject();
    this.artifact = new codePipeline.Artifact();
    this.createStage();
  }

  private createBuildProject() {
    const buildProject = new codeBuild.PipelineProject(
      this.scope,
      `${this.props.microservice}BuildProject`,
      {
        projectName: `${this.props.microservice}BuildProject`,
        buildSpec: codeBuild.BuildSpec.fromObject({
          version: '0.2',
          phases: {
            build: {
              commands: ['npm install'],
            },
          },
        }),
        environment: {
          buildImage: codeBuild.LinuxBuildImage.STANDARD_7_0,
        },
      },
    );

    return buildProject;
  }

  private createStage() {
    this.props.pipeline.addStage({
      stageName: 'Build',
      actions: [
        new codePipelineActions.CodeBuildAction({
          actionName: 'Build',
          input: this.props.sourceCode,
          outputs: [this.artifact],
          project: this.buildProject,
        }),
      ],
    });
  }
}
