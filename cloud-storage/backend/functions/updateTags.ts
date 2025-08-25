import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME!;

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { fileId, tags } = body;
    if (!fileId || !Array.isArray(tags)) {
      return { statusCode: 400, body: JSON.stringify({ message: 'fileId and tags[] required' }) };
    }

    const userId = event.requestContext.authorizer?.jwt?.claims?.sub || 'unknown';

    await ddb.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { pk: `FILE#${fileId}`, sk: `OWNER#${userId}` },
      UpdateExpression: 'SET #tags = :tags',
      ExpressionAttributeNames: { '#tags': 'tags' },
      ExpressionAttributeValues: { ':tags': tags },
      ConditionExpression: 'attribute_exists(pk)'
    }));

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ message: 'Failed to update tags', error: err?.message }) };
  }
};

