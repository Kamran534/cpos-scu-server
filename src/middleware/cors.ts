import cors from 'cors';
import { config } from '../config/index.js';

/**
 * Get allowed origins from environment variable
 * Supports comma-separated list of origins
 */
function getAllowedOrigins(): string[] {
  const corsOrigins = config.corsOrigins || '*';
  
  if (corsOrigins === '*') {
    return ['*'];
  }
  
  // Split by comma and trim whitespace
  return corsOrigins
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0);
}

/**
 * CORS configuration middleware
 * Manages allowed origins based on environment configuration
 */
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // If '*' is in allowed origins, allow all
    if (allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    
    // Allow same-origin requests (for Swagger UI and other same-origin requests)
    // Extract port from origin and check if it matches the server port
    const serverPort = config.port;
    const originUrl = new URL(origin);
    if (originUrl.hostname === 'localhost' && Number(originUrl.port) === serverPort) {
      return callback(null, true);
    }
    
    // In development, allow all localhost origins (for Vite, React, etc.)
    const isDevelopment = config.nodeEnv !== 'production';
    if (isDevelopment && originUrl.hostname === 'localhost') {
      return callback(null, true);
    }
    
    // Check if the origin is in the allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} is not allowed by CORS policy`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400, // 24 hours
};

/**
 * Build and return CORS middleware with custom origin validation
 */
export function buildCors() {
  return cors(corsOptions);
}

/**
 * Get current allowed origins (for debugging/logging)
 */
export function getAllowedOriginsList(): string[] {
  return getAllowedOrigins();
}

