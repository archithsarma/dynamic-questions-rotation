
  

  

## **Overview**

  

  

This repository contains the implementation of a **Question Rotation System** to efficiently rotate and assign questions to users based on their region and a configurable schedule.

  

  

---

  

  

## **Architecture Overview**

  

  

A serverless architecture composed of the following AWS components:

  

  

1.  **AWS Lambda**: Serverless compute service to run code without provisioning or managing servers.

  

2.  **AWS DynamoDB**: NoSQL database service for fast and flexible data storage.

  

3.  **Redis Cache**: In-memory data structure store used as a database, cache, and message broker.

  

4.  **AWS EventBridge**: Serverless event bus service to connect application data from various sources.

  

5.  **AWS API Gateway**: Fully managed service that makes it easy for developers to create, publish, maintain, monitor, and secure APIs.

  

  

## **Implementation Details**

  

  

### **Lambda Functions**

  

  

1.  **schedule Lambda**:

  

-  **Purpose**: Rotates questions for each region and updates the Redis cache.

  

-  **Trigger**: AWS EventBridge based on a cron schedule.

  

-  **Process**:

  

   Fetches new questions from DynamoDB tables (`QUESTIONS`).

  

   Updates the Redis cache with the latest questions for each region.

  

  

2.  **getQuestion Lambda**:

  

-  **Purpose**: Retrieves the current question for a user's region based on API hits

  

-  **Trigger**: Invoked via API Gateway when a user requests a question.

  

-  **Process**:

  

   Checks an in-memory cache for the question for the fastest response

  

   If not found, queries the Redis cache. DynamoDB isn't checked because we are already storing question of the current cycle in the cache. So assuming no need to query it from DB as everything will be stored in the cache during question rotation (since questions are same for suers in the same region).

  

  

3.  **configureSchedule Lambda**:

  

-  **Purpose**: Allows dynamic updates to the question rotation schedule.

  

-  **Trigger**: Invoked via API Gateway when an administrator updates the schedule.

  

-  **Process**:

  

    Receives a new cron expression as input.

  

    Updates the AWS EventBridge rule with the new schedule.

  

  

### **Data Storage**

  

  

-  **AWS DynamoDB**:

  

   -  **QUESTIONS Table**:

  

    -  **Schema**:

  

        -  `question_id` (String UUID) - Partition Key

        

        -  `region` (String) - Sort Key

        

        -  `active` (Boolean)

        

        -  `last_used_start_date` (String)

        

        -  `last_used_end_date` (String)

        

        -  `question_text` (String)

        

        -  `used` (Boolean)

  

  

-  **Redis Cache**:

  

  stores the current question for each region using the key format `question_<region>` {ex : question_SG}.

  

  

### **Event Scheduling**

  

  

-  **AWS EventBridge**:

  

  Manages the cron schedule that triggers the `schedule Lambda`.

  

  The schedule can be dynamically updated via the `configureSchedule Lambda`.

  

  

---

  

  

## **Deployment Steps**

  

  

### **Prerequisites**

  

  

- AWS CLI configured with appropriate permissions.

  

- Node.js and NPM installed for Lambda function dependencies.

  

- Redis instance accessible by the Lambdas (e.g., AWS ElastiCache for Redis).

  

  

### **1. Set Up Environment Variables**

  
Set the following environment variables:


```bash


export  AWS_REGION="your-aws-region"

export  ACCOUNT_ID="your-aws-account-id"

export  LAMBDA_ROLE_ARN="arn:aws:iam::your-account-id:role/your-lambda-execution-role"

export  SCHEDULE_LAMBDA_ARN="arn:aws:lambda:your-region:your-account-id:function:scheduleLambda"

  

```


### **2. Create DynamoDB Tables**


Run the `create_dynamodb_tables.sh` script to create the `QUESTIONS` and `REGIONS` tables.
 

```bash

  

sh  deploy/create_dynamodb_tables.sh

  

```


### **3. Deploy Lambda Functions**

  
Run the `deploy_lambdas.sh` script to package and deploy the Lambda functions.

  
```bash

  

sh  deploy/deploy_lambdas.sh

  

```

  
### **4. Configure EventBridge Schedule**

  

Run the `configure_eventbridge.sh` script to set up the initial cron schedule.

  

```bash

  

sh  deploy/configure_eventbridge.sh

  

```

  
### **5. Set Up API Gateway**

  
Create API Gateway endpoints to trigger the `getQuestion` and `configureSchedule` Lambdas.

  

-  **getQuestion Endpoint**:

  

- Method: GET

  

- Integration: Lambda Proxy Integration with `getQuestionLambda`

  

-  **configureSchedule Endpoint**:

  

- Method: POST

  

- Integration: Lambda Proxy Integration with `configureScheduleLambda`

  

  

---
  

## **Sample API Requests**

  
### **Retrieve a Question**

    

**Request**:

  

```bash

  

curl  --location  --request  GET  'https://api-endpoint/getQuestion'  \

  

--header  'Content-Type: application/json'  \

  

--data  '{

  

"region": "SG"

  

}'

  

```

  

To test, use the endpoint - https://vst3sgrho7.execute-api.ap-south-1.amazonaws.com/test/getQuestion

  

**Response**:


```json

  

{

  

"region": "SG",

  

"question_text": "What is your favorite hobby?",

  

"active": true

  

}
 

```

  

### **Configure the Cron Schedule**


**Request**:

  

```bash

  

curl  --location  --request  POST  'https://api-endpoint/configureSchedule'  \

  

--header  'Content-Type: application/json'  \

  

--data  '{

  

"cronExpression": "cron(0 11 ? * 2 *)"

  

}'

  

```

To test, use the endpoint - https://uhn5tboewf.execute-api.ap-south-1.amazonaws.com/default/configureCycle

  

**Response**:

   

```json

{

  

"message": "Cron schedule configured successfully"

  

}

```


---

  

## **Strategy and Design Considerations**

  

### **Scalability**


-  **Serverless Architecture**: Leveraging AWS Lambda and EventBridge ensures automatic scaling to handle high traffic volumes without manual intervention.

  

-  **Caching with Redis**: Reduces the load on DynamoDB by serving frequent requests from an in-memory cache, enabling the system to handle millions of users efficiently.

  

-  **In-Memory Caching in Lambda**: Provides ultra-fast access for frequently requested data during the lifespan of the Lambda execution environment.


  

### **Performance Optimization**

  
-  **Event-Driven Design**: Decouples components and allows independent scaling.

  

-  **Efficient Data Access**: Prioritizes in-memory and Redis caching before querying DynamoDB.

  

-  **Asynchronous Processing**: The `schedule Lambda` operates independently of user requests, ensuring user-facing services remain responsive.

  

### **Flexibility**
  

-  **Dynamic Scheduling**: The `configureSchedule Lambda` allows administrators to adjust the rotation schedule in real-time.

  

-  **Modular Components**: Each Lambda function has a single responsibility, simplifying maintenance and potential future enhancements.

  

---


## **Pros and Cons**

  
### **Pros**

  

  

1.  **High Scalability**: Capable of handling millions of users due to the serverless and event-driven architecture.

  

2.  **Cost-Effective**: Pay-per-use billing model ensures costs align with actual usage.

  

3.  **Low Latency**: Caching strategies minimize response times for end-users. I have cached at the API Gateway level too

  

4.  **Flexibility**: Easily adjust the question rotation schedule without redeploying code.

  

5.  **Managed Services**: Reduced operational overhead by utilizing AWS managed services.

  

  

### **Cons**

  

  

1.  **Cold Starts**: Lambda functions may experience cold starts, introducing slight latency. We can keep provisioned lambdas for this purpose

  

2.  **In-Memory Cache Volatility**: In-memory cache in Lambda is ephemeral and may not persist across invocations.

  

3.  **Complexity**: The use of multiple services (Lambda, DynamoDB, Redis, EventBridge) may increase architectural complexity.

  

---

  

## **Potential Improvements**

  

  

1.  **Implement Monitoring and Alerts**: Utilize AWS CloudWatch for monitoring Lambda performance and setting up alerts.

  

2.  **Use Provisioned Concurrency**: Reduce cold starts by enabling provisioned concurrency for Lambdas.

## **API Response Times**

All API calls with the said architecture have been **deployed and tested on AWS**, and the response times for both the `getQuestion` and `configureSchedule` APIs have consistently been **in the range of ~100  ms**, ensuring optimal performance and low latency for users globally.  
  

  

---

  

## **Conclusion**

  
The architecture leverages AWS managed services to handle high volumes of traffic, minimize latency, and allow dynamic configuration, ensuring an optimal experience for both users and administrators