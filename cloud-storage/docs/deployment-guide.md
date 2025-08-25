# FS Cloud Storage — Deployment Guide

Prerequisites
- Node.js 18+
- AWS CLI configured (aws configure)
- CDK bootstrap in target account/region (cdk bootstrap)

Install dependencies
- cd cloud-storage/cdk
- npm install

Synthesize and deploy
- npm run build
- npm run synth
- npm run deploy

Outputs
- UserPoolId, UserPoolClientId, BucketName, ApiUrl

Test flow (after creating a user)
1) Create a test user in Cognito and assign to a group (uploader/viewer/admin).
2) Authenticate to obtain an ID token (use Hosted UI or Cognito Admin InitiateAuth for quick tests).
3) Call POST {ApiUrl}/files/upload with Authorization: Bearer {idToken} and body {"contentType":"image/png"}.
   - You get an uploadUrl and fileId.
4) PUT your file to uploadUrl.
5) Call GET {ApiUrl}/files/download?fileId={fileId} with Authorization to get a presigned GET URL.
6) Use the URL to download the file. History records in DynamoDB.
7) Call POST {ApiUrl}/files/tags with {"fileId":"...","tags":["tag1","tag2"]}.
8) Call GET {ApiUrl}/files/history?fileId={fileId} to see recent downloads.

Cleanup
- npm run cdk -- destroy (or cdk destroy) to remove resources (note: S3/DDB are retained by default).

