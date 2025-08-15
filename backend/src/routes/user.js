// backend/src/routes/users.js - User management endpoints (for moderators and users)
const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authorizeRole } = require('../middleware/auth');
const { logSecurityEvent } = require('../middleware/security');

const router = express.Router();

// GET /api/users/profile - Get current user profile
router.get('/profile', async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get user profile with additional stats
        const profile = await db.query(`
            SELECT 
                u.id,
                u.email,
                u.role,
                u.created_at,
                u.last_login_at,
                u.last_login_ip,
                invited_by_user.email as invited_by_email,
                COUNT(DISTINCT dp.document_id) as accessible_documents,
                COUNT(DISTINCT dal.id) as total_document_accesses,
                MAX(dal.access_time) as last_document_access
            FROM users u
            LEFT JOIN users invited_by_user ON u.invited_by = invited_by_user.id
            LEFT JOIN document_permissions dp ON u.id = dp.user_id AND dp.revoked_at IS NULL
            LEFT JOIN document_access_logs dal ON u.id = dal.user_id
            WHERE u.id = $1
            GROUP BY u.id, invited_by_user.email
        `, [userId]);
        
        if (profile.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User profile not found'
            });
        }
        
        res.json({
            success: true,
            data: {
                profile: profile.rows[0]
            }
        });
        
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve profile'
        });
    }
});

// PUT /api/users/profile - Update current user profile (limited fields)
router.put('/profile', [
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Invalid input',
                errors: errors.array()
            });
        }
        
        const userId = req.user.id;
        const { email } = req.body;
        
        // Only allow email updates for now
        const allowedUpdates = {};
        if (email) {
            // Check if email is already taken
            const existingUser = await db.query(
                'SELECT id FROM users WHERE email = $1 AND id != $2',
                [email, userId]
            );
            
            if (existingUser.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Email already in use'
                });
            }
            
            allowedUpdates.email = email;
        }
        
        if (Object.keys(allowedUpdates).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid updates provided'
            });
        }
        
        // Update user
        const updatedUser = await db.update('users', allowedUpdates, { id: userId });
        
        // Log profile update
        await logSecurityEvent(req, 'PROFILE_UPDATED', 'LOW',
            `User updated their profile: ${Object.keys(allowedUpdates).join(', ')}`);
        
        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: {
                    id: updatedUser.id,
                    email: updatedUser.email,
                    role: updatedUser.role
                }
            }
        });
        
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
});

// POST /api/users/invite - Send invitation (Moderators and Admins only)
router.post('/invite', [
    authorizeRole(['MODERATOR', 'ADMIN']),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Invalid input',
                errors: errors.array()
            });
        }
        
        const { email } = req.body;
        const inviterId = req.user.id;
        const inviterRole = req.user.role;
        
        // Check if user already exists
        const existingUser = await db.findOne('users', { email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'User with this email already exists'
            });
        }
        
        // Check if invitation already exists
        const existingInvitation = await db.findOne('invitation_requests', { 
            email, 
            status: 'PENDING' 
        });
        if (existingInvitation) {
            return res.status(409).json({
                success: false,
                message: 'Invitation already pending for this email'
            });
        }
        
        // Create invitation request
        const invitation = await db.insert('invitation_requests', {
            email,
            invited_by: inviterId,
            status: inviterRole === 'ADMIN' ? 'APPROVED' : 'PENDING' // Admins auto-approve
        });
        
        // If admin invited, also auto-approve
        if (inviterRole === 'ADMIN') {
            await db.update('invitation_requests', {
                approved_by: inviterId,
                approved_at: new Date()
            }, { id: invitation.id });
        }
        
        // Log invitation
        const status = inviterRole === 'ADMIN' ? 'approved' : 'pending approval';
        await logSecurityEvent(req, 'INVITATION_SENT', 'LOW',
            `${inviterRole} sent invitation to: ${email} (${status})`);
        
        // TODO: Send email invitation
        // For now, just log it
        console.log(`Invitation sent to ${email} by ${req.user.email}`);
        
        res.status(201).json({
            success: true,
            message: inviterRole === 'ADMIN' 
                ? 'Invitation sent and approved'
                : 'Invitation sent for admin approval',
            data: {
                invitation: {
                    id: invitation.id,
                    email: invitation.email,
                    status: invitation.status,
                    created_at: invitation.created_at
                }
            }
        });
        
    } catch (error) {
        console.error('Send invitation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send invitation'
        });
    }
});

// GET /api/users/invitations - Get invitations sent by current user (Moderators only)
router.get('/invitations', authorizeRole(['MODERATOR', 'ADMIN']), async (req, res) => {
    try {
        const inviterId = req.user.id;
        
        const invitations = await db.query(`
            SELECT 
                ir.*,
                approved_by_user.email as approved_by_email
            FROM invitation_requests ir
            LEFT JOIN users approved_by_user ON ir.approved_by = approved_by_user.id
            WHERE ir.invited_by = $1
            ORDER BY ir.created_at DESC
        `, [inviterId]);
        
        res.json({
            success: true,
            data: {
                invitations: invitations.rows
            }
        });
        
    } catch (error) {
        console.error('Get invitations error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve invitations'
        });
    }
});

// GET /api/users/activity - Get current user's activity history
router.get('/activity', async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        
        // Get user's activity logs
        const activities = await db.query(`
            SELECT 
                al.action_type,
                al.resource_type,
                al.timestamp,
                al.ip_address,
                al.success,
                al.details
            FROM activity_logs al
            WHERE al.user_id = $1
            ORDER BY al.timestamp DESC
            LIMIT $2 OFFSET $3
        `, [userId, limit, offset]);
        
        // Get total count
        const countResult = await db.query(
            'SELECT COUNT(*) as total FROM activity_logs WHERE user_id = $1',
            [userId]
        );
        
        res.json({
            success: true,
            data: {
                activities: activities.rows,
                pagination: {
                    total: parseInt(countResult.rows[0].total),
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(countResult.rows[0].total / limit)
                }
            }
        });
        
    } catch (error) {
        console.error('Get user activity error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve activity history'
        });
    }
});

// GET /api/users/document-history - Get user's document access history
router.get('/document-history', async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        
        // Get user's document access history
        const history = await db.query(`
            SELECT 
                dal.access_time,
                dal.action_type,
                dal.duration_seconds,
                dal.ip_address,
                d.original_name,
                d.mime_type,
                d.file_size
            FROM document_access_logs dal
            LEFT JOIN documents d ON dal.document_id = d.id
            WHERE dal.user_id = $1
            ORDER BY dal.access_time DESC
            LIMIT $2 OFFSET $3
        `, [userId, limit, offset]);
        
        // Get total count
        const countResult = await db.query(
            'SELECT COUNT(*) as total FROM document_access_logs WHERE user_id = $1',
            [userId]
        );
        
        res.json({
            success: true,
            data: {
                history: history.rows,
                pagination: {
                    total: parseInt(countResult.rows[0].total),
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(countResult.rows[0].total / limit)
                }
            }
        });
        
    } catch (error) {
        console.error('Get document history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve document history'
        });
    }
});

// GET /api/users/sessions - Get current user's active sessions
router.get('/sessions', async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get user's active sessions
        const sessions = await db.query(`
            SELECT 
                us.id,
                us.ip_address,
                us.login_time,
                us.is_active,
                us.location_data,
                us.device_fingerprint
            FROM user_sessions us
            WHERE us.user_id = $1 
            AND us.is_active = true
            AND us.login_time > NOW() - INTERVAL '30 days'
            ORDER BY us.login_time DESC
        `, [userId]);
        
        // Parse location data
        const sessionsWithLocation = sessions.rows.map(session => ({
            ...session,
            location_data: session.location_data ? JSON.parse(session.location_data) : null
        }));
        
        res.json({
            success: true,
            data: {
                sessions: sessionsWithLocation
            }
        });
        
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve sessions'
        });
    }
});

// DELETE /api/users/sessions/:sessionId - Terminate a specific session
router.delete('/sessions/:sessionId', async (req, res) => {
    try {
        const userId = req.user.id;
        const sessionId = req.params.sessionId;
        
        // Verify session belongs to current user
        const session = await db.findOne('user_sessions', { 
            id: sessionId, 
            user_id: userId 
        });
        
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }
        
        // Terminate session
        await db.update('user_sessions', {
            is_active: false,
            logout_time: new Date()
        }, { id: sessionId });
        
        // Log session termination
        await logSecurityEvent(req, 'SESSION_TERMINATED', 'LOW',
            `User terminated session from IP: ${session.ip_address}`);
        
        res.json({
            success: true,
            message: 'Session terminated successfully'
        });
        
    } catch (error) {
        console.error('Terminate session error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to terminate session'
        });
    }
});

// POST /api/users/change-password - Change user password
router.post('/change-password', [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
        .isLength({ min: 8 })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('New password must be at least 8 characters with uppercase, lowercase, and number'),
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Passwords do not match');
            }
            return true;
        })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Invalid input',
                errors: errors.array()
            });
        }
        
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;
        
        // Get current user
        const user = await db.findOne('users', { id: userId }, 'password_hash');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Verify current password
        const bcrypt = require('bcryptjs');
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }
        
        // Hash new password
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
        
        // Update password
        await db.update('users', {
            password_hash: newPasswordHash
        }, { id: userId });
        
        // Invalidate all other sessions (force re-login)
        await db.query(`
            UPDATE user_sessions 
            SET is_active = false, logout_time = NOW()
            WHERE user_id = $1 AND is_active = true
        `, [userId]);
        
        // Log password change
        await logSecurityEvent(req, 'PASSWORD_CHANGED', 'MEDIUM',
            'User changed their password');
        
        res.json({
            success: true,
            message: 'Password changed successfully. Please log in again.'
        });
        
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password'
        });
    }
});

// GET /api/users/stats - Get user statistics (for dashboard)
router.get('/stats', async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        
        // Base stats for all users
        const baseStats = await Promise.all([
            // Documents accessible to user
            db.query(`
                SELECT COUNT(*) as count 
                FROM document_permissions dp 
                WHERE dp.user_id = $1 AND dp.revoked_at IS NULL
            `, [userId]),
            
            // Total document accesses by user
            db.query(`
                SELECT COUNT(*) as count 
                FROM document_access_logs dal 
                WHERE dal.user_id = $1
            `, [userId]),
            
            // Recent document accesses (last 7 days)
            db.query(`
                SELECT COUNT(*) as count 
                FROM document_access_logs dal 
                WHERE dal.user_id = $1 
                AND dal.access_time > NOW() - INTERVAL '7 days'
            `, [userId])
        ]);
        
        let stats = {
            documentsAccessible: parseInt(baseStats[0].rows[0].count),
            totalAccesses: parseInt(baseStats[1].rows[0].count),
            recentAccesses: parseInt(baseStats[2].rows[0].count)
        };
        
        // Additional stats for moderators
        if (userRole === 'MODERATOR') {
            const moderatorStats = await Promise.all([
                // Invitations sent
                db.query(`
                    SELECT COUNT(*) as count 
                    FROM invitation_requests 
                    WHERE invited_by = $1
                `, [userId]),
                
                // Pending invitations
                db.query(`
                    SELECT COUNT(*) as count 
                    FROM invitation_requests 
                    WHERE invited_by = $1 AND status = 'PENDING'
                `, [userId])
            ]);
            
            stats.invitationsSent = parseInt(moderatorStats[0].rows[0].count);
            stats.pendingInvitations = parseInt(moderatorStats[1].rows[0].count);
        }
        
        res.json({
            success: true,
            data: {
                stats
            }
        });
        
    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve statistics'
        });
    }
});

// GET /api/users/notifications - Get user notifications (placeholder)
router.get('/notifications', async (req, res) => {
    try {
        // Placeholder for notification system
        // In a real implementation, you'd have a notifications table
        const notifications = [
            {
                id: 1,
                type: 'info',
                message: 'Welcome to the secure document platform',
                read: false,
                created_at: new Date()
            }
        ];
        
        res.json({
            success: true,
            data: {
                notifications
            }
        });
        
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve notifications'
        });
    }
});

// PUT /api/users/notifications/:id/read - Mark notification as read
router.put('/notifications/:id/read', async (req, res) => {
    try {
        const notificationId = req.params.id;
        
        // Placeholder - in real implementation, update notifications table
        
        res.json({
            success: true,
            message: 'Notification marked as read'
        });
        
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read'
        });
    }
});

module.exports = router;