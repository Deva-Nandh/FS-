import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME!;

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = event.requestContext.authorizer?.jwt?.claims?.sub || 'unknown';

    // List files for this user (items where sk starts with OWNER#)
    const res = await ddb.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'pk BETWEEN :filePrefix AND :fileSuffix',
      ExpressionAttributeValues: {
        ':filePrefix': 'FILE#',
        ':fileSuffix': 'FILE$' // hacky end; consider a GSI in a real setup
      },
      Limit: 50
    }));

    return { statusCode: 200, body: JSON.stringify({ items: res.Items || [] }) };
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ message: 'Failed to list files', error: err?.message }) };
  }
};

