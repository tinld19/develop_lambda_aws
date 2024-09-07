import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { QueryCommand, PutCommand, DeleteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { createLogger } from '../utils/logger.mjs'
import AWSXRay from 'aws-xray-sdk-core'

const logger = createLogger('todoAccess')
const docClient = AWSXRay.captureAWSv3Client(new DynamoDBClient({ region: "us-east-1" }));
const todosTable = process.env.TODOS_TABLE;

export const getTodos = async (userId) => {
    logger.info('Getting all todo items')

    const command = new QueryCommand({
        TableName: todosTable,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
            ':userId': userId
        }
    })
    const result = await docClient.send(command)
    return result.Items
}

export const createTodo = async (newTodo) => {
    logger.info(`Creating new todo item: ${newTodo.todoId}`)
    const command = new PutCommand({
        TableName: todosTable,
        Item: newTodo
    })
    await docClient.send(command)
    return newTodo
}

export const updateTodo = async (userId, todoId, updateData) => {
    logger.info(`Updating a todo item: ${todoId}`)
    const command = new UpdateCommand({
        TableName: todosTable,
        Key: { userId, todoId },
        ConditionExpression: 'attribute_exists(todoId)',
        UpdateExpression: 'set #n = :n, dueDate = :due, done = :dn',
        ExpressionAttributeNames: { '#n': 'name' },
        ExpressionAttributeValues: {
            ':n': updateData.name,
            ':due': updateData.dueDate,
            ':dn': updateData.done,
        }
    })
    await docClient.send(command);
}

export const deleteTodo = async (userId, todoId) => {
    const command = new DeleteCommand ({
        TableName: todosTable,
        Key: { userId, todoId }
    });
    await docClient.send(command);
}

export const saveImgUrl = async (userId, todoId, bucketName) => {
    try {
        const command = new UpdateCommand({
            TableName: todosTable,
            Key: { userId, todoId },
            ConditionExpression: 'attribute_exists(todoId)',
            UpdateExpression: 'set attachmentUrl = :attachmentUrl',
            ExpressionAttributeValues: {
                ':attachmentUrl': `https://${bucketName}.s3.amazonaws.com/${todoId}`,
            }
        })
        logger.info(
            `Updating image url for a todo item: https://${bucketName}.s3.amazonaws.com/${todoId}`
        )
        await docClient.send(command);
    } catch (error) {
        logger.error(error)
    }
}
