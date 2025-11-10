import { connect, type Channel, type ChannelModel } from 'amqplib';
import dotenv from 'dotenv';

dotenv.config();

const rabbitUrl = process.env.RABBITMQ_URL;
const queueName = process.env.QUEUE_NAME;
const queueType = process.env.QUEUE_TYPE; // e.g., 'quorum' or 'classic'

if (!rabbitUrl) {
  console.error('❌ RABBITMQ_URL is not set in environment variables.');
  process.exit(1);
}

if (!queueName) {
  console.error('❌ QUEUE_NAME is not set in environment variables.');
  process.exit(1);
}

const RABBITMQ_URL = rabbitUrl;
const QUEUE_NAME = queueName;

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

export async function connectRabbitMQ(): Promise<Channel> {
  if (channel) {
    return channel;
  }

  try {
    connection = await connect(RABBITMQ_URL);
    const createdChannel = await connection.createChannel();
    channel = createdChannel;
    await createdChannel.assertQueue(QUEUE_NAME, {
      durable: true,
      // Only set x-queue-type when provided to avoid mismatches
      arguments: queueType ? { 'x-queue-type': queueType } : undefined,
    });
    console.log(
      `✅ RabbitMQ connected & queue ready: ${QUEUE_NAME}` +
        (queueType ? ` (type: ${queueType})` : '')
    );

    connection.on('close', () => {
      console.error('❌ RabbitMQ connection closed');
      process.exit(1);
    });

    connection.on('error', err => {
      console.error('❌ RabbitMQ connection error', err);
      process.exit(1);
    });

    return createdChannel;
  } catch (err) {
    console.error('❌ Failed to connect to RabbitMQ:', err);
    throw err;
  }
}

export { QUEUE_NAME };

