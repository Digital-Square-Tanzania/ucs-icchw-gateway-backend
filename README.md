# UCS User Management Backend

The **UCS User Management Backend** is a Node.js and Express-based API designed to handle user authentication, authorization, and management across all UCS-related services. It provides robust features like role-based access control (RBAC), JWT-based authentication, custom rate limiting, error handling, and integration capabilities with external systems like **OpenMRS** and **DHIS2**.

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the App](#running-the-app)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Scripts](#scripts)
- [Key Features](#key-features)
- [Testing](#testing)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

---

## 🚀 Features

- JWT-based Authentication with Refresh Tokens
- Role-Based Access Control (RBAC)
- User CRUD Operations
- Password Hashing with Bcrypt
- Custom Rate Limiting with Role-Based Quotas
- Global Error Handling with Logging (Winston)
- Input Validation and Sanitization
- API Documentation with Swagger (OpenAPI)
- CI/CD Integration with GitHub Actions
- Integration-Ready for OpenMRS and DHIS2
- **Dual Email Service Support** (Gmail & eGA Corporate Email)
- **Automated Email Notifications** with Cron Jobs

---

## 🛠️ Tech Stack

- **Backend Framework:** Node.js, Express.js
- **Database:** PostgreSQL (via Prisma ORM)
- **Authentication:** JWT, Bcrypt
- **Logging:** Winston
- **Validation:** Joi/Yup
- **Testing:** Jest, Supertest
- **Documentation:** Swagger (OpenAPI)
- **CI/CD:** GitHub Actions

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v16.x or higher)
- **PostgreSQL** (v13 or higher)
- **npm** or **yarn**

### Installation

1. **Clone the Repository:**

```bash
git clone https://github.com/your-username/ucs-user-management-backend.git
cd ucs-user-management-backend
```

2. **Install Dependencies:**

```bash
npm install
# or
yarn install
```

3. **Setup the database**

```bash
npx prisma migrate dev --name init
```

### Environment Variables

Create a .env file in the root directory:

```bash
# Server
NODE_ENV=development
NODE_PORT=3010

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ucs_user_management

# JWT
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_token_secret

# Bcrypt
BCRYPT_SALT_ROUNDS=10

# Rate Limiting
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_REQUESTS=100

# Email Configuration
EMAIL_PROVIDER=gmail  # or "ega" for corporate email
EMAIL_FROM=no-reply@ucssystem.org

# Gmail Configuration (when EMAIL_PROVIDER=gmail)
EMAIL_USERNAME=your_gmail_username
EMAIL_PASSWORD=your_app_specific_password

# eGA Corporate Email Configuration (when EMAIL_PROVIDER=ega)
# Ministry of Health UCS systems email service by eGA Tanzania
EGA_SMTP_HOST=smtp.afya.go.tz
EGA_SMTP_PORT=587
EGA_SMTP_SECURE=false
EGA_EMAIL_ADDRESS=your_email@afya.go.tz
EGA_EMAIL_PASSWORD=your_email_password
```

## Running the App

### Development Mode:

```bash
npm run dev
# or
yarn dev
```

### Production Mode:

```bash
npm start
# or
yarn start
```

The app will run at http://localhost:3010.

## API Documentation

The API is documented using Swagger (OpenAPI).

After running the app, access the documentation at:
`http://localhost:3010/api-docs`

It includes:

- Authentication endpoints (Login, Logout, Refresh Token)
- User CRUD operations
- Error formats
- Rate limits

## Project Structure

ucs-user-management-backend/
├── config/ # Configuration files
├── helpers/ # Utility/helper functions
├── middlewares/ # Express middlewares (auth, validation, rate-limiting)
├── modules/ # Core app modules (auth, user, etc.)
│ ├── auth/ # Authentication module
│ └── user/ # User management module
├── prisma/ # Prisma ORM setup and migrations
├── logs/ # Winston log files (error.log, app.log)
├── tests/ # Unit and integration tests
├── .env # Environment variables
├── .gitignore # Git ignore rules
├── package.json # Project metadata and dependencies
├── README.md # Project documentation
└── index.js # Entry point

## Scripts

- `npm run dev` — Run app in development mode with nodemon.
- `npm start` — Run app in production mode.
- `npm run lint` — Run ESLint to check for code issues.
- `npm test` — Run unit and integration tests with Jest.
- `npm run migrate` — Run Prisma migrations.
- `npm run prisma:studio` — Open Prisma Studio for DB management.

## Key Features

**Authentication & Authorization**

- JWT Authentication with access and refresh tokens.
- Password hashing using Bcrypt.
- Role-Based Access Control (RBAC):
  - Roles: SYSTEM_DEVELOPER, MOH_ADMIN, COUNCIL_ADMIN, PROVIDER, CHW.
    **User Management**
- Full CRUD operations.
- Pagination and filtering.
- Soft deletion and user status management (ACTIVE, INACTIVE, SUSPENDED).
  **Security**
  - Input validation and sanitization.
  - Helmet for setting secure HTTP headers.
  - Rate limiting based on roles.
  - Password policies and login rate limiting.
    **Error Handling & Logging**
  - Centralized error handling.
  - Custom error classes.
  - Logging with Winston (separate logs for info and errors).

## 📧 Email Service

The system supports dual email providers with automatic switching:

### **Gmail Integration**

- Standard Gmail SMTP for development and testing
- Uses app-specific passwords for security
- Configured via `EMAIL_PROVIDER=gmail`

### **eGA Corporate Email Integration**

- Ministry of Health UCS systems email service via SMTP
- Production-ready corporate email solution
- Configured via `EMAIL_PROVIDER=ega`
- Uses SMTP server: smtp.afya.go.tz with SSL port 587

### **Email Service Features**

- **Automatic Provider Switching**: Change providers via environment variable
- **Runtime Provider Switching**: Switch between Gmail and eGA programmatically
- **Fallback Support**: Easy fallback to Gmail if eGA is unavailable
- **Cron Job Integration**: Automated email sending for user activations
- **Error Handling**: Comprehensive error handling for both providers

### **Usage Example**

```javascript
// Send email (uses configured provider)
await EmailService.sendEmail({
  to: "user@example.com",
  subject: "Account Activation",
  html: "<h1>Welcome to UCS!</h1>",
});

// Switch providers at runtime
EmailService.switchProvider("ega"); // Switch to eGA
EmailService.switchProvider("gmail"); // Switch to Gmail
```

## 🧪 Testing

**Run All Tests:**

```bash
Copy
Edit
npm test
# or
yarn test
```

**Testing Frameworks Used:**

- Jest — Unit and integration tests.
- Supertest — API endpoint testing.
  **Coverage Goal:** 80%+

## 🔐 Security

- Follows OWASP best practices.
- Input validation prevents XSS and SQL Injection.
- Rate limiting defends against brute-force attacks.
- Secure HTTP headers applied using Helmet.

## 📦 Contributing

1. Fork the repository.
2. Create your feature branch: git checkout -b feature/YourFeature
3. Commit your changes: git commit -m 'Add YourFeature'
4. Push to the branch: git push origin feature/YourFeature
5. Open a pull request.

**Before submitting a PR:**

- Ensure all tests pass (npm test).
- Run linting (npm run lint).

## 📄 License

This project is licensed under the **MIT License**.

##

📬 Contact
For questions or contributions, reach out to the project maintainers.
