import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME!;

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const qs = event.queryStringParameters || {};
    const fileId = qs.fileId;
    if (!fileId) {
      return { statusCode: 400, body: JSON.stringify({ message: 'fileId is required' }) };
    }

    const res = await ddb.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `FILE#${fileId}`,
        ':prefix': 'DOWNLOAD#',
      },
      Limit: 50,
      ScanIndexForward: false
    }));

    return { statusCode: 200, body: JSON.stringify({ items: res.Items || [] }) };
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ message: 'Failed to get history', error: err?.message }) };
  }
};

