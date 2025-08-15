// src/routes/auth.js - Authentication endpoints
const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { 
    generateToken, 
    generateRefreshToken, 
    verifyRefreshToken,
    getClientIP 
} = require('../middleware/auth');
const { logUserSession } = require('../middleware/audit');
const { 
    handleFailedLogin, 
    handleSuccessfulLogin 
} = require('../middleware/security');

const router = express.Router();

// Input validation rules
const loginValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    body('password')
        .isLength({ min: 1 })
        .withMessage('Password is required')
];

const registerValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    body('password')
        .isLength({ min: 8 })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must be at least 8 characters with uppercase, lowercase, and number'),
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        })
];

// POST /api/auth/login
router.post('/login', loginValidation, async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Invalid input',
                errors: errors.array()
            });
        }

        const { email, password } = req.body;
        const clientIP = getClientIP(req);
        
        // Find user by email
        const user = await db.findOne('users', { email }, 
            'id, email, password_hash, role, is_active, account_locked_until, failed_login_attempts');
        
        if (!user) {
            await handleFailedLogin(req, email, clientIP);
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if account is active
        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated'
            });
        }

        // Check if account is locked
        if (user.account_locked_until && new Date() < new Date(user.account_locked_until)) {
            return res.status(423).json({
                success: false,
                message: 'Account is temporarily locked due to multiple failed attempts'
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            await handleFailedLogin(req, email, clientIP);
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate tokens
        const token = generateToken(user.id, user.role);
        const refreshToken = generateRefreshToken(user.id);

        // Log successful login
        await handleSuccessfulLogin(req, user.id, clientIP);
        
        // Create session record
        await logUserSession(user.id, 'LOGIN', {
            ip: clientIP,
            userAgent: req.headers['user-agent'],
            sessionToken: refreshToken
        });

        // Return success response
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role
                },
                token,
                refreshToken
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
});

// POST /api/auth/register (Admin only - creates new users)
router.post('/register', registerValidation, async (req, res) => {
    try {
        // This endpoint is typically only used by admins or for approved invitations
        // For now, we'll allow it but in production you'd want admin authorization
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Invalid input',
                errors: errors.array()
            });
        }

        const { email, password, invitationToken } = req.body;

        // Check if invitation token is provided and valid
        let invitationValid = false;
        let invitedBy = null;
        
        if (invitationToken) {
            const invitation = await db.findOne('invitation_requests', 
                { email, status: 'APPROVED' });
            
            if (invitation) {
                invitationValid = true;
                invitedBy = invitation.invited_by;
            }
        }

        // For now, allow registration without invitation (change this in production)
        if (!invitationValid && process.env.NODE_ENV === 'production') {
            return res.status(403).json({
                success: false,
                message: 'Valid invitation required'
            });
        }

        // Check if user already exists
        const existingUser = await db.findOne('users', { email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'User already exists'
            });
        }

        // Hash password
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create user
        const newUser = await db.insert('users', {
            email,
            password_hash: passwordHash,
            role: 'USER', // Default role
            invited_by: invitedBy,
            is_active: true
        });

        // Mark invitation as used if applicable
        if (invitationValid) {
            await db.update('invitation_requests', 
                { status: 'COMPLETED' }, 
                { email, status: 'APPROVED' }
            );
        }

        // Generate tokens
        const token = generateToken(newUser.id, newUser.role);
        const refreshToken = generateRefreshToken(newUser.id);

        // Log registration
        const clientIP = getClientIP(req);
        await logUserSession(newUser.id, 'LOGIN', {
            ip: clientIP,
            userAgent: req.headers['user-agent'],
            sessionToken: refreshToken
        });

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: {
                user: {
                    id: newUser.id,
                    email: newUser.email,
                    role: newUser.role
                },
                token,
                refreshToken
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed'
        });
    }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token required'
            });
        }

        // Verify refresh token
        const decoded = verifyRefreshToken(refreshToken);
        
        // Get user from database
        const user = await db.findOne('users', 
            { id: decoded.userId }, 
            'id, email, role, is_active'
        );

        if (!user || !user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }

        // Generate new access token
        const newToken = generateToken(user.id, user.role);

        res.json({
            success: true,
            data: {
                token: newToken
            }
        });

    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid refresh token'
        });
    }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (refreshToken && token) {
            try {
                const decoded = verifyRefreshToken(refreshToken);
                
                // Close user session
                await logUserSession(decoded.userId, 'LOGOUT', {
                    sessionToken: refreshToken
                });
            } catch (error) {
                // Token might be invalid, but still proceed with logout
                console.log('Invalid refresh token during logout:', error.message);
            }
        }

        res.json({
            success: true,
            message: 'Logout successful'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed'
        });
    }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', [
    body('email').isEmail().normalizeEmail()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Valid email is required'
            });
        }

        const { email } = req.body;
        
        // Check if user exists
        const user = await db.findOne('users', { email });
        
        // Always return success to prevent email enumeration
        res.json({
            success: true,
            message: 'If your email exists in our system, you will receive password reset instructions'
        });

        // Only send email if user actually exists
        if (user) {
            // TODO: Implement password reset email functionality
            // For now, just log the request
            console.log(`Password reset requested for: ${email}`);
            
            // In production, you would:
            // 1. Generate a secure reset token
            // 2. Store it in database with expiration
            // 3. Send email with reset link
            // 4. Provide endpoint to verify token and reset password
        }

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Request failed'
        });
    }
});

// GET /api/auth/me (Get current user info)
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const user = await db.findOne('users', 
            { id: decoded.userId }, 
            'id, email, role, created_at, last_login_at'
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    createdAt: user.created_at,
                    lastLoginAt: user.last_login_at
                }
            }
        });

    } catch (error) {
        console.error('Get user info error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
});

// POST /api/auth/change-password (Authenticated users)
router.post('/change-password', [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
        .isLength({ min: 8 })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('New password must be at least 8 characters with uppercase, lowercase, and number')
], async (req, res) => {
    try {
        // This would need the authenticateToken middleware in practice
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Invalid input',
                errors: errors.array()
            });
        }

        // For now, return not implemented
        res.status(501).json({
            success: false,
            message: 'Password change functionality not yet implemented'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Password change failed'
        });
    }
});

module.exports = router;