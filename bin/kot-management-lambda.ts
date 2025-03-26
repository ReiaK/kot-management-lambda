#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import {VpcStack} from '../lib/vpc-stack';
import { LambdaStack } from '../lib/lambda-stacks';
import { ApiGatewayStack } from '../lib/api-gateway-stack';
import 'dotenv/config';

const app = new cdk.App();

const ssoAccountId = process.env.AWS_SSO_ACCOUNT_ID;
const ssoInstanceArn = process.env.AWS_SSO_INSTANCE_ARN;

if (!ssoAccountId || !ssoInstanceArn) {
  throw new Error('SSO_ACCOUNT_ID or SSO_INSTANCE_ARN environment variable is not set.');
}

const vpcStack = new VpcStack(app, 'VpcStack');
const lambdaStack = new LambdaStack(app, 'LambdaStack', {
  vpc: vpcStack.vpc,
  privateSubnet: vpcStack.privateSubnet,
  ssoAccountId: ssoAccountId,
  ssoInstanceArn: ssoInstanceArn,
});
const apiGatewayStack = new ApiGatewayStack(app, 'ApiGatewayStack', {
  getEmployeesLambda: lambdaStack.getEmployeesLambda,
})