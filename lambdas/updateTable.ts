import { SNSHandler } from "aws-lambda";
import { DynamoDBClient, UpdateItemCommand, UpdateItemCommandInput } from "@aws-sdk/client-dynamodb";

const dynamodb = new DynamoDBClient();
const tableName = process.env.TABLE_NAME;

const VALID_METADATA_TYPES = ["Caption", "Date", "Photographer"];

export const handler: SNSHandler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const snsMessage = JSON.parse(record.Sns.Message);
    const { id, value } = snsMessage;

    const metadataType = record.Sns.MessageAttributes.metadata_type?.Value

    if (!VALID_METADATA_TYPES.includes(metadataType)) {
      console.error(`Invalid metadata type: ${metadataType}`);
      continue;
    }

    if (!id || !value) {
      console.error("Message is missing required fields: id or value");
      continue;
    }

    try {
      const updateParams: UpdateItemCommandInput = {
        TableName: tableName,
        Key: {
          ImageName: { S: id },
        },
        UpdateExpression: `SET #attr = :val`,
        ExpressionAttributeNames: {
          "#attr": metadataType,
        },
        ExpressionAttributeValues: {
          ":val": { S: value },
        },
      };

      await dynamodb.send(new UpdateItemCommand(updateParams));
      console.log(`Updated item ${id} with ${metadataType}: ${value}`);
    } catch (error) {
      console.error(`Failed to update item ${id}:`, error);
    }
  }
};