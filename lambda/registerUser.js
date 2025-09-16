const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { verifyAuthHeader } = require('./verifyJWT');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const USERS_TABLE = process.env.USERS_TABLE_NAME;

exports.handler = async (event) => {
  // CORS headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': event.headers?.origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'false'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const { email, password, firstName, lastName, phone, isAdmin = false } = JSON.parse(event.body || '{}');
    
    // Validate required fields
    if (!password || !firstName || !lastName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Password, first name, and last name are required'
        })
      };
    }

    // Require at least one of email or phone
    if (!email && !phone) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Either email or phone number is required'
        })
      };
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Invalid email format'
          })
        };
      }
    }

    // Validate phone format if provided
    if (phone) {
      const phoneRegex = /^\+?[\d\s\-\(\)\.]{10,}$/;
      if (!phoneRegex.test(phone)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Invalid phone format'
          })
        };
      }
    }

    // Check if user already exists by email or phone
    const existingUsers = [];

    // Check by email if provided
    if (email) {
      const emailQuery = {
        TableName: USERS_TABLE,
        IndexName: 'email-index',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': email.toLowerCase()
        }
      };
      const emailResult = await dynamodb.send(new QueryCommand(emailQuery));
      existingUsers.push(...emailResult.Items);
    }

    // Check by phone if provided
    if (phone) {
      const phoneQuery = {
        TableName: USERS_TABLE,
        IndexName: 'phone-index',
        KeyConditionExpression: 'phone = :phone',
        ExpressionAttributeValues: {
          ':phone': phone.replace(/\D/g, '') // Store phone as digits only
        }
      };
      const phoneResult = await dynamodb.send(new QueryCommand(phoneQuery));
      existingUsers.push(...phoneResult.Items);
    }

    if (existingUsers.length > 0) {
      const conflictField = email && existingUsers.some(u => u.email === email.toLowerCase()) ? 'email' : 'phone';
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ 
          error: `User with this ${conflictField} already exists`
        })
      };
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const userId = uuidv4();
    const now = new Date().toISOString();
    
    const newUser = {
      userId,
      email: email ? email.toLowerCase() : null,
      firstName,
      lastName,
      phone: phone ? phone.replace(/\D/g, '') : null, // Store phone as digits only
      password: hashedPassword,
      isAdmin: Boolean(isAdmin),
      createdAt: now,
      updatedAt: now
    };

    const putParams = {
      TableName: USERS_TABLE,
      Item: newUser,
      ConditionExpression: 'attribute_not_exists(userId)'
    };

    await dynamodb.send(new PutCommand(putParams));
    
    // Return user data without password
    const { password: _, ...userResponse } = newUser;
    
    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'User registered successfully',
        user: userResponse
      })
    };

  } catch (error) {
    console.error('Error registering user:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error'
      })
    };
  }
};
