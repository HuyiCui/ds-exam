import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = { wrapNumbers: false };
  return DynamoDBDocumentClient.from(ddbClient, {
    marshallOptions,
    unmarshallOptions,
  });
}
const client = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  console.log("Event:", JSON.stringify(event));

  const movieId = event.pathParameters?.movieId;
  if (!movieId) {
    return jsonResp(400, { message: "movieId path parameter is required" });
  }

  const role = event.queryStringParameters?.role; 

  try {
    if (role) {
      const { Item } = await client.send(
        new GetCommand({
          TableName: process.env.TABLE_NAME!,
          Key: { movieId: Number(movieId), role },
        })
      );
      if (!Item) return jsonResp(404, { message: "Crew member not found" });
      return jsonResp(200, Item);
    } else {
      const { Items } = await client.send(
        new QueryCommand({
          TableName: process.env.TABLE_NAME!,
          KeyConditionExpression: "movieId = :mid",
          ExpressionAttributeValues: { ":mid": Number(movieId) },
        })
      );
      return jsonResp(200, Items ?? []);
    }
  } catch (err) {
    console.error("DynamoDB error:", err);
    return jsonResp(500, { message: "Internal server error" });
  }
};

function jsonResp(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}
