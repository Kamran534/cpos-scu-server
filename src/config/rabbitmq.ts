import { connect, type Channel, type ChannelModel } from 'amqplib';
import { config } from './index.js';

const RABBITMQ_URL = config.rabbitmq.url;
const QUEUE_NAME = config.rabbitmq.queueName;
const queueType = config.rabbitmq.queueType; // e.g., 'quorum' or 'classic'

if (!RABBITMQ_URL) {
  console.error('❌ RABBITMQ_URL is not set in environment variables.');
  process.exit(1);
}

if (!QUEUE_NAME) {
  console.error('❌ QUEUE_NAME is not set in environment variables.');
  process.exit(1);
}

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
    // console.log(
    //   `✅ RabbitMQ connected & queue ready: ${QUEUE_NAME}` +
    //     (queueType ? ` (type: ${queueType})` : '')
    // );

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

