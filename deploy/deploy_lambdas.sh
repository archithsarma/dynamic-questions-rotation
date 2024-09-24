#!/bin/bash

if [ -z "$AWS_REGION" ] || [ -z "$ACCOUNT_ID" ] || [ -z "$LAMBDA_ROLE_ARN" ]; then
  echo "Error: AWS_REGION, ACCOUNT_ID, and LAMBDA_ROLE_ARN environment variables are required."
  exit 1
fi

cd lambdas/schedule
zip -r function.zip .
aws lambda create-function \
    --function-name scheduleLambda \
    --runtime nodejs14.x \
    --role $LAMBDA_ROLE_ARN \
    --handler index.handler \
    --timeout 30 \
    --memory-size 128 \
    --zip-file fileb://function.zip \
    --region $AWS_REGION
cd ../..

cd lambdas/getQuestion
zip -r function.zip .
aws lambda create-function \
    --function-name getQuestionLambda \
    --runtime nodejs14.x \
    --role $LAMBDA_ROLE_ARN \
    --handler index.handler \
    --timeout 30 \
    --memory-size 128 \
    --zip-file fileb://function.zip \
    --region $AWS_REGION
cd ../..

cd lambdas/configureSchedule
zip -r function.zip .
aws lambda create-function \
    --function-name configureScheduleLambda \
    --runtime nodejs14.x \
    --role $LAMBDA_ROLE_ARN \
    --handler index.handler \
    --timeout 30 \
    --memory-size 128 \
    --zip-file fileb://function.zip \
    --region $AWS_REGION
cd ../..

echo "Lambdas deployed successfully!"
