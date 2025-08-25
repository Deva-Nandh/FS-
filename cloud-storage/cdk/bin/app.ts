#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CloudStorageStack } from '../lib/cloud-storage-stack';

const app = new cdk.App();
new CloudStorageStack(app, 'FSCloudStorageStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});

