#!/bin/bash

if [ -z "$AWS_REGION" ] || [ -z "$SCHEDULE_LAMBDA_ARN" ]; then
  echo "Error: AWS_REGION and SCHEDULE_LAMBDA_ARN environment variables are required."
  exit 1
fi

aws events put-rule \
    --name DailyQuestionRotation \
    --schedule-expression "cron(0 11 ? * 2 *)" \
    --region $AWS_REGION

aws events put-targets \
    --rule DailyQuestionRotation \
    --targets "Id"="1","Arn"="$SCHEDULE_LAMBDA_ARN" \
    --region $AWS_REGION

echo "EventBridge rule configured successfully!"
