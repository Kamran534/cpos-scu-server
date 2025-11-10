# User Registration API Examples

## Endpoint
`POST /api/auth/register`

## Request Body Schema

Based on the User model in the database schema, here are example registration requests:

### Example 1: Minimal Required Fields (Auto-assigns default "employee" role)

```json
{
  "username": "john.doe",
  "email": "john.doe@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Example 2: Complete User Registration with Optional Fields

```json
{
  "username": "kamran17",
  "email": "kamran534055@gmail.com",
  "password": "101aa37e",
  "firstName": "Muhammad",
  "lastName": "Kamran",
  "phone": "+92 3411334989",
  "roleId": "746385",
  "pin": "123456",
  "employeeCode": "EMP123",
  "hireDate": "2025-11-09T13:00:21.978Z"
}
```

### Example 3: Register with Role Name (instead of roleId)

```json
{
  "username": "jane.smith",
  "email": "jane.smith@example.com",
  "password": "SecurePass123!",
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+1 555-1234",
  "roleName": "cashier",
  "pin": "7890",
  "employeeCode": "EMP456",
  "hireDate": "2025-01-15T00:00:00.000Z"
}
```

### Example 4: Register without Role (uses default "employee" role)

```json
{
  "username": "bob.wilson",
  "email": "bob.wilson@example.com",
  "password": "SecurePass123!",
  "firstName": "Bob",
  "lastName": "Wilson",
  "phone": "+1 555-5678",
  "employeeCode": "EMP789",
  "hireDate": "2025-02-01T00:00:00.000Z"
}
```

## Field Descriptions

### Required Fields
- **username** (string): Unique username for the user
- **email** (string): Unique email address
- **password** (string): User's password (will be hashed)
- **firstName** (string): User's first name
- **lastName** (string): User's last name

### Optional Fields
- **phone** (string): User's phone number
- **roleId** (string): ID of an existing role (if not provided, will use default "employee" role)
- **roleName** (string): Name of an existing role (used if roleId is not provided)
- **pin** (string): PIN for quick login (will be hashed)
- **employeeCode** (string): Unique employee code
- **hireDate** (string | Date): Hire date in ISO 8601 format (e.g., "2025-11-09T13:00:21.978Z")

## Response Examples

### Success Response (201 Created)

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "7e52a079-50ba-46f3-8867-35ad691ecde8",
      "username": "kamran17",
      "email": "kamran534055@gmail.com",
      "roleId": "746385",
      "roleName": "employee",
      "firstName": "Muhammad",
      "lastName": "Kamran",
      "employeeCode": "EMP123"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Error Response (400 Bad Request)

```json
{
  "success": false,
  "error": "Username, email, or employee code already exists"
}
```

Or if role is invalid:

```json
{
  "success": false,
  "error": "Invalid or inactive role. Available roles: employee (abc-123), manager (def-456)"
}
```

## cURL Examples

### Basic Registration

```bash
curl -X POST 'http://localhost:4000/api/auth/register' \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "john.doe",
    "email": "john.doe@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Complete Registration with Authentication

```bash
curl -X POST 'http://localhost:4000/api/auth/register' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d '{
    "username": "kamran17",
    "email": "kamran534055@gmail.com",
    "password": "101aa37e",
    "firstName": "Muhammad",
    "lastName": "Kamran",
    "phone": "+92 3411334989",
    "roleId": "746385",
    "pin": "123456",
    "employeeCode": "EMP123",
    "hireDate": "2025-11-09T13:00:21.978Z"
  }'
```

## Notes

1. **Role Assignment**: 
   - If `roleId` is provided, it will use that role (must exist and be active)
   - If `roleName` is provided, it will find role by name
   - If neither is provided, it will create/use default "employee" role

2. **Password Security**: 
   - Passwords are automatically hashed using bcrypt
   - Never send passwords in plain text in production

3. **PIN**: 
   - PIN is optional and will be hashed if provided
   - Used for quick login functionality

4. **Employee Code**: 
   - Must be unique if provided
   - Used for employee identification

5. **Hire Date**: 
   - Can be provided as ISO 8601 string or Date object
   - Optional field

6. **Validation**:
   - Username must be unique
   - Email must be unique
   - Employee code must be unique (if provided)
   - Role must exist and be active (if provided)

