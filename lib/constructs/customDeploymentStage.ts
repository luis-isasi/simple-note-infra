import { Construct } from 'constructs';
import {
  aws_s3 as s3,
  aws_lambda as lambda,
  aws_codepipeline as codePipeline,
  aws_codepipeline_actions as codePipelineActions,
  aws_codebuild as codeBuild,
  aws_iam as iam,
} from 'aws-cdk-lib';
import { Environment } from '../SimpleNoteStack';

export interface CustomDeploymentStageProps {
  enableManualApproval?: boolean;
  environment: Environment;
  pipeline: codePipeline.Pipeline;
  microservice: string;
  artifact: codePipeline.Artifact;
  artifactsBucket: s3.IBucket;
  lambda: lambda.IFunction;
}

export class CustomDeploymentStage {
  public stage: codePipeline.IStage;

  public deploymentProject: codeBuild.PipelineProject;

  private runOrder = 0;

  constructor(
    protected scope: Construct,
    protected props: CustomDeploymentStageProps,
  ) {
    this.stage = this.createStage();

    if (this.props.enableManualApproval) {
      this.stage.addAction(this.createManualApproval());
    }

    // this.customAction();

    this.deploymentProject = this.createDeploymentProject();
    this.stage.addAction(this.createDeploymentAction());
  }

  protected getRunOrder() {
    this.runOrder += 1;
    return this.runOrder;
  }

  private createStage() {
    let stageName = '';

    switch (this.props.environment) {
      case Environment.DEV:
        stageName = 'Development';
        break;
      case Environment.TEST:
        stageName = 'Testing';
        break;
      case Environment.PROD:
        stageName = 'Production';
        break;
    }

    return this.props.pipeline.addStage({
      stageName: stageName,
    });
  }

  private createManualApproval() {
    return new codePipelineActions.ManualApprovalAction({
      actionName: 'ManualApproval',
      runOrder: this.getRunOrder(),
    });
  }

  private createDeploymentProject() {
    const pipelineProject = new codeBuild.PipelineProject(
      this.scope,
      `${this.props.microservice}${this.props.environment}DeploymentProject`,
      {
        projectName: `${this.props.microservice}${this.props.environment}DeploymentProject`,
        buildSpec: codeBuild.BuildSpec.fromObject({
          version: '0.2',
        }),
      },
    );

    pipelineProject.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['lambda:UpdateFunctionCode'],
        effect: iam.Effect.ALLOW,
        resources: [this.props.lambda.functionArn],
      }),
    );

    this.props.artifactsBucket.grantRead(pipelineProject);

    return pipelineProject;
  }

  private createDeploymentAction() {
    return new codePipelineActions.CodeBuildAction({
      actionName: 'Deployment',
      input: this.props.artifact,
      project: this.deploymentProject,
      runOrder: this.getRunOrder(),
    });
  }
}
