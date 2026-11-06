export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'TeleWyz E-Care Telecom Self-Care API',
    version: '1.0.0',
    description: `
## TeleWyz E-Care Backend Platform API Documentation
Production-grade REST API backend for the TeleWyz E-Care telecom self-care platform based on Optiva E-Care Technical High-Level Design.

### Architecture Highlights:
- **Node.js & Express with Strict TypeScript**
- **Dual Authentication:** Firebase Authentication + MSISDN OTP & Central IAM JWT tokens
- **Database:** Normalized PostgreSQL schema with Prisma ORM
- **Authoritative Balance & Usage:** Direct integration with Optiva EPC / BSS
- **Security:** Helmet, strict CORS, Token Bucket Rate Limiting, Idempotency headers, HMAC-SHA256 Webhook Signatures, RBAC
    `,
    contact: {
      name: 'TeleWyz E-Care Engineering Team',
      email: 'engineering@telewyz.com'
    }
  },
  servers: [
    {
      url: '/api/v1',
      description: 'TeleWyz Core API v1'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide your JWT access token or Firebase ID token'
      },
      IdempotencyKey: {
        type: 'apiKey',
        in: 'header',
        name: 'Idempotency-Key',
        description: 'Unique UUID v4 key preventing duplicate financial/provisioning transactions'
      },
      WebhookSignature: {
        type: 'apiKey',
        in: 'header',
        name: 'x-signature',
        description: 'HMAC-SHA256 hex digest of the raw webhook payload'
      }
    },
    schemas: {
      StandardResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Request completed successfully' },
          data: { type: 'object' },
          requestId: { type: 'string', example: 'e1d2c3b4-a5b6-7c8d-9e0f-1a2b3c4d5e6f' }
        }
      },
      StandardError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'A clear error description' },
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          details: { type: 'array', items: { type: 'object' } },
          requestId: { type: 'string', example: 'e1d2c3b4-a5b6-7c8d-9e0f-1a2b3c4d5e6f' }
        }
      }
    }
  },
  paths: {
    '/health': {
      get: {
        summary: 'Health Check Probe',
        description: 'Returns operational status of the service, PostgreSQL connectivity, and cache cluster.',
        responses: {
          200: { description: 'Service is healthy' }
        }
      }
    },
    '/auth/otp/send': {
      post: {
        summary: 'Request Login / Action OTP',
        description: 'Generates secure 6-digit OTP, applies rate limiting and cooldown timers, and dispatches via SMS gateway.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['msisdn'],
                properties: {
                  msisdn: { type: 'string', example: '2348012345678' },
                  purpose: { type: 'string', enum: ['LOGIN', 'LINK_ACCOUNT', 'SIM_ACTIVATION', 'TRANSACTION'], default: 'LOGIN' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'OTP sent successfully' },
          400: { description: 'Cooldown period active or invalid MSISDN' },
          403: { description: 'Account status barred/suspended' }
        }
      }
    },
    '/auth/otp/verify': {
      post: {
        summary: 'Verify OTP and Establish Session',
        description: 'Validates OTP hash, verifies attempt limits, creates or syncs subscriber, and issues JWT access token and refresh token.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['msisdn', 'code'],
                properties: {
                  msisdn: { type: 'string', example: '2348012345678' },
                  code: { type: 'string', example: '123456' },
                  purpose: { type: 'string', default: 'LOGIN' },
                  deviceId: { type: 'string', example: 'iphone-15-pro' },
                  deviceType: { type: 'string', example: 'MOBILE_APP' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Login successful' },
          400: { description: 'Invalid code or max attempts exceeded' }
        }
      }
    },
    '/auth/firebase-login': {
      post: {
        summary: 'Authenticate via Firebase ID Token',
        description: 'Validates Firebase Authentication JWT token, extracts user claims, syncs subscriber record, and issues TeleWyz session.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['idToken'],
                properties: {
                  idToken: { type: 'string' },
                  deviceId: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Firebase authentication successful' },
          401: { description: 'Invalid Firebase ID token' }
        }
      }
    },
    '/dashboard': {
      get: {
        summary: 'Aggregated Subscriber Dashboard',
        security: [{ BearerAuth: [] }],
        description: 'Aggregates subscriber identity, current active plan, authoritative balances from BSS, usage meters, and personalized CVM offers.',
        responses: {
          200: { description: 'Aggregated dashboard snapshot' },
          401: { description: 'Unauthorized' }
        }
      }
    },
    '/subscriber/profile': {
      get: {
        summary: 'Get Subscriber Profile',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Profile details' } }
      },
      patch: {
        summary: 'Update Subscriber Contact Details',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Profile updated' } }
      }
    },
    '/subscriber/usage': {
      get: {
        summary: 'Fetch Authoritative Telecom Usage',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'msisdn', in: 'query', schema: { type: 'string' }, description: 'Optional associated MSISDN' }
        ],
        responses: {
          200: { description: 'Usage meters (Data, Voice, SMS)' },
          403: { description: 'Access denied to unverified secondary MSISDN' }
        }
      }
    },
    '/catalogue/plans': {
      get: {
        summary: 'List Available Telecom Plans',
        parameters: [
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['PREPAID', 'POSTPAID'] } },
          { name: 'category', in: 'query', schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'List of plans' } }
      }
    },
    '/catalogue/subscribe': {
      post: {
        summary: 'Subscribe to a Plan or Add-On Bundle',
        security: [{ BearerAuth: [] }],
        responses: {
          201: { description: 'Subscription confirmed' },
          400: { description: 'Insufficient balance or plan mismatch' }
        }
      }
    },
    '/numbers/search': {
      get: {
        summary: 'Search Available MSISDNs',
        parameters: [
          { name: 'pattern', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string', enum: ['NORMAL', 'SILVER', 'GOLD', 'PLATINUM'] } }
        ],
        responses: { 200: { description: 'Matching available numbers' } }
      }
    },
    '/numbers/reserve': {
      post: {
        summary: 'Reserve a Number with 15-min Hold Timer',
        responses: {
          201: { description: 'Number reserved' },
          400: { description: 'Number already reserved or unavailable' }
        }
      }
    },
    '/sim/order': {
      post: {
        summary: 'Purchase Physical SIM or eSIM',
        responses: {
          201: { description: 'SIM order created' }
        }
      }
    },
    '/sim/kyc/verify': {
      post: {
        summary: 'Submit NIMC / NCC Biometric KYC',
        responses: {
          200: { description: 'KYC verified' },
          400: { description: 'KYC verification failed' }
        }
      }
    },
    '/sim/activate': {
      post: {
        summary: 'Activate SIM on Telecom Network',
        description: 'Authoritative HLR provisioning via BSS adapter. Requires verified KYC.',
        responses: {
          200: { description: 'SIM active' },
          400: { description: 'KYC required or provisioning failed' }
        }
      }
    },
    '/mnp/validate': {
      post: {
        summary: 'Check Mobile Number Portability Eligibility',
        responses: { 200: { description: 'Eligibility results' } }
      }
    },
    '/mnp/request': {
      post: {
        summary: 'Submit MNP Port-In Request',
        responses: { 201: { description: 'Porting request submitted' } }
      }
    },
    '/payments/recharge': {
      post: {
        summary: 'Initiate Airtime / Data Recharge',
        security: [{ IdempotencyKey: [] }],
        responses: { 201: { description: 'Payment initiated' } }
      }
    },
    '/payments/bills/pay': {
      post: {
        summary: 'Settle Postpaid Bill',
        security: [{ IdempotencyKey: [] }],
        responses: { 201: { description: 'Bill payment initiated' } }
      }
    },
    '/payments/verify/{transactionId}': {
      get: {
        summary: 'Authoritative Payment Verification',
        description: 'Directly validates payment success with payment gateway and credits BSS wallet.',
        responses: { 200: { description: 'Payment verified' } }
      }
    },
    '/payments/webhook': {
      post: {
        summary: 'Payment Gateway Webhook Callback',
        security: [{ WebhookSignature: [] }],
        responses: { 200: { description: 'Webhook processed' } }
      }
    },
    '/orders': {
      get: {
        summary: 'List Subscriber Orders',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Orders retrieved' } }
      },
      post: {
        summary: 'Create Unified Telecom Order',
        responses: { 201: { description: 'Order created' } }
      }
    },
    '/orders/history/six-month': {
      get: {
        summary: '6-Month Historical Telecom Activity Ledger',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Chronological activity history' } }
      }
    },
    '/services/loyalty': {
      get: {
        summary: 'Loyalty Points and Tier Information',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Loyalty balance & reward catalog' } }
      }
    },
    '/services/loyalty/redeem': {
      post: {
        summary: 'Redeem Loyalty Points for Airtime or Data',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Points redeemed' } }
      }
    },
    '/services/stores': {
      get: {
        summary: 'Store Locator & Authorized Dealer Centers',
        responses: { 200: { description: 'Store list' } }
      }
    },
    '/services/coverage': {
      get: {
        summary: 'Network Coverage Checker (4G / 5G / Broadband)',
        responses: { 200: { description: 'Regional coverage details' } }
      }
    },
    '/services/support/tickets': {
      post: {
        summary: 'Submit Support or Complaint Ticket',
        responses: { 201: { description: 'Ticket created' } }
      }
    },
    '/services/admin/metrics': {
      get: {
        summary: 'Admin Operational Telemetry',
        security: [{ BearerAuth: [] }],
        description: 'Restricted to ADMIN role. Returns real-time platform KPIs.',
        responses: {
          200: { description: 'Telemetry data' },
          403: { description: 'Forbidden' }
        }
      }
    }
  }
};

