const swaggerUi = require('swagger-ui-express');

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'Finance Hub API',
    version: '1.0.0',
    description:
      'REST API for Finance Hub — financial tracking, expense management, and AES-256-GCM encrypted password storage.',
  },
  servers: [
    { url: '/api', description: 'Current server' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from /auth/login or /auth/register',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Email is required.' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          email: { type: 'string', format: 'email', example: 'user@example.com' },
        },
      },
      FinancialEntry: {
        type: 'object',
        properties: {
          _id:         { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0d' },
          description: { type: 'string', example: 'Monthly salary' },
          amount:      { type: 'number', example: 3500 },
          type:        { type: 'string', enum: ['Income', 'Expense', 'Savings', 'Investment'], example: 'Income' },
          date:        { type: 'string', format: 'date', example: '2026-06-01' },
          createdAt:   { type: 'string', format: 'date-time' },
        },
      },
      Expense: {
        type: 'object',
        properties: {
          _id:       { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0e' },
          title:     { type: 'string', example: 'Grocery shopping' },
          amount:    { type: 'number', example: 84.50 },
          category:  { type: 'string', example: 'Food' },
          date:      { type: 'string', format: 'date', example: '2026-06-15' },
          note:      { type: 'string', example: 'Weekly groceries' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      PasswordEntry: {
        type: 'object',
        properties: {
          _id:       { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0f' },
          site:      { type: 'string', example: 'Gmail' },
          username:  { type: 'string', example: 'user@gmail.com' },
          password:  { type: 'string', example: 'decrypted-password' },
          note:      { type: 'string', example: '2FA enabled' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Missing or invalid JWT token',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        responses: {
          200: {
            description: 'Server is running',
            content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean', example: true } } } } },
          },
        },
      },
    },

    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Create a new account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email:    { type: 'string', format: 'email', example: 'user@example.com' },
                  password: { type: 'string', minLength: 8, example: 'securePass1!' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Account created', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'Email already registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Sign in to an existing account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email:    { type: 'string', format: 'email', example: 'user@example.com' },
                  password: { type: 'string', example: 'securePass1!' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Login successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current authenticated user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Current user info',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    userId: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0d' },
                    email:  { type: 'string', format: 'email', example: 'user@example.com' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/financial': {
      get: {
        tags: ['Financial'],
        summary: 'List all financial entries',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Array of entries, newest first',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/FinancialEntry' } } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Financial'],
        summary: 'Add a financial entry',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['description', 'amount', 'type', 'date'],
                properties: {
                  description: { type: 'string', example: 'Monthly salary' },
                  amount:      { type: 'number', example: 3500 },
                  type:        { type: 'string', enum: ['Income', 'Expense', 'Savings', 'Investment'], example: 'Income' },
                  date:        { type: 'string', format: 'date', example: '2026-06-01' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Entry created', content: { 'application/json': { schema: { $ref: '#/components/schemas/FinancialEntry' } } } },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/financial/{id}': {
      delete: {
        tags: ['Financial'],
        summary: 'Delete a financial entry',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: '665f1a2b3c4d5e6f7a8b9c0d' }],
        responses: {
          200: { description: 'Deleted', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean', example: true } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/expenses': {
      get: {
        tags: ['Expenses'],
        summary: 'List all expenses',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Array of expenses, newest first',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Expense' } } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Expenses'],
        summary: 'Add an expense',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'amount', 'category', 'date'],
                properties: {
                  title:    { type: 'string', example: 'Grocery shopping' },
                  amount:   { type: 'number', example: 84.50 },
                  category: { type: 'string', example: 'Food' },
                  date:     { type: 'string', format: 'date', example: '2026-06-15' },
                  note:     { type: 'string', example: 'Weekly groceries' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Expense created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Expense' } } } },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/expenses/{id}': {
      delete: {
        tags: ['Expenses'],
        summary: 'Delete an expense',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: '665f1a2b3c4d5e6f7a8b9c0e' }],
        responses: {
          200: { description: 'Deleted', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean', example: true } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/passwords': {
      get: {
        tags: ['Passwords'],
        summary: 'List all saved passwords (decrypted)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Array of password entries, newest first. Usernames and passwords are decrypted server-side from AES-256-GCM storage.',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/PasswordEntry' } } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Passwords'],
        summary: 'Save a new password entry',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['site', 'username', 'password'],
                properties: {
                  site:     { type: 'string', example: 'Gmail' },
                  username: { type: 'string', example: 'user@gmail.com' },
                  password: { type: 'string', example: 'myP@ssw0rd!' },
                  note:     { type: 'string', example: '2FA enabled' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Password entry saved (encrypted at rest)', content: { 'application/json': { schema: { $ref: '#/components/schemas/PasswordEntry' } } } },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/passwords/{id}': {
      delete: {
        tags: ['Passwords'],
        summary: 'Delete a password entry',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: '665f1a2b3c4d5e6f7a8b9c0f' }],
        responses: {
          200: { description: 'Deleted', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean', example: true } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
  },
};

module.exports = { serve: swaggerUi.serve, setup: swaggerUi.setup(spec) };
