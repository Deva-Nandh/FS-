import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME!;

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = event.requestContext.authorizer?.jwt?.claims?.sub || 'unknown';

    // Query by owner using GSI (byOwner)
    const res = await ddb.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'byOwner',
      KeyConditionExpression: 'ownerId = :uid',
      ExpressionAttributeValues: {
        ':uid': userId,
      },
      ScanIndexForward: false,
      Limit: 50,
    }));

    return { statusCode: 200, body: JSON.stringify({ items: res.Items || [] }) };
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ message: 'Failed to list files', error: err?.message }) };
  }
};

