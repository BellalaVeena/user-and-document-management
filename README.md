# User and Document Management System

A comprehensive NestJS-based API for managing users and documents with advanced features including role-based access control, document processing, and ingestion tracking.

## Features

- **User Management**
  - User registration and authentication
  - Role-based access control (Admin, Editor, Viewer)
  - JWT-based authentication with token blacklisting
  - Secure password handling and validation

- **Document Management**
  - Document upload and storage
  - Document metadata tracking
  - Status tracking (Pending, Processing, Completed, Failed)
  - Role-based document access

- **Ingestion System**
  - Document processing via Python backend integration
  - Ingestion status tracking
  - Result storage and error handling
  - Processing parameters customization

- **API Documentation**
  - Comprehensive Swagger documentation
  - API versioning and bearer authentication

## Tech Stack

- **Backend**: NestJS, TypeScript
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT, Passport.js
- **Documentation**: Swagger/OpenAPI
- **Integration**: Python backend for document processing
- **Testing**: Jest, supertest

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. Clone the repository
   ```
   git clone <repository-url>
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following content:
   ```
   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=your_username
   DB_PASSWORD=your_password
   DB_NAME=user_document_db

   # JWT
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRATION=15m
   JWT_REFRESH_EXPIRATION=7d

   # Python Backend
   PYTHON_BACKEND_URL=http://localhost:5000
   
   # Application
   PORT=3012
   NODE_ENV=development
   ```

4. Create the database
   ```
   createdb user_document_db
   ```

5. Start the application
   ```
   npm run start:dev
   ```

### API Documentation

Once the application is running, you can access the Swagger documentation at:
```
http://localhost:3012/api-docs
```

## Project Structure

```
src/
├── auth/                 # Authentication module
│   ├── controllers/      # Auth controllers
│   ├── dto/              # Data transfer objects
│   ├── entities/         # Token blacklist entity
│   ├── guards/           # JWT and role guards
│   ├── services/         # Auth service and token blacklist service
│   ├── strategies/       # JWT strategy
│   └── types/            # Auth types
│
├── user/                 # User module
│   ├── controllers/      # User controllers
│   ├── dto/              # User DTOs
│   ├── entities/         # User entity
│   └── services/         # User service
│
├── document/             # Document module
│   ├── controllers/      # Document controllers
│   ├── dto/              # Document DTOs
│   ├── entities/         # Document entity
│   └── services/         # Document service
│
├── ingestion/            # Ingestion module
│   ├── controllers/      # Ingestion controllers
│   ├── dto/              # Ingestion DTOs
│   ├── entities/         # Ingestion entity
│   └── services/         # Ingestion service
│
├── bootstrap/            # Application bootstrap code
│   └── database.module.ts # Database configuration
│
├── app.module.ts         # Main application module
└── main.ts               # Application entry point
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Authenticate and receive JWT tokens
- `POST /auth/logout` - Invalidate the current JWT token
- `POST /auth/refresh` - Get a new access token using refresh token

### Users
- `GET /users` - Get all users (Admin only)
- `GET /users/:id` - Get user by ID
- `PATCH /users/:id` - Update user
- `DELETE /users/:id` - Delete user (Admin only)

### Documents
- `POST /documents` - Upload a new document (Admin, Editor)
- `GET /documents` - Get all documents
- `GET /documents/:id` - Get document by ID
- `PATCH /documents/:id` - Update document metadata (Admin, Editor)
- `DELETE /documents/:id` - Delete document (Admin only)

### Ingestions
- `POST /ingestions` - Trigger document processing (Admin, Editor)
- `GET /ingestions` - Get all ingestion processes
- `GET /ingestions/:id` - Get ingestion process by ID
- `PATCH /ingestions/:id` - Update ingestion status/results (Admin)

## Testing

The application includes a comprehensive suite of unit tests for all services:

### Running Tests

```bash
# Run all tests
npm run test

# Run tests with coverage reporting
npm run test:cov

# Run specific test file
npm run test -- user.service

# Run tests in watch mode
npm run test:watch
```

### Test Coverage

The test suite covers:

- **UserService**: Tests for CRUD operations, user authentication, and role management
- **AuthService**: Tests for user validation, login, registration, token refresh, and logout
- **DocumentService**: Tests for document upload, retrieval, and status management
- **IngestionService**: Tests for document processing, ingestion tracking, and error handling

All tests use Jest's mocking capabilities to isolate services and their dependencies, ensuring thorough unit testing without external dependencies.

## License

[MIT License](LICENSE)

## Contact

For any inquiries, please contact [Your Name](mailto:your.email@example.com)
