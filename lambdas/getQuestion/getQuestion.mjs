import { createClient } from "redis";

// Create Redis client once (outside the handler for performance optimization
const redisClient = createClient({
  password: process.env.PASSWORD,
  socket: {
    host: process.env.ELASTICACHE_HOST,
    port: process.env.ELASTICACHE_PORT,
  },
});
await redisClient.connect();

// in-memory cache (for regions with high hit rate)
const cache = {};

export const handler = async (event) => {
  try {
    const region = event.region;

    if (cache[region]) {
      console.log(`Cache hit (in-memory) for region: ${region}`);
      return {
        statusCode: 200,
        question: cache[region],
      };
    }
    // if not available in in-memory cache
    const cachedData = await redisClient.get(`question_${region}`);
    if (cachedData) {
      console.log(cachedData);

      console.log(`Cache hit (Redis) for region: ${region}`);
      cache[region] = JSON.parse(cachedData); //in memory cache updated

      return {
        statusCode: 200,
        question: cache[region],
      };
    } else {
      console.log(`Cache miss for region: ${region}`);
      return {
        statusCode: 404,
        error: "Question not found for this region",
      };
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing Redis connection.");
  await redisClient.quit();
});
