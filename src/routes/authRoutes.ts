import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               roleId:
 *                 type: string
 *                 description: Optional - ID of the Role to assign to the user. If not provided, will use roleName or create default "employee" role.
 *               roleName:
 *                 type: string
 *                 description: Optional - Name of the Role to assign. Used if roleId is not provided.
 *               pin:
 *                 type: string
 *                 description: Optional PIN for quick login
 *               employeeCode:
 *                 type: string
 *                 description: Optional unique employee code
 *               hireDate:
 *                 type: string
 *                 format: date-time
 *                 description: Optional hire date
 *           examples:
 *             minimal:
 *               summary: Minimal registration (auto-assigns default role)
 *               value:
 *                 username: "john.doe"
 *                 email: "john.doe@example.com"
 *                 password: "SecurePass123!"
 *                 firstName: "John"
 *                 lastName: "Doe"
 *             complete:
 *               summary: Complete registration with all fields
 *               value:
 *                 username: "kamran17"
 *                 email: "kamran534055@gmail.com"
 *                 password: "101aa37e"
 *                 firstName: "Muhammad"
 *                 lastName: "Kamran"
 *                 phone: "+92 3411334989"
 *                 roleId: "746385"
 *                 pin: "123456"
 *                 employeeCode: "EMP123"
 *                 hireDate: "2025-11-09T13:00:21.978Z"
 *             withRoleName:
 *               summary: Registration with role name
 *               value:
 *                 username: "jane.smith"
 *                 email: "jane.smith@example.com"
 *                 password: "SecurePass123!"
 *                 firstName: "Jane"
 *                 lastName: "Smith"
 *                 phone: "+1 555-1234"
 *                 roleName: "cashier"
 *                 pin: "7890"
 *                 employeeCode: "EMP456"
 *                 hireDate: "2025-01-15T00:00:00.000Z"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "7e52a079-50ba-46f3-8867-35ad691ecde8"
 *                         username:
 *                           type: string
 *                           example: "kamran17"
 *                         email:
 *                           type: string
 *                           example: "kamran534055@gmail.com"
 *                         roleId:
 *                           type: string
 *                           example: "746385"
 *                         roleName:
 *                           type: string
 *                           example: "employee"
 *                         firstName:
 *                           type: string
 *                           example: "Muhammad"
 *                         lastName:
 *                           type: string
 *                           example: "Kamran"
 *                         employeeCode:
 *                           type: string
 *                           example: "EMP123"
 *                     token:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *             example:
 *               success: true
 *               data:
 *                 user:
 *                   id: "7e52a079-50ba-46f3-8867-35ad691ecde8"
 *                   username: "kamran17"
 *                   email: "kamran534055@gmail.com"
 *                   roleId: "746385"
 *                   roleName: "employee"
 *                   firstName: "Muhammad"
 *                   lastName: "Kamran"
 *                   employeeCode: "EMP123"
 *                 token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Invalid input or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Username, email, or employee code already exists"
 *             examples:
 *               duplicateUser:
 *                 summary: User already exists
 *                 value:
 *                   success: false
 *                   error: "Username, email, or employee code already exists"
 *               invalidRole:
 *                 summary: Invalid role
 *                 value:
 *                   success: false
 *                   error: "Invalid or inactive role. Available roles: employee (abc-123), manager (def-456)"
 */
router.post('/register', authController.register.bind(authController));

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: "Email address (preferred). Can also use 'username' field for backward compatibility."
 *                 example: "user@example.com"
 *               username:
 *                 type: string
 *                 description: "Username or email address (for backward compatibility). If 'email' is provided, 'username' is ignored."
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "SecurePass123!"
 *           examples:
 *             withEmail:
 *               summary: Login with email (preferred)
 *               value:
 *                 email: "user@example.com"
 *                 password: "SecurePass123!"
 *             withUsername:
 *               summary: Login with username (backward compatible)
 *               value:
 *                 username: "user@example.com"
 *                 password: "SecurePass123!"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         username:
 *                           type: string
 *                         email:
 *                           type: string
 *                         roleId:
 *                           type: string
 *                         roleName:
 *                           type: string
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *                     token:
 *                       type: string
 *       400:
 *         description: Missing email/username or password
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Invalid email or password"
 */
router.post('/login', authController.login.bind(authController));

/**
 * @swagger
 * /api/auth/user/{id}:
 *   get:
 *     summary: Get user by ID (includes passwordHash for offline login)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     passwordHash:
 *                       type: string
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     roleId:
 *                       type: string
 *                     locations:
 *                       type: array
 *                       items:
 *                         type: object
 *       404:
 *         description: User not found
 */
// Protected route - requires authentication
router.get('/user/:id', authenticate, authController.getUserById.bind(authController));

export { router as authRoutes };
