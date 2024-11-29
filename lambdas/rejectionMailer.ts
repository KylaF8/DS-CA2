import { SQSHandler } from "aws-lambda";
import { SES_EMAIL_FROM, SES_EMAIL_TO, SES_REGION } from "../env";
import {
  SESClient,
  SendEmailCommand,
  SendEmailCommandInput,
} from "@aws-sdk/client-ses";

if (!SES_EMAIL_TO || !SES_EMAIL_FROM || !SES_REGION) {
  throw new Error(
    "Please add the SES_EMAIL_TO, SES_EMAIL_FROM and SES_REGION environment variables in an env.js file located in the root directory"
  );
}

type RejectionDetails = {
  fileName: string;
  reason: string;
};

const client = new SESClient({ region: SES_REGION });

export const handler: SQSHandler = async (event: any) => {
  console.log("Event ", JSON.stringify(event));
  for (const record of event.Records) {
    const recordBody = JSON.parse(record.body);
    const fileName = recordBody.fileName;
    const reason = recordBody.reason;

    try {
      const rejectionDetails: RejectionDetails = {
        fileName,
        reason,
      };

      const params = sendEmailParams(rejectionDetails);
      await client.send(new SendEmailCommand(params));
      console.log(`Rejection email sent for file: ${fileName}`);
    } catch (error: unknown) {
      console.error(`Error sending rejection email for file ${fileName}:`, error);
    }
  }
};

function sendEmailParams({ fileName, reason }: RejectionDetails) {
  const parameters: SendEmailCommandInput = {
    Destination: {
      ToAddresses: [SES_EMAIL_TO],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: getHtmlContent({ fileName, reason }),
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: `File Upload Rejected: ${fileName}`,
      },
    },
    Source: SES_EMAIL_FROM,
  };
  return parameters;
}

function getHtmlContent({ fileName, reason }: RejectionDetails) {
  return `
    <html>
      <body>
        <h2>File Upload Rejected</h2>
        <p style="font-size:18px">Unfortunately, your file <b>${fileName}</b> could not be processed.</p>
        <p style="font-size:18px">Reason: <b>${reason}</b></p>
      </body>
    </html>
  `;
}