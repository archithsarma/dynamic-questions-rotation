import pkg from "@aws-sdk/client-dynamodb";
const { DynamoDBClient } = pkg;
import {
  DynamoDBDocumentClient,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

const dynamodb = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamodb);
import { createClient } from "redis";

const regions = ["SG", "US"];
const TABLE_NAME = process.env.DYNAMODB_TABLE;

// Initialize ElastiCache Redis client
const redisClient = createClient({
  password: process.env.PASSWORD,
  socket: {
    host: process.env.ELASTICACHE_HOST,
    port: process.env.ELASTICACHE_PORT,
  },
});
await redisClient.connect();

export const handler = async (event) => {
  const invocationTime = new Date();

  try {
    for (const region of regions) {
      console.log("region", region);
      await rotateAndUpdateCache(region, invocationTime);
    }

    return {
      statusCode: 200,
      body: "Questions rotated and cache updated successfully",
    };
  } catch (error) {
    console.error("Error in handler:", error);
    return { statusCode: 500, body: "Error rotating questions" };
  } 
};

// rotates the question and update the cache
const rotateAndUpdateCache = async (region, endDate) => {
  try {
    console.log(`Rotating question for region: ${region}`);

    redisClient.del(`question_${region}`);
    console.log(`Cache invalidated for region: ${region}`);

    const params = {
      TableName: TABLE_NAME,
      KeyConditionExpression: "#region = :region", 
      FilterExpression: "used = :used", 
      ExpressionAttributeNames: {
        "#region": "region", 
      },
      ExpressionAttributeValues: {
        ":region": region, 
        ":used": 0, 
      },
    };

    const data = await docClient.send(new QueryCommand(params));
    console.log(data);
    const nextQuestion = data?.Items[0];

    if (nextQuestion) {
      const currentDate = new Date();

      const updateParams = {
        TableName: TABLE_NAME,
        Key: {
          region: nextQuestion.region, // Partition key
          question_id: nextQuestion.question_id, // Sort key
        },
        UpdateExpression:
          "set used = :used, last_used_start_date = :start_date, last_used_end_date = :end_date, active = :active",
        ExpressionAttributeValues: {
          ":used": 1, 
          ":start_date": currentDate.toISOString(), 
          ":end_date": endDate.toISOString(), 
          ":active": true, 
        },
      };

      // Update DynamoDB 
      await dynamodb.send(new UpdateCommand(updateParams));
      const questionData = {
        region: nextQuestion.region,
        question_id: nextQuestion.question_id,
        question_text: nextQuestion.question_text,
        last_used_start_date: currentDate.toISOString(),
        last_used_end_date: endDate.toISOString(),
      };

      // Update Redis cache 
      redisClient.set(
        `question_${region}`,
        JSON.stringify(questionData),
        "EX",
        getCacheExpirationTime(endDate)
      );

      console.log(
        `New question rotated for region ${region} and updated in cache.`
      );
    } else {
      console.log(`No unused questions found for region ${region}`);
    }
  } catch (error) {
    console.error(
      `Error rotating and updating cache for region ${region}:`,
      error
    );
    throw error;
  }
};

// Calculate cache expiration time in seconds based on the next EventBridge invocation
const getCacheExpirationTime = (endDate) => {
  const now = new Date();
  const expirationTimeInSeconds = Math.floor((new Date(endDate) - now) / 1000);
  return expirationTimeInSeconds > 0 ? expirationTimeInSeconds : 60 * 60;
};
