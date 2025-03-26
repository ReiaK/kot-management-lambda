import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import 'dotenv/config'


export class VpcStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly publicSubnet: ec2.ISubnet;
  public readonly privateSubnet: ec2.ISubnet;
  public readonly lambdaEndpoint: ec2.InterfaceVpcEndpoint;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, "KotManagementVPC", {
      maxAzs: 1,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "PublicSubnet",
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: "PrivateSubnet",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });
    this.publicSubnet = this.vpc.publicSubnets[0];
    this.privateSubnet = this.vpc.privateSubnets[0];

    // Lambdaエンドポイントの作成
    this.lambdaEndpoint = new ec2.InterfaceVpcEndpoint(this, 'LambdaEndpoint', {
      vpc: this.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.LAMBDA,
      privateDnsEnabled: true,
      subnets: {subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS},
    });

    // タグの付与
    cdk.Tags.of(this.vpc).add("kot-management", "true");
  };
};
