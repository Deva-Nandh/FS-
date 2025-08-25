# FS Cloud Storage — Security Architecture

This document summarizes the security controls used in the solution.

- Data at rest: S3 default encryption (SSE-S3). Optionally switch to SSE-KMS for tighter key control.
- Data in transit: Enforced HTTPS (S3 enforceSSL, API Gateway HTTPS). Presigned URLs expire in 5 minutes.
- Authentication: Cognito User Pool. Users sign in with email + password; SRP supported.
- Authorization: Cognito groups (admin, uploader, viewer) with API Gateway authorizer. IAM policies grant Lambdas least privilege to S3 and DynamoDB.
- Network: Fully serverless (API Gateway, Lambda, S3, DynamoDB, Cognito). No inbound ports or servers to manage.
- Secrets: No long-lived credentials in code. Use AWS-managed auth context and short-lived presigned URLs.
- Auditing: CloudWatch Logs for Lambdas and API Gateway. DynamoDB records download activity.
- Lifecycle: S3 lifecycle rules archive non-current versions to Glacier after 30 days (configurable).
- Compliance considerations: Enable CloudTrail and AWS Config in the account for full audit trails.

