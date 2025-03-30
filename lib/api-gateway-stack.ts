import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import { Construct } from "constructs";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";

interface ApiGatewayStackProps extends cdk.StackProps {
  getEmployeesLambda: lambda.Function;
}

export class ApiGatewayStack extends cdk.Stack {
  public readonly httpApi: apigatewayv2.HttpApi;
  constructor(scope: Construct, id: string, props: ApiGatewayStackProps) {
    super(scope, id, props);

    // API Gatewayの作成
    this.httpApi = new apigatewayv2.HttpApi(this, "KotManagementApiGateway", {
      corsPreflight: {
        allowOrigins: ["*"], // 必要に応じて適切なオリジンを設定
        allowMethods: [apigatewayv2.CorsHttpMethod.ANY], // 必要に応じて適切なメソッドを設定
        allowHeaders: ["Content-Type", "Authorization"],
      },
    });

    const lambdaIntegration = new HttpLambdaIntegration(
      "GetEmployeesIntegration",
      props.getEmployeesLambda
    );

    this.httpApi.addRoutes({
      path: "/api/employees",
      methods: [apigatewayv2.HttpMethod.GET],
      integration: lambdaIntegration,
    });

    this.httpApi.addRoutes({
      path: "/api/employees/{division}",
      methods: [apigatewayv2.HttpMethod.GET],
      integration: lambdaIntegration,
    });

    new cdk.CfnOutput(this, 'ApiGatewayEndpoint', {
      value: this.httpApi.apiEndpoint,
      exportName: 'KotManagementApiGatewayEndpoint',
    });

    // タグの付与
    cdk.Tags.of(this.httpApi).add("kot-management", "true");
  }
}
