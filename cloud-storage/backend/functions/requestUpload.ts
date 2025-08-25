import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

const s3 = new S3Client({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const BUCKET_NAME = process.env.BUCKET_NAME!;
const TABLE_NAME = process.env.TABLE_NAME!;

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const contentType = body.contentType || 'application/octet-stream';
    const userId = event.requestContext.authorizer?.jwt?.claims?.sub || 'unknown';
    const fileId = uuidv4();

    const key = `${userId}/${fileId}`;

    // Prepare a presigned PUT URL
    const command = new PutObjectCommand({ Bucket: BUCKET_NAME, Key: key, ContentType: contentType });
    const url = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 minutes

    // Save metadata record
    await ddb.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk: `FILE#${fileId}`,
        sk: `OWNER#${userId}`,
        ownerId: userId,
        contentType,
        createdAt: new Date().toISOString(),
        tags: [],
        versions: [],
      },
    }));

    return { statusCode: 200, body: JSON.stringify({ uploadUrl: url, fileId, key }) };
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ message: 'Failed to create upload URL', error: err?.message }) };
  }
};

