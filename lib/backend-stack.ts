import * as cdk from 'aws-cdk-lib';
import * as path from 'path'
import { AmplifyGraphqlApi, AmplifyGraphqlSchema } from '@aws-amplify/graphql-construct-alpha';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class BackendStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const amplifyApi = new AmplifyGraphqlApi(this, 'AmplifyCdkGraphQlApi', {
      schema: AmplifyGraphqlSchema.fromSchemaFiles(appsync.SchemaFile.fromAsset(path.join(__dirname, 'schema.graphql'))),
      authorizationConfig: {
        defaultAuthMode: 'API_KEY',
        apiKeyConfig: {
          expires: cdk.Duration.days(30) 
        }
      },
    })

    // HOW TO USE CUSTOM BUSINESS LOGIC - THREE POSSIBLE OPTIONS
    // OPTION 1: Use Lambda function
    const echoLambda = new lambda.Function(this, 'EchoLambda', {
      functionName: 'EchoLambda', // MAKE SURE THIS MATCHES THE @function's "name" PARAMETER
      code: lambda.Code.fromAsset(path.join(__dirname, 'handlers/echo')),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_18_X
    })

    // Alternatively, extend AppSync L2 Construct to use JS or VTL resolvers
    const appSyncApi = amplifyApi.resources.graphqlApi 

    // OPTION 2: Use a custom JS resolver
    // (demo shows how to connect AppSync to SNS)
    this.addSNSTopicHandler(appSyncApi)

    // OPTION 3: Use a custom VTL resolver
    // (demo shows how to build a PubSub API with VTL unit resolver + NONE data source)
    this.addPubSubHandler(appSyncApi)

    // UNCOMMENT the line below to configure a Private API (setting only available on L1)
    // amplifyApi.resources.cfnResources.cfnGraphqlApi.visibility = 'PRIVATE'
  }

  private addPubSubHandler(appSyncApi: appsync.IGraphqlApi) {
    // 1. Create a "NONE" data source to handle publish request locally within AppSync
    const dataSource = appSyncApi.addNoneDataSource("PubSubNone")

    // 2. Forward the published data based on channel name upon "Mutation.publish"
    new appsync.Resolver(this, "PubSubResolver", {
      api: appSyncApi,
      dataSource: dataSource,
      typeName: "Mutation",
      fieldName: "publish",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(path.join(__dirname, "mappings/publish.req.vtl")),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(path.join(__dirname, "mappings/publish.res.vtl")),
    })
  }

  private addSNSTopicHandler(appSyncApi: appsync.IGraphqlApi) {
    // 1. Create a new topic and setup an email subscription
    const topic = new Topic(this, 'Amplify-Cdk-Test-Topic')
    topic.addSubscription(new EmailSubscription("renbran@amazon.com"))
                                              // ^ ENTER YOUR EMAIL HERE

    // 2. Create a data source to connect AppSync to the SNS topic
    const dataSource = appSyncApi.addHttpDataSource(
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
    const sendEmailFunction = new appsync.AppsyncFunction(this, 'sendEmailFunction', {
      name: 'sendEmailFunction',
      api: appSyncApi,
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
    new appsync.Resolver(this, 'snsPipelineResolver', {
      api: appSyncApi,
      typeName: 'Mutation',
      fieldName: 'sendEmail',
      code: appsync.Code.fromInline(resolverCodeWithTopicArn),
      runtime: appsync.FunctionRuntime.JS_1_0_0,
      pipelineConfig: [sendEmailFunction]
    })
  }
}