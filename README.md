# DivineKart🔥 Backend API

Production-ready e-commerce REST API built with Node.js, Express, and MongoDB. Features JWT authentication, role-based access control, product management, shopping cart, order processing, and secure payment integration.

## Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express 5
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT (roles: `user`, `admin`)
- **File Storage**: Multer + disk storage
- **Payments**: Stripe/Razorpay integration
- **Security**: CORS, rate limiting, input validation

## Project Structure

```
Backend/
├── config/                   # Configuration files
│   ├── db.js                 # MongoDB connection
│   ├── redis.js              # Redis configuration
│   └── sendmail.js           # Email service setup
├── controllers/              # Business logic handlers
│   ├── userController.js     # Authentication & user management
│   ├── productController.js  # Product CRUD operations
│   ├── cartController.js     # Shopping cart operations
│   ├── orderController.js    # Order processing & payments
│   └── addressController.js  # Address management
├── middleware/               # Express middlewares
│   ├── auth.js               # JWT authentication
│   ├── adminAuth.js          # Admin authorization
│   └── multer.js             # File upload handling
├── models/                   # Mongoose schemas
│   ├── userModel.js
│   ├── productModel.js
│   ├── cartModel.js
│   ├── orderModel.js
│   └── addressModel.js
├── routes/                   # API route definitions
│   ├── userRoutes.js
│   ├── productRoutes.js
│   ├── cartRoutes.js
│   ├── orderRoutes.js
│   └── addressRoutes.js
├── utils/                    # Utility functions
│   ├── generatedAccessToken.js
│   ├── generatedRefreshToken.js
│   ├── generatedOtp.js
│   ├── uploadImageClodinary.js
│   ├── redisCache.js
│   ├── forgotPasswordTemplate.js
│   └── verifyEmailTemplate.js
├── tests/                    # Test suites
│   ├── userController.test.js
│   ├── productController.test.js
│   ├── cartController.test.js
│   ├── orderController.test.js
│   ├── authMiddleware.test.js
│   ├── health.test.js
│   ├── setupEnv.js
│   ├── globalSetup.js
│   └── testHelpers.js
├── uploads/                  # User-uploaded files (images)
├── server.js                 # Application entry point
├── app.js                    # Express app configuration
├── package.json              # Dependencies & scripts
├── jest.config.json          # Jest test configuration
└── README.md
```

## Quick Start

### Prerequisites

- Node.js v16+
- MongoDB (local or Atlas)
- Stripe/Razorpay account (for payments)

### Installation & Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment** (create `.env`)
   ```env
   MONGO_URI=mongodb://127.0.0.1:27017/divinekart
   JWT_SECRET=your-secret-key
   PORT=3000
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
   FRONTEND_URL=http://localhost:3000
   STRIPE_KEY=sk_test_xxx
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   ```

3. **Start the server**
   ```bash
   npm start
   ```

### Available Scripts

```bash
npm start      # Development server with nodemon
npm test       # Run Jest tests
npm run lint   # ESLint validation
npm run lint:fix
npm run format # Prettier formatting
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGO_URI` | MongoDB connection string | ✓ |
| `JWT_SECRET` | Secret key for JWT signing | ✓ |
| `PORT` | Server port (default: 3000) | - |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | - |
| `FRONTEND_URL` | Frontend base URL | ✓ |
| `STRIPE_KEY` | Stripe secret key | ✓ |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | ✓ |

## API Overview

### Base URL
```
http://localhost:3000/api
```

### Authentication
Send JWT token in Authorization header:
```
Authorization: Bearer <token>
```

### Response Format
**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error description",
  "errors": ["optional field errors"]
}
```

### Pagination
List endpoints support pagination:
```
?page=1&limit=10
```

## API Endpoints

### Authentication (Users)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/users/register` | - | Register new user |
| POST | `/users/login` | - | User login |
| POST | `/users/refresh-token` | ✓ | Refresh JWT token |
| GET | `/users/profile` | ✓ | Get user profile |
| PUT | `/users/profile` | ✓ | Update user profile |

### Products

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/products` | - | - | List all products (paginated) |
| GET | `/products/:id` | - | - | Get product details |
| POST | `/products` | ✓ | admin | Create product |
| PUT | `/products/:id` | ✓ | admin | Update product |
| DELETE | `/products/:id` | ✓ | admin | Delete product |

### Shopping Cart

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/cart` | ✓ | Get user's cart |
| POST | `/cart` | ✓ | Add/update item in cart |
| PUT | `/cart/:id` | ✓ | Update cart item quantity |
| DELETE | `/cart/:id` | ✓ | Remove item from cart |
| DELETE | `/cart/clear` | ✓ | Clear entire cart |

### Orders

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/orders` | ✓ | List orders (user's or all if admin) |
| GET | `/orders/:id` | ✓ | Get order details |
| POST | `/orders` | ✓ | Create new order |
| PUT | `/orders/:id` | ✓ | Update order (admin only for all fields) |
| DELETE | `/orders/:id` | ✓ | Delete order (admin only) |
| POST | `/orders/verify` | ✓ | Verify payment |

### Addresses

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/address` | ✓ | List user's addresses |
| POST | `/address` | ✓ | Add new address |
| PUT | `/address/:id` | ✓ | Update address |
| DELETE | `/address/:id` | ✓ | Delete address |

### Health Check

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/healthz` | - | Service health status |
| GET | `/readyz` | - | Service readiness status |

## Data Models

| Model | Key Fields | Description |
|-------|-----------|-------------|
| **User** | name, email (unique), password (hashed), role | User accounts with role-based access |
| **Product** | name, description, category, price, OldPrice, imageUrl | Product catalog with pricing |
| **Cart** | user, product, quantity | User shopping cart items |
| **Order** | orderId, user, customer, items, shipping, paymentMethod, paymentStatus, status | Order records with payment info |
| **Address** | user, street, city, state, zip, country, isDefault | User delivery addresses |

## Security Features

- **CORS**: Origin validation via `ALLOWED_ORIGINS` env variable
- **Rate Limiting**: 100 req/15min (global), 5 req/15min (auth endpoints)
- **JWT Authentication**: Secure token-based access control
- **Role-Based Authorization**: Admin and user role separation
- **Input Validation**: Request body validation at controller level
- **Error Handling**: Centralized error handler with safe error messages
- **Password Security**: Bcrypt hashing for password storage

## Testing

Run the test suite:
```bash
npm test
```

Test coverage includes:
- User authentication & authorization
- Product CRUD operations
- Cart management
- Order processing
- Payment verification
- Health check endpoints

## Deployment

### Production Checklist

- [ ] Set all environment variables securely (use secrets management)
- [ ] Configure HTTPS and reverse proxy (Nginx/Apache)
- [ ] Set up MongoDB with authentication and backups
- [ ] Configure Stripe/Razorpay webhook endpoints
- [ ] Enable rate limiting and CORS properly
- [ ] Use PM2 or similar process manager
- [ ] Set up logging and monitoring
- [ ] Use object storage (S3, GCS) for file uploads in production
- [ ] Configure database connection pooling
- [ ] Enable Redis caching for performance

### Basic PM2 Setup

```bash
npm install -g pm2
pm2 start app.js --name "divinekart-backend"
pm2 startup
pm2 save
```

## License

ISC License
