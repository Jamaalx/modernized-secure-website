# Secure Documents Backend - 2025 Modernized

A production-ready, secure document sharing platform backend built with Node.js, Express v5, and PostgreSQL. This modernized version incorporates the latest security practices, performance optimizations, and development tools for 2025.

## 🚀 Key Modernizations

### Architecture & Dependencies
- **Express v5.1.0** - Latest stable version with enhanced security
- **ES Modules** - Modern JavaScript module system
- **Node.js 20.19+** - Latest LTS with performance improvements
- **TypeScript Support** - Gradual migration path with type checking
- **Vitest** - Fast, modern testing framework (10-20x faster than Jest)

### Security Enhancements
- **Enhanced Rate Limiting** - Progressive delays and IP-based protection
- **Advanced Input Validation** - Joi schemas with comprehensive sanitization
- **Security Headers** - Helmet with CSP, HSTS, and modern security policies
- **Audit Logging** - Comprehensive activity tracking with Winston
- **JWT Security** - Enhanced token validation with proper error handling
- **SQL Injection Prevention** - Parameterized queries and input sanitization

### Performance & Monitoring
- **Connection Pooling** - Optimized PostgreSQL connection management
- **Query Monitoring** - Slow query detection and performance logging
- **Graceful Shutdown** - Proper resource cleanup on termination
- **Health Checks** - Kubernetes-ready health, readiness, and liveness probes
- **Compression** - Response compression for better performance

### Development Experience
- **Hot Reloading** - Nodemon for development
- **Linting** - ESLint with modern JavaScript rules
- **Testing** - Vitest with coverage reporting and UI
- **Environment Validation** - Joi-based environment variable validation
- **Structured Logging** - Winston with multiple transports and log levels

## 📋 Prerequisites

- Node.js 20.19.0 or higher
- PostgreSQL 13+ 
- npm or yarn package manager

## 🛠 Installation

1. **Clone and navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database:**
   ```bash
   # Create database
   createdb secure_docs
   
   # Run migrations
   npm run migrate
   ```

## 🚦 Running the Application

### Development Mode
```bash
npm run dev
```
Starts the server with hot reloading on port 3001.

### Production Mode
```bash
npm start
```

### Testing
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

### Linting
```bash
# Check for linting errors
npm run lint

# Fix linting errors automatically
npm run lint:fix
```

### Type Checking
```bash
npm run type-check
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Application environment | `development` | No |
| `PORT` | Server port | `3001` | No |
| `DATABASE_URL` | PostgreSQL connection string | - | Yes |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | - | Yes |
| `JWT_EXPIRES_IN` | JWT token expiration | `24h` | No |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` | No |
| `BCRYPT_ROUNDS` | Password hashing rounds | `12` | No |
| `UPLOAD_MAX_SIZE` | Max file upload size (bytes) | `10485760` | No |
| `LOG_LEVEL` | Logging level | `info` | No |

See `.env.example` for a complete list of configuration options.

### Database Configuration

The application supports both `DATABASE_URL` and individual database parameters:

```env
# Option 1: Connection string (recommended)
DATABASE_URL=postgresql://username:password@localhost:5432/secure_docs

# Option 2: Individual parameters
DB_HOST=localhost
DB_PORT=5432
DB_NAME=secure_docs
DB_USER=postgres
DB_PASSWORD=password
```

## 🏗 Project Structure

```
src/
├── config/
│   └── database.js          # Database configuration and connection
├── middleware/
│   ├── auth.js              # Authentication and authorization
│   ├── audit.js             # Audit logging middleware
│   └── security.js          # Security monitoring middleware
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── documents.js         # Document management routes
│   ├── admin.js             # Admin panel routes
│   └── user.js              # User management routes
├── utils/
│   ├── logger.js            # Winston logging configuration
│   └── validation.js        # Input validation and sanitization
├── test/
│   └── setup.js             # Test configuration and utilities
└── server.js                # Main application entry point
```

## 🔐 Security Features

### Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Account lockout after failed attempts
- Session management with secure cookies

### Input Validation & Sanitization
- Joi schema validation for all inputs
- SQL injection prevention
- XSS protection with output encoding
- File upload validation and virus scanning

### Security Headers
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options, X-Content-Type-Options
- Cross-Origin Resource Sharing (CORS) configuration

### Rate Limiting & DDoS Protection
- IP-based rate limiting
- Progressive delays for repeated requests
- Separate limits for authentication endpoints
- Request size limits

### Audit & Monitoring
- Comprehensive activity logging
- Security event monitoring
- Failed authentication tracking
- Suspicious activity detection

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset confirmation

### Documents
- `GET /api/documents` - List user documents
- `POST /api/documents` - Upload new document
- `GET /api/documents/:id` - Get document details
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document
- `GET /api/documents/:id/download` - Download document

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/activity` - Get user activity log

### Admin
- `GET /api/admin/users` - List all users
- `GET /api/admin/documents` - List all documents
- `GET /api/admin/audit-logs` - View audit logs
- `POST /api/admin/users/:id/lock` - Lock user account

### Health Checks
- `GET /health` - Application health status
- `GET /ready` - Readiness probe (Kubernetes)
- `GET /live` - Liveness probe (Kubernetes)

## 🧪 Testing

The application uses Vitest for testing with the following features:

- **Unit Tests** - Individual function and module testing
- **Integration Tests** - API endpoint testing with Supertest
- **Coverage Reports** - Code coverage with V8 provider
- **Test UI** - Interactive test runner interface
- **Mocking** - Built-in mocking capabilities

### Test Structure
```
src/test/
├── setup.js                 # Test configuration
├── unit/
│   ├── auth.test.js         # Authentication tests
│   ├── validation.test.js   # Validation tests
│   └── database.test.js     # Database tests
├── integration/
│   ├── auth.routes.test.js  # Auth API tests
│   └── documents.routes.test.js # Document API tests
└── fixtures/
    └── test-data.js         # Test data fixtures
```

### Running Specific Tests
```bash
# Run specific test file
npm test auth.test.js

# Run tests in watch mode
npm test -- --watch

# Run tests with specific pattern
npm test -- --grep "authentication"
```

## 📈 Performance Optimization

### Database Optimization
- Connection pooling with configurable limits
- Query performance monitoring
- Slow query detection and logging
- Prepared statements for security and performance

### Caching Strategy
- Response compression with gzip
- Static file caching headers
- Database query result caching (Redis optional)

### Memory Management
- Graceful shutdown handling
- Resource cleanup on exit
- Memory usage monitoring

## 🚀 Deployment

### Docker Deployment
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### Environment-Specific Configuration

#### Development
- Detailed error messages
- SQL query logging
- Hot reloading enabled
- Debug logging level

#### Production
- Error message sanitization
- Structured logging to files
- Performance monitoring
- Security headers enforced

### Health Checks
The application provides multiple health check endpoints for monitoring:

- `/health` - Overall application health
- `/ready` - Database connectivity check
- `/live` - Application responsiveness check

## 🔍 Monitoring & Logging

### Log Levels
- `error` - Error conditions
- `warn` - Warning conditions
- `info` - Informational messages
- `debug` - Debug-level messages

### Log Types
- **HTTP Requests** - All incoming requests
- **Database Queries** - Query execution and performance
- **Security Events** - Authentication, authorization, suspicious activity
- **Application Events** - Startup, shutdown, errors
- **Audit Trail** - User actions and data changes

### Log Destinations
- **Console** - Development and debugging
- **Files** - Production logging with rotation
- **External Services** - Integration with log aggregation services

## 🛡 Security Best Practices

### Development
- Regular dependency updates
- Security vulnerability scanning
- Code review requirements
- Secure coding guidelines

### Production
- Environment variable validation
- Secrets management
- Regular security audits
- Incident response procedures

### Compliance
- GDPR data protection
- SOC 2 compliance ready
- Audit trail maintenance
- Data retention policies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Style
- Use ESLint configuration
- Follow naming conventions
- Add JSDoc comments for functions
- Maintain test coverage above 80%

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the troubleshooting guide

## 🔄 Migration Guide

### From v1.0 to v2.0

1. **Update Node.js** to version 20.19+
2. **Update dependencies** using `npm install`
3. **Migrate to ES modules** - Update import/export statements
4. **Update environment variables** - See `.env.example` for new variables
5. **Run database migrations** - `npm run migrate`
6. **Update deployment scripts** - Account for new health check endpoints

### Breaking Changes
- CommonJS modules replaced with ES modules
- Express v4 to v5 migration
- New environment variable requirements
- Updated API response formats
- Enhanced error handling

## 📚 Additional Resources

- [Express.js v5 Documentation](https://expressjs.com/)
- [Vitest Documentation](https://vitest.dev/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

