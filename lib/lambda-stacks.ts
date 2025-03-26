import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface LambdaStackProps extends cdk.StackProps {
    vpc: ec2.Vpc;
    privateSubnet: ec2.ISubnet;
    ssoAccountId: string;
    ssoInstanceArn: string;
}


export class LambdaStack extends cdk.Stack {
    public readonly getEmployeesLambda: lambda.Function;
    public readonly lambdaArn: cdk.CfnOutput;

    constructor(scope: Construct, id: string, props: LambdaStackProps) {
        super(scope, id, props);

        // SecurityGroupの作成
        const lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
            vpc: props.vpc,
            description: 'Allow outbound access to NAT Gateway',
            allowAllOutbound: false,
        });
        lambdaSecurityGroup.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS outbound to NAT Gateway')
        lambdaSecurityGroup.addIngressRule(ec2.Peer.securityGroupId(props.vpc.vpcDefaultSecurityGroup), ec2.Port.tcp(443),'Allow HTTPS inbound from VPC default security group');

        // IAMロールの作成
        const lambdaRole = new iam.Role(this, 'LambdaRole', {
            assumedBy: new iam.CompositePrincipal(
                new iam.ServicePrincipal('lambda.amazonaws.com'),
            ),
        });
        lambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'));

        lambdaRole.addToPolicy(new iam.PolicyStatement({
            actions: ['ec2:DescribeNetworkInterfaces', 'ec2:CreateNetworkInterface', 'ec2:DeleteNetworkInterface'],
            resources: ['*'],
        }));

        // Lambda関数の作成
        this.getEmployeesLambda = new lambda.Function(this, 'GetEmployeesLambda', {
            functionName: 'getEmployeesFunction',
            runtime: lambda.Runtime.PROVIDED_AL2023,
            architecture: lambda.Architecture.X86_64,
            code: lambda.Code.fromAsset('lambda/archive/getemployees.zip'),
            handler: 'bootstrap',
            vpc: props.vpc,
            vpcSubnets: {subnets: [props.privateSubnet]},
            securityGroups: [lambdaSecurityGroup],
            role: lambdaRole,
            timeout: cdk.Duration.seconds(30),
        });

        // タグの付与
        cdk.Tags.of(this.getEmployeesLambda).add('kot-management', 'true');
    };
};