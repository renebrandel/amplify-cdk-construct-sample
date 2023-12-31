import * as cdk from 'aws-cdk-lib';
import * as path from 'path'
import { AmplifyGraphqlApi, AmplifyGraphqlDefinition } from '@aws-amplify/graphql-api-construct';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class BackendStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const amplifyApi = new AmplifyGraphqlApi(this, 'AmplifyCdkGraphQlApi', {
      definition: AmplifyGraphqlDefinition.fromFiles(path.join(__dirname, 'schema.graphql')),
      authorizationModes: {
        defaultAuthorizationMode: 'API_KEY',
        apiKeyConfig: {
          expires: cdk.Duration.days(30) 
        }
      },
    })

    // HOW TO USE CUSTOM BUSINESS LOGIC - TWO POSSIBLE OPTIONS
    // OPTION 1: Use Lambda function
    const echoLambda = new lambda.Function(this, 'EchoLambda', {
      functionName: 'EchoLambda', // MAKE SURE THIS MATCHES THE @function's "name" PARAMETER
      code: lambda.Code.fromAsset(path.join(__dirname, 'handlers/echo')),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_18_X
    })

    // OPTION 2: Use a custom JS resolver
    // (demo shows how to connect AppSync to SNS)
    this.addSNSTopicHandler(amplifyApi)

    // UNCOMMENT the line below to configure a Private API (setting only available on L1)
    // amplifyApi.resources.cfnResources.cfnGraphqlApi.visibility = 'PRIVATE'
  }

  private addSNSTopicHandler(amplifyApi: AmplifyGraphqlApi) {
    // 1. Create a new topic and setup an email subscription
    const topic = new Topic(this, 'Amplify-Cdk-Test-Topic')
    topic.addSubscription(new EmailSubscription("renbran@amazon.com"))
                                              // ^ ENTER YOUR EMAIL HERE

    // 2. Create a data source to connect AppSync to the SNS topic
    const dataSource = amplifyApi.addHttpDataSource(
      'sns',
      `https://sns.${this.region}.amazonaws.com`,
      {
        authorizationConfig: {
          signingRegion: this.region,
          signingServiceName: 'sns'
        }
      }
    )
    dataSource.node.addDependency(topic)
    topic.grantPublish(dataSource.grantPrincipal)

    // 3. Author function code to publish an event to SNS
    const sendEmailFunction = amplifyApi.addFunction('sendEmailFunction', {
      name: 'sendEmailFunction',
      dataSource: dataSource,
      code: appsync.Code.fromAsset(path.join(__dirname, 'mappings/sendEmail.js')),
      runtime: appsync.FunctionRuntime.JS_1_0_0
    })

    // 4. Add a before mapping template to stash the topic ARN in the context
    const resolverCodeWithTopicArn = `
      export function request(ctx) {
        ctx.stash.topicArn = "${topic.topicArn}"
        return {}
      }

      export function response(ctx) {
        return ctx.prev.result
      }
    `

    // 5. Attach resolver to "Mutation.sendEmail"
    amplifyApi.addResolver('snsPipelineResolver', {
      typeName: 'Mutation',
      fieldName: 'sendEmail',
      code: appsync.Code.fromInline(resolverCodeWithTopicArn),
      runtime: appsync.FunctionRuntime.JS_1_0_0,
      pipelineConfig: [sendEmailFunction]
    })
  }
}