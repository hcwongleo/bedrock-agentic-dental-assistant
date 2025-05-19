import { Stack, StackProps, aws_bedrock as _bedrock } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambda_python from '@aws-cdk/aws-lambda-python-alpha';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { bedrock } from '@cdklabs/generative-ai-cdk-constructs';
import { AgentActionGroup } from '@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock';
import { BedrockMacAgent } from "../constructs/mac-construct";
import * as MACConfig from '../config/MACConfig';
import { lambdaArchitecture, lambdaRuntime } from "../config/AppConfig";


export class MacStack extends Stack {
    public agentId: string;
    public agentAliasId: string;
    public technician_agent: bedrock.Agent;
    public technician_agentAlias:_bedrock.CfnAgentAlias;
    public dentist_assistant_agent: bedrock.Agent;
    public dentist_assistant_agentAlias:_bedrock.CfnAgentAlias;

    
    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        const agent_role = new iam.Role(this, `cr_role_agent`, {
            assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
            ],
            inlinePolicies: {
                AmazonBedrockAgentInferencProfilePolicy1: new iam.PolicyDocument({
                    statements: [
                        new iam.PolicyStatement({
                            actions: [
                                "bedrock:InvokeModel*",
                                "bedrock:CreateInferenceProfile"
                            ],
                            resources: [
                                "arn:aws:bedrock:*::foundation-model/*",
                                "arn:aws:bedrock:*:*:inference-profile/*",
                                "arn:aws:bedrock:*:*:application-inference-profile/*"
                            ],
                        }),
                    ],
                }),
                AmazonBedrockAgentInferencProfilePolicy2: new iam.PolicyDocument({
                    statements: [
                        new iam.PolicyStatement({
                            actions: [
                                "bedrock:GetInferenceProfile",
                                "bedrock:ListInferenceProfiles",
                                "bedrock:DeleteInferenceProfile",
                                "bedrock:TagResource",
                                "bedrock:UntagResource",
                                "bedrock:ListTagsForResource"
                            ],
                            resources: [
                                "arn:aws:bedrock:*:*:inference-profile/*",
                                "arn:aws:bedrock:*:*:application-inference-profile/*"
                            ],
                        }),
                    ],
                }),
                AmazonBedrockAgentBedrockFoundationModelPolicy: new iam.PolicyDocument({
                    statements: [
                        new iam.PolicyStatement({
                            actions: [
                                "bedrock:GetAgentAlias",
                                "bedrock:InvokeAgent",
                                "bedrock:AssociateAgentCollaborator"
                            ],
                            resources: [
                                "arn:aws:bedrock:*:*:agent/*",
                                "arn:aws:bedrock:*:*:agent-alias/*"
                            ],
                        }),
                    ],
                }),
                AmazonBedrockAgentBedrockInvokeGuardrailModelPolicy: new iam.PolicyDocument({
                    statements: [
                        new iam.PolicyStatement({
                            actions: [
                                "bedrock:InvokeModel"
                            ],
                            resources: ["*"],
                        }),
                    ],
                }),
            }
        });

        /* TECHNICIAN AGENT + action group */
        this.technician_agent = new bedrock.Agent(this, "technician_agent", {
            name: `technician_agent`,
            foundationModel: bedrock.BedrockFoundationModel.AMAZON_NOVA_PRO_V1,
            instruction: MACConfig.MACAgentInstruction.TechnicianAgent,
            shouldPrepareAgent: true,
            description: MACConfig.MACDescription.TechnicianAgent
        })

        const technician_agentAlias = new _bedrock.CfnAgentAlias(this, 'technician_agentAlias', {
            agentAliasName: `technician_agent`,
            agentId: this.technician_agent.agentId,
        });

        /* DENTIST ASSISTANT AGENT + action group */
        const DentistAssistantActionGroup_lambda = new lambda_python.PythonFunction(this, 'DentistActionGroup_lambda', {
            runtime: lambdaRuntime,
            architecture: lambdaArchitecture,
            handler: 'lambda_handler',
            index: 'dentist_assistant_function.py',
            entry: path.join(__dirname, '../lambda/python/bedrock-action-group-lambda'),
            timeout: cdk.Duration.minutes(5),
            memorySize: 1024,
            environment: {
                "ACCOUNT_ID": Stack.of(this).account
            },
        });

        DentistAssistantActionGroup_lambda.addToRolePolicy(new iam.PolicyStatement({
            actions: [
                "s3:*",
                "kms:Decrypt",
                "kms:Encrypt",
                "kms:GenerateDataKey*",
                "kms:ReEncrypt*"
            ],
            resources: ["*"],
        }));

        const DentistAssistantActionGroup = new AgentActionGroup({
            name: `dentist_action_group`,
            description: 'Handle dental order information collection and verification for dentists.',
            executor: bedrock.ActionGroupExecutor.fromlambdaFunction(DentistAssistantActionGroup_lambda),
            enabled: true,
            functionSchema: MACConfig.DentalOrderActionGroup,
        });

        this.dentist_assistant_agent = new bedrock.Agent(this, "dentist_assistant_agent", {
            name: `dentist_assistant`,
            foundationModel: bedrock.BedrockFoundationModel.AMAZON_NOVA_PRO_V1,
            instruction: MACConfig.MACAgentInstruction.DentistAssistant,
            shouldPrepareAgent: true,
            description: MACConfig.MACDescription.DentistAssistant,
            codeInterpreterEnabled: true
        })

        const dentist_assistant_agentAlias = new _bedrock.CfnAgentAlias(this, 'dentist_assistant_agentAlias', {
            agentAliasName: `dentist_assistant`,
            agentId: this.dentist_assistant_agent.agentId,
        });

        this.dentist_assistant_agent.addActionGroup(DentistAssistantActionGroup)

        /* SUPERVISOR AGENT */
        const dental_assistant_agent = new BedrockMacAgent(this, "dental_assistant_agent", {
            agentName: `dental_assistant`,
            agentCollaboration: 'SUPERVISOR_ROUTER',
            instruction: MACConfig.MACAgentInstruction.DentalAssistant,
            description: MACConfig.MACDescription.DentalAssistant,
            agentResourceRoleArn: agent_role.roleArn,
            foundationModel: MACConfig.FoundationModel.Nova_Pro,
            codeInterpreterEnabled: true,
            associateCollaborators: [
                {
                    "sub_agent_association_name": `technician_agent`, 
                    "sub_agent_alias_arn": technician_agentAlias.attrAgentAliasArn,
                    "sub_agent_instruction": MACConfig.MACCollaborationInstruction.TechnicianAgent
                },
                {
                    "sub_agent_association_name": `dentist_assistant_agent`, 
                    "sub_agent_alias_arn": dentist_assistant_agentAlias.attrAgentAliasArn,
                    "sub_agent_instruction": MACConfig.MACCollaborationInstruction.DentistAssistant
                },
            ],
        });
        dental_assistant_agent.node.addDependency(this.dentist_assistant_agent);

        this.agentId = dental_assistant_agent.agentId;
        this.agentAliasId = dental_assistant_agent.agentAliasId;

        new cdk.CfnOutput(this, 'AgentId', {
            value: this.agentId,
            description: 'The ID of the Bedrock agent',
            exportName: `${id}-AgentId`
        });

        new cdk.CfnOutput(this, 'AgentAliasId', {
            value: this.agentAliasId,
            description: 'The ID of the Bedrock agent alias',
            exportName: `${id}-AgentAliasId`
        });
    }
}
