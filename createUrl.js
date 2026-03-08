// createUrl.js - Lambda function to create a short URL
const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { nanoid } = require("nanoid");

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const TABLE_NAME = process.env.DYNAMODB_TABLE;
const BASE_URL = process.env.BASE_URL; // e.g. https://xyz.execute-api.us-east-1.amazonaws.com/prod

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { longUrl, customAlias, ttlDays } = body;

    // Validate URL
    if (!longUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "longUrl is required" }),
      };
    }

    try {
      new URL(longUrl); // throws if invalid
    } catch {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid URL format" }),
      };
    }

    // Generate or use custom short code
    const shortCode = customAlias || nanoid(7);

    // Optional: TTL for auto-expiry (e.g., 30 days)
    const ttl = ttlDays
      ? Math.floor(Date.now() / 1000) + ttlDays * 86400
      : null;

    const item = {
      shortCode: { S: shortCode },
      longUrl: { S: longUrl },
      createdAt: { S: new Date().toISOString() },
      clicks: { N: "0" },
    };

    if (ttl) {
      item.ttl = { N: String(ttl) };
    }

    await client.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: item,
        // Prevent overwriting existing codes
        ConditionExpression: "attribute_not_exists(shortCode)",
      })
    );

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        shortUrl: `${BASE_URL}/${shortCode}`,
        shortCode,
        longUrl,
        createdAt: item.createdAt.S,
      }),
    };
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: "Short code already exists. Try a different alias." }),
      };
    }

    console.error("Error creating URL:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
