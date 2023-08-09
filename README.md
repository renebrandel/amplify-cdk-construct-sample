# Test the Amplify GraphQL API L3 CDK construct (pre-alpha)

🚧 🚧 🚧 🚧 🚧 🚧 🚧 🚧

**DO NOT USE IN PRODUCTION ENVIRONMENTS - FOR TESTING ONLY**

🚧 🚧 🚧 🚧 🚧 🚧 🚧 🚧

This is a sample repository showcasing the Amplify GraphQL API L3 CDK construct (pre-alpha) in action. It allows you to leverage all the benefits of the Amplify GraphQL directives (`@model`, `@auth`, etc.) via CDK. 

## Key features
- 🔗 **GraphQL APIs and connected DynamoDB tables with a single schema**
  - Use the `@model` directive from Amplify to generate both an AppSync API with CRUDL operations and their connected DynamoDB sources. A five line GraphQL schema in Amplify would’ve taken hundreds of lines of code and multiple files to write previously.
- 🤯 **Use all Amplify GraphQL directives such as `@auth`**
  - Instead of hand-authoring hundreds of lines of JS/VTL resolver code to handle your app’s authorization needs, you can now leverage Amplify’s `@auth` directive to enforce owner-based authorization, group-authorization with just a single line of code. Don’t worry, you can still write JS/VTL resolver code you if you’d like.
  - This is great for customers that want the ergonomics of Amplify’s GraphQL capabilities but don’t want to setup the Amplify CLI or use CDK tooling already.
- 🚀 **Escape hatches built-in**
  - access/modify all the generated resources as L2 constructs directly from within CDK. No separate build step required.
  - The construct returns an object that contains a resources key. In which you’ll find the L1 and L2 constructs that it generates for resources such as AppSync API, DynamoDB tables, etc.
- 🧑‍💻 **Works seamlessly with the rest of the CDK tooling**
  - In our sample code below, you’ll see how easy it is to combine L2 Lambda Function CDK constructs with the Amplify GraphQL L3 constructs.
  - Yes. It works with CDK pipelines.

## What's deployed as part of this demo?

1. A `Blog` DynamoDB table with authorization rules permitting anyone with an API Key to Create/Read/Update/Delete the items to the table.
2. A `echo` query that returns whatever string is sent to it using a Lambda function handler.
3. A `sendEmail` mutation that publishes an SNS event with an email subscription using **JavaScript resolvers**.
4. A PubSub API (`Mutation.publish`, `Subscription.subscribe`) that allows anyone to publish/subscribe based on a channel & pass freeform data. Uses **VTL resolvers**. 

## Quick tour of `lib/backend-stack.ts`

Go to `lib/backend-stack.ts` to start exploring the code base:
- `lib/backend-stack.ts` includes the AmplifyGraphQlApi CDK construct. You can pass in any schema that works with the Amplify CLI today.
- `lib/mappings` include the resolver mapping templates and functions. The `publish.req.vtl` and `publish.res.vtl` files are the required files for a basic PubSub application. See `addPubSubHandler()` for sample code.
- `addSNSTopicHandler()` showcases how to use the escape hatch to connect the generated L2 construct with additional resources within your AWS account such as an SNS topic. **IMPORTANT: make sure to enter your email into the ENTER_YOUR_EMAIL_HERE to receive the SNS notifications**


## Still work-in-progress items

- [ ] Final API namings and shapes
- [ ] First-class mechanism to author custom resolver code (right now you still need to escape hatch to the L1/L2 constructs)
- [ ] Generate client configurations and GraphQL client code for Amplify libraries
- [ ] Support to work in conjunction with Amplify Studio

## Useful commands
* `cdk watch --hotswap-fallback` watches and deploy ongoing file changes
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template
