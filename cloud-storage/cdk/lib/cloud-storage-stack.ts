import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';

export class CloudStorageStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // S3 bucket with versioning and lifecycle rule
    const bucket = new s3.Bucket(this, 'FilesBucket', {
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [
        {
          noncurrentVersionsToRetain: 5,
          noncurrentVersionTransitions: [
            { storageClass: s3.StorageClass.GLACIER, transitionAfter: Duration.days(30) },
          ],
        },
      ],
      removalPolicy: RemovalPolicy.RETAIN,
      enforceSSL: true,
    });

    // DynamoDB table for metadata and download history
    const table = new dynamodb.Table(this, 'MetadataTable', {
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // GSI to list files by owner (and sort by createdAt)
    table.addGlobalSecondaryIndex({
      indexName: 'byOwner',
      partitionKey: { name: 'ownerId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Cognito User Pool for authentication
    const userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      passwordPolicy: { minLength: 8, requireLowercase: true, requireUppercase: true, requireDigits: true },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      generateSecret: false,
      authFlows: { userPassword: true, userSrp: true },
    });

    // Groups for RBAC
    const adminGroup = new cognito.CfnUserPoolGroup(this, 'AdminGroup', {
      groupName: 'admin',
      userPoolId: userPool.userPoolId,
    });
    const uploaderGroup = new cognito.CfnUserPoolGroup(this, 'UploaderGroup', {
      groupName: 'uploader',
      userPoolId: userPool.userPoolId,
    });
    const viewerGroup = new cognito.CfnUserPoolGroup(this, 'ViewerGroup', {
      groupName: 'viewer',
      userPoolId: userPool.userPoolId,
    });

    // Common NodejsFunction bundling props
    const nodeFnDefaults: Partial<NodejsFunctionProps> = {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: Duration.seconds(10),
      bundling: {
        minify: true,
        externalModules: [],
        target: 'node20',
      },
      environment: {
        BUCKET_NAME: bucket.bucketName,
        TABLE_NAME: table.tableName,
      },
    };

    const requestUploadFn = new NodejsFunction(this, 'RequestUploadFn', {
      entry: path.join(__dirname, '../../backend/functions/requestUpload.ts'),
      ...nodeFnDefaults,
    });

    const requestDownloadFn = new NodejsFunction(this, 'RequestDownloadFn', {
      entry: path.join(__dirname, '../../backend/functions/requestDownload.ts'),
      ...nodeFnDefaults,
    });

    const listFilesFn = new NodejsFunction(this, 'ListFilesFn', {
      entry: path.join(__dirname, '../../backend/functions/listFiles.ts'),
      ...nodeFnDefaults,
    });

    const updateTagsFn = new NodejsFunction(this, 'UpdateTagsFn', {
      entry: path.join(__dirname, '../../backend/functions/updateTags.ts'),
      ...nodeFnDefaults,
    });

    const getHistoryFn = new NodejsFunction(this, 'GetHistoryFn', {
      entry: path.join(__dirname, '../../backend/functions/getHistory.ts'),
      ...nodeFnDefaults,
    });

    // Permissions
    bucket.grantPut(requestUploadFn);
    bucket.grantRead(requestDownloadFn);
    bucket.grantRead(listFilesFn);

    table.grantReadWriteData(requestUploadFn);
    table.grantReadData(requestDownloadFn);
    table.grantReadData(listFilesFn);
    table.grantReadWriteData(updateTagsFn);
    table.grantReadData(getHistoryFn);

    // API Gateway with Cognito authorizer
    const api = new apigw.RestApi(this, 'FsApi', {
      restApiName: 'FS Cloud Storage API',
      deployOptions: { stageName: 'prod' },
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.DEFAULT_METHODS,
        allowHeaders: ['Authorization', 'Content-Type'],
      },
    });

    const authorizer = new apigw.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [userPool],
      identitySource: 'method.request.header.Authorization',
    });

    const files = api.root.addResource('files');
    const uploads = files.addResource('upload');
    const downloads = files.addResource('download');
    const tags = files.addResource('tags');
    const history = files.addResource('history');

    const defaultMethodOptions: apigw.MethodOptions = {
      authorizationType: apigw.AuthorizationType.COGNITO,
      authorizer: { authorizerId: authorizer.authorizerId },
    };

    uploads.addMethod('POST', new apigw.LambdaIntegration(requestUploadFn), defaultMethodOptions);
    downloads.addMethod('GET', new apigw.LambdaIntegration(requestDownloadFn), defaultMethodOptions);
    files.addMethod('GET', new apigw.LambdaIntegration(listFilesFn), defaultMethodOptions);
    tags.addMethod('POST', new apigw.LambdaIntegration(updateTagsFn), defaultMethodOptions);
    history.addMethod('GET', new apigw.LambdaIntegration(getHistoryFn), defaultMethodOptions);

    // Outputs
    new cdk.CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, 'BucketName', { value: bucket.bucketName });
    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url });
  }
}

