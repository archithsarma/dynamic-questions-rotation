#!/bin/bash

if [ -z "$AWS_REGION" ] || [ -z "$ACCOUNT_ID" ]; then
  echo "Error: AWS_REGION and ACCOUNT_ID environment variables are required."
  exit 1
fi

aws dynamodb create-table \
    --table-name QUESTIONS \
    --attribute-definitions \
        AttributeName=question_id,AttributeType=S \
        AttributeName=region,AttributeType=S \
        AttributeName=active,AttributeType=BOOL \
        AttributeName=last_used_start_date,AttributeType=S \
        AttributeName=last_used_end_date,AttributeType=S \
        AttributeName=question_text,AttributeType=S \
        AttributeName=used,AttributeType=BOOL \
    --key-schema \
        AttributeName=question_id,KeyType=HASH \
        AttributeName=region,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --global-secondary-indexes \
        "[
            {
                \"IndexName\": \"RegionIndex\",
                \"KeySchema\": [{\"AttributeName\":\"region\",\"KeyType\":\"HASH\"}],
                \"Projection\": {\"ProjectionType\":\"ALL\"}
            }
        ]" \
    --tags Key=Environment,Value=Production \
    --region $AWS_REGION


echo "DynamoDB tables created successfully!"
