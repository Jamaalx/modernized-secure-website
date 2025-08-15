// backend/src/routes/admin.js - Admin-only endpoints
const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { upload, validateFile, processUploadedFile } = require('../config/multer');
const { logSecurityEvent } = require('../middleware/security');
const { logDocumentAccess } = require('../middleware/audit');

const router = express.Router();

// All routes in this file require ADMIN role (enforced by middleware in server.js)

// GET /api/admin/dashboard - Admin dashboard statistics
router.get('/dashboard', async (req, res) => {
    try {
        // Get comprehensive system statistics
        const stats = await Promise.all([
            // User counts
            db.query('SELECT role, COUNT(*) as count FROM users WHERE is_active = true GROUP BY role'),
            db.query('SELECT COUNT(*) as total FROM users WHERE is_active = true'),
            
            // Document counts
            db.query('SELECT COUNT(*) as total FROM documents'),
            db.query('SELECT COUNT(DISTINCT user_id) as unique_users FROM document_permissions WHERE revoked_at IS NULL'),
            
            // Activity counts (last 24 hours)
            db.query(`
                SELECT COUNT(*) as count 
                FROM activity_logs 
                WHERE timestamp > NOW() - INTERVAL '24 hours'
            `),
            
            // Document access counts (last 24 hours)
            db.query(`
                SELECT COUNT(*) as count 
                FROM document_access_logs 
                WHERE access_time > NOW() - INTERVAL '24 hours'
            `),
            
            // Security events (last 7 days)
            db.query(`
                SELECT severity, COUNT(*) as count 
                FROM security_events 
                WHERE timestamp > NOW() - INTERVAL '7 days'
                GROUP BY severity
            `),
            
            // Most accessed documents (last 30 days)
            db.query(`
                SELECT 
                    d.original_name,
                    COUNT(dal.id) as access_count
                FROM documents d
                LEFT JOIN document_access_logs dal ON d.id = dal.document_id
                WHERE dal.access_time > NOW() - INTERVAL '30 days'
                GROUP BY d.id, d.original_name
                ORDER BY access_count DESC
                LIMIT 5
            `)
        ]);
        
        // Format the statistics
        const usersByRole = stats[0].rows.reduce((acc, row) => {
            acc[row.role.toLowerCase()] = parseInt(row.count);
            return acc;
        }, {});
        
        const securityEventsBySeverity = stats[6].rows.reduce((acc, row) => {
            acc[row.severity.toLowerCase()] = parseInt(row.count);
            return acc;
        }, {});
        
        res.json({
            success: true,
            data: {
                users: {
                    total: parseInt(stats[1].rows[0].total),
                    byRole: usersByRole
                },
                documents: {
                    total: parseInt(stats[2].rows[0].total),
                    uniqueUsers: parseInt(stats[3].rows[0].unique_users)
                },
                activity: {
                    last24Hours: parseInt(stats[4].rows[0].count),
                    documentAccess24h: parseInt(stats[5].rows[0].count)
                },
                security: {
                    eventsBySeverity: securityEventsBySeverity
                },
                topDocuments: stats[7].rows
            }
        });
        
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load dashboard statistics'
        });
    }
});

// GET /api/admin/users - Get all users with detailed info
router.get('/users', async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', role = '' } = req.query;
        const offset = (page - 1) * limit;
        
        // Build query conditions
        let whereConditions = ['u.id IS NOT NULL'];
        let queryParams = [];
        let paramIndex = 1;
        
        if (search) {
            whereConditions.push(`u.email ILIKE ${paramIndex}`);
            queryParams.push(`%${search}%`);
            paramIndex++;
        }
        
        if (role) {
            whereConditions.push(`u.role = ${paramIndex}`);
            queryParams.push(role);
            paramIndex++;
        }
        
        const whereClause = whereConditions.join(' AND ');
        
        // Get users with additional info
        const users = await db.query(`
            SELECT 
                u.id,
                u.email,
                u.role,
                u.is_active,
                u.created_at,
                u.last_login_at,
                u.last_login_ip,
                u.failed_login_attempts,
                u.account_locked_until,
                invited_by_user.email as invited_by_email,
                COUNT(DISTINCT dp.document_id) as accessible_documents,
                COUNT(DISTINCT dal.id) as total_accesses,
                MAX(dal.access_time) as last_document_access
            FROM users u
            LEFT JOIN users invited_by_user ON u.invited_by = invited_by_user.id
            LEFT JOIN document_permissions dp ON u.id = dp.user_id AND dp.revoked_at IS NULL
            LEFT JOIN document_access_logs dal ON u.id = dal.user_id
            WHERE ${whereClause}
            GROUP BY u.id, invited_by_user.email
            ORDER BY u.created_at DESC
            LIMIT ${paramIndex} OFFSET ${paramIndex + 1}
        `, [...queryParams, limit, offset]);
        
        // Get total count
        const countResult = await db.query(`
            SELECT COUNT(*) as total
            FROM users u
            WHERE ${whereClause}
        `, queryParams);
        
        res.json({
            success: true,
            data: {
                users: users.rows,
                pagination: {
                    total: parseInt(countResult.rows[0].total),
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(countResult.rows[0].total / limit)
                }
            }
        });
        
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve users'
        });
    }
});

// POST /api/admin/users - Create new user
router.post('/users', [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must be at least 8 characters with uppercase, lowercase, and number'),
    body('role').isIn(['USER', 'MODERATOR', 'ADMIN']).withMessage('Valid role required')
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
        
        const { email, password, role } = req.body;
        const adminId = req.user.id;
        
        // Check if user already exists
        const existingUser = await db.findOne('users', { email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'User with this email already exists'
            });
        }
        
        // Hash password
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        
        // Create user
        const newUser = await db.insert('users', {
            email,
            password_hash: passwordHash,
            role,
            invited_by: adminId,
            is_active: true
        });
        
        // Log user creation
        await logSecurityEvent(req, 'USER_CREATED', 'MEDIUM',
            `Admin created new user: ${email} with role: ${role}`);
        
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: {
                user: {
                    id: newUser.id,
                    email: newUser.email,
                    role: newUser.role,
                    created_at: newUser.created_at
                }
            }
        });
        
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create user'
        });
    }
});

// PUT /api/admin/users/:id - Update user
router.put('/users/:id', [
    body('role').optional().isIn(['USER', 'MODERATOR', 'ADMIN']),
    body('is_active').optional().isBoolean()
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
        
        const userId = req.params.id;
        const updates = req.body;
        const adminId = req.user.id;
        
        // Prevent admin from deactivating themselves
        if (userId == adminId && updates.is_active === false) {
            return res.status(400).json({
                success: false,
                message: 'Cannot deactivate your own account'
            });
        }
        
        // Get current user info
        const currentUser = await db.findOne('users', { id: userId });
        if (!currentUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Update user
        const updatedUser = await db.update('users', updates, { id: userId });
        
        // Log the changes
        const changes = Object.keys(updates).map(key => 
            `${key}: ${currentUser[key]} → ${updates[key]}`
        ).join(', ');
        
        await logSecurityEvent(req, 'USER_UPDATED', 'MEDIUM',
            `Admin updated user ${currentUser.email}: ${changes}`);
        
        res.json({
            success: true,
            message: 'User updated successfully',
            data: {
                user: {
                    id: updatedUser.id,
                    email: updatedUser.email,
                    role: updatedUser.role,
                    is_active: updatedUser.is_active
                }
            }
        });
        
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user'
        });
    }
});

// DELETE /api/admin/users/:id - Delete user (soft delete)
router.delete('/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const adminId = req.user.id;
        
        // Prevent admin from deleting themselves
        if (userId == adminId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete your own account'
            });
        }
        
        // Get user info before deletion
        const user = await db.findOne('users', { id: userId });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Soft delete by deactivating
        await db.update('users', { is_active: false }, { id: userId });
        
        // Revoke all document permissions
        await db.query(`
            UPDATE document_permissions 
            SET revoked_at = NOW() 
            WHERE user_id = $1 AND revoked_at IS NULL
        `, [userId]);
        
        // Log user deletion
        await logSecurityEvent(req, 'USER_DELETED', 'HIGH',
            `Admin deleted user: ${user.email}`);
        
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user'
        });
    }
});

// POST /api/admin/documents/upload - Upload document with file handling
router.post('/documents/upload', upload, validateFile, [
    body('description').optional().isLength({ max: 500 })
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
        
        const { description = '' } = req.body;
        const adminId = req.user.id;
        
        // Process the uploaded file
        const fileMetadata = await processUploadedFile(req.file, description);
        
        // Save document to database
        const document = await db.insert('documents', {
            ...fileMetadata,
            uploaded_by: adminId
        });
        
        // Log file upload
        await logSecurityEvent(req, 'DOCUMENT_UPLOADED', 'MEDIUM',
            `Admin uploaded document: ${fileMetadata.originalName}`);
        
        res.status(201).json({
            success: true,
            message: 'Document uploaded successfully',
            data: {
                document: {
                    id: document.id,
                    original_name: document.original_name,
                    file_size: document.file_size,
                    mime_type: document.mime_type,
                    created_at: document.created_at
                }
            }
        });
        
    } catch (error) {
        console.error('Upload document error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to upload document'
        });
    }
});

// GET /api/admin/invitations - Get pending invitations
router.get('/invitations', async (req, res) => {
    try {
        const invitations = await db.query(`
            SELECT 
                ir.*,
                invited_by_user.email as invited_by_email,
                approved_by_user.email as approved_by_email
            FROM invitation_requests ir
            LEFT JOIN users invited_by_user ON ir.invited_by = invited_by_user.id
            LEFT JOIN users approved_by_user ON ir.approved_by = approved_by_user.id
            ORDER BY ir.created_at DESC
        `);
        
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

// PUT /api/admin/invitations/:id/approve - Approve invitation
router.put('/invitations/:id/approve', async (req, res) => {
    try {
        const invitationId = req.params.id;
        const adminId = req.user.id;
        
        // Get invitation
        const invitation = await db.findOne('invitation_requests', { id: invitationId });
        if (!invitation) {
            return res.status(404).json({
                success: false,
                message: 'Invitation not found'
            });
        }
        
        if (invitation.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: 'Invitation already processed'
            });
        }
        
        // Approve invitation
        await db.update('invitation_requests', {
            status: 'APPROVED',
            approved_by: adminId,
            approved_at: new Date()
        }, { id: invitationId });
        
        // Log approval
        await logSecurityEvent(req, 'INVITATION_APPROVED', 'LOW',
            `Admin approved invitation for: ${invitation.email}`);
        
        res.json({
            success: true,
            message: 'Invitation approved successfully'
        });
        
    } catch (error) {
        console.error('Approve invitation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve invitation'
        });
    }
});

// PUT /api/admin/invitations/:id/reject - Reject invitation
router.put('/invitations/:id/reject', async (req, res) => {
    try {
        const invitationId = req.params.id;
        const adminId = req.user.id;
        
        // Get invitation
        const invitation = await db.findOne('invitation_requests', { id: invitationId });
        if (!invitation) {
            return res.status(404).json({
                success: false,
                message: 'Invitation not found'
            });
        }
        
        if (invitation.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: 'Invitation already processed'
            });
        }
        
        // Reject invitation
        await db.update('invitation_requests', {
            status: 'REJECTED',
            approved_by: adminId,
            approved_at: new Date()
        }, { id: invitationId });
        
        // Log rejection
        await logSecurityEvent(req, 'INVITATION_REJECTED', 'LOW',
            `Admin rejected invitation for: ${invitation.email}`);
        
        res.json({
            success: true,
            message: 'Invitation rejected successfully'
        });
        
    } catch (error) {
        console.error('Reject invitation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject invitation'
        });
    }
});

// GET /api/admin/activity-logs - Get system activity logs
router.get('/activity-logs', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 50, 
            userId = '', 
            actionType = '', 
            startDate = '', 
            endDate = '' 
        } = req.query;
        
        const offset = (page - 1) * limit;
        
        // Build query conditions
        let whereConditions = ['al.id IS NOT NULL'];
        let queryParams = [];
        let paramIndex = 1;
        
        if (userId) {
            whereConditions.push(`al.user_id = ${paramIndex}`);
            queryParams.push(userId);
            paramIndex++;
        }
        
        if (actionType) {
            whereConditions.push(`al.action_type ILIKE ${paramIndex}`);
            queryParams.push(`%${actionType}%`);
            paramIndex++;
        }
        
        if (startDate) {
            whereConditions.push(`al.timestamp >= ${paramIndex}`);
            queryParams.push(startDate);
            paramIndex++;
        }
        
        if (endDate) {
            whereConditions.push(`al.timestamp <= ${paramIndex}`);
            queryParams.push(endDate);
            paramIndex++;
        }
        
        const whereClause = whereConditions.join(' AND ');
        
        // Get activity logs
        const logs = await db.query(`
            SELECT 
                al.*,
                u.email as user_email
            FROM activity_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE ${whereClause}
            ORDER BY al.timestamp DESC
            LIMIT ${paramIndex} OFFSET ${paramIndex + 1}
        `, [...queryParams, limit, offset]);
        
        // Get total count
        const countResult = await db.query(`
            SELECT COUNT(*) as total
            FROM activity_logs al
            WHERE ${whereClause}
        `, queryParams);
        
        res.json({
            success: true,
            data: {
                logs: logs.rows,
                pagination: {
                    total: parseInt(countResult.rows[0].total),
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(countResult.rows[0].total / limit)
                }
            }
        });
        
    } catch (error) {
        console.error('Get activity logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve activity logs'
        });
    }
});

// GET /api/admin/security-events - Get security events
router.get('/security-events', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 50, 
            severity = '', 
            eventType = '',
            resolved = ''
        } = req.query;
        
        const offset = (page - 1) * limit;
        
        // Build query conditions
        let whereConditions = ['se.id IS NOT NULL'];
        let queryParams = [];
        let paramIndex = 1;
        
        if (severity) {
            whereConditions.push(`se.severity = ${paramIndex}`);
            queryParams.push(severity);
            paramIndex++;
        }
        
        if (eventType) {
            whereConditions.push(`se.event_type ILIKE ${paramIndex}`);
            queryParams.push(`%${eventType}%`);
            paramIndex++;
        }
        
        if (resolved !== '') {
            whereConditions.push(`se.auto_resolved = ${paramIndex}`);
            queryParams.push(resolved === 'true');
            paramIndex++;
        }
        
        const whereClause = whereConditions.join(' AND ');
        
        // Get security events
        const events = await db.query(`
            SELECT 
                se.*,
                u.email as user_email,
                investigated_by_user.email as investigated_by_email
            FROM security_events se
            LEFT JOIN users u ON se.user_id = u.id
            LEFT JOIN users investigated_by_user ON se.investigated_by = investigated_by_user.id
            WHERE ${whereClause}
            ORDER BY se.timestamp DESC
            LIMIT ${paramIndex} OFFSET ${paramIndex + 1}
        `, [...queryParams, limit, offset]);
        
        // Get total count
        const countResult = await db.query(`
            SELECT COUNT(*) as total
            FROM security_events se
            WHERE ${whereClause}
        `, queryParams);
        
        res.json({
            success: true,
            data: {
                events: events.rows,
                pagination: {
                    total: parseInt(countResult.rows[0].total),
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(countResult.rows[0].total / limit)
                }
            }
        });
        
    } catch (error) {
        console.error('Get security events error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve security events'
        });
    }
});

module.exports = router;