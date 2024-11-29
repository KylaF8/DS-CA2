/* eslint-disable import/extensions, import/no-absolute-path */
import { SQSHandler } from "aws-lambda";
import {
  GetObjectCommand,
  PutObjectCommandInput,
  GetObjectCommandInput,
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { DynamoDBClient, PutItemCommand, PutItemCommandInput } from "@aws-sdk/client-dynamodb";

const s3 = new S3Client();
const dynamodb = new DynamoDBClient();

const tableName = process.env.TABLE_NAME;

export const handler: SQSHandler = async (event) => {
  console.log("Event ", JSON.stringify(event));
  for (const record of event.Records) {
    const recordBody = JSON.parse(record.body);        //Parse SQS message
    const snsMessage = JSON.parse(recordBody.Message); //Parse SNS message

    if (snsMessage.Records) {
      console.log("Record body ", JSON.stringify(snsMessage));
      for (const messageRecord of snsMessage.Records) {
        const s3e = messageRecord.s3;
        const srcBucket = s3e.bucket.name;

        const file = decodeURIComponent(s3e.object.key.replace(/\+/g, " "));

        if (!file.endsWith(".jpeg") && !file.endsWith(".png")) {
          console.log(`File ${file} is not a valid image type.`);
          console.error(`File ${file} is not a valid image type.`);
          throw new Error(`Invalid file type: ${file}`);
        }

        try {
          const params: GetObjectCommandInput = {
            Bucket: srcBucket,
            Key: file,
          };
          await s3.send(new GetObjectCommand(params));

          const dynamoParams: PutItemCommandInput = {
            TableName: tableName,
            Item: {
              ImageName: { S: file },
            },
          };
          await dynamodb.send(new PutItemCommand(dynamoParams));
          console.log(`Saved the file: ${file}'s metadata to DynamoDB`);
        } catch (error) {
          console.log(error);
          console.error(`Error processing file ${file}:`, error);
          throw error;
        }
      }
    }
  }
};