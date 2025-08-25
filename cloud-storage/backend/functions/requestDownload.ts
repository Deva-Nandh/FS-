import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const BUCKET_NAME = process.env.BUCKET_NAME!;
const TABLE_NAME = process.env.TABLE_NAME!;

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const qs = event.queryStringParameters || {};
    const fileId = qs.fileId;
    if (!fileId) {
      return { statusCode: 400, body: JSON.stringify({ message: 'fileId is required' }) };
    }

    const userId = event.requestContext.authorizer?.jwt?.claims?.sub || 'unknown';
    const key = `${userId}/${fileId}`;

    const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
    const url = await getSignedUrl(s3, command, { expiresIn: 300 });

    // Log download in history
    await ddb.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk: `FILE#${fileId}`,
        sk: `DOWNLOAD#${Date.now()}`,
        downloadedBy: userId,
        at: new Date().toISOString(),
      },
    }));

    return { statusCode: 200, body: JSON.stringify({ downloadUrl: url }) };
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ message: 'Failed to create download URL', error: err?.message }) };
  }
};

