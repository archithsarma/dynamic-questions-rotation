import { SchedulerClient, UpdateScheduleCommand } from '@aws-sdk/client-scheduler';

const schedulerClient = new SchedulerClient({ region: process.env.AWS_REGION });

export const handler = async (event) => {
    try {
        const cronExpression = event.cronExpression || 'cron(0 11 ? * 2 *)'; // Default to daily at 7:00 PM Monday SGT, this defualt is in UTC equivalent of SGT
        const scheduleName =  process.env.SCHEDULE_NAME ;
        const targetArn =  process.env.TARGET_ARN;

        const scheduleParams = {
            Name: scheduleName, 
            ScheduleExpression: cronExpression,
            Target: {
                Arn: targetArn, 
                RoleArn: process.env.TARGET_ROLE_ARN, 
            },
            State: 'ENABLED', 
             FlexibleTimeWindow: {
                Mode: 'OFF' 
            },
        };

        const updateScheduleCommand = new UpdateScheduleCommand(scheduleParams);
        const scheduleResponse = await schedulerClient.send(updateScheduleCommand);
        console.log('Schedule updated:', scheduleResponse);

        return {
            statusCode: 200,
            body: { message: 'Schedule updated successfully' },
        };
    } catch (error) {
        console.error('Error configuring EventBridge schedule:', error);
        return {
            statusCode: 500,
            body: { error: 'Failed to configure the schedule' },
        };
    }
};
