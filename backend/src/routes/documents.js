// backend/src/routes/documents.js - Document management endpoints
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authorizeRole, authorizeDocumentAccess } = require('../middleware/auth');
const { logDocumentAccess } = require('../middleware/audit');
const { logSecurityEvent } = require('../middleware/security');

const router = express.Router();

// GET /api/documents - Get user's accessible documents
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        
        let documents;
        
        if (userRole === 'ADMIN') {
            // Admin can see all documents with permission counts
            documents = await db.query(`
                SELECT 
                    d.*,
                    u.email as uploaded_by_email,
                    COUNT(dp.user_id) as shared_with_count,
                    ARRAY_AGG(DISTINCT dp_users.email) FILTER (WHERE dp_users.email IS NOT NULL) as shared_with_emails
                FROM documents d
                LEFT JOIN users u ON d.uploaded_by = u.id
                LEFT JOIN document_permissions dp ON d.id = dp.document_id AND dp.revoked_at IS NULL
                LEFT JOIN users dp_users ON dp.user_id = dp_users.id
                GROUP BY d.id, u.email
                ORDER BY d.created_at DESC
            `);
        } else {
            // Regular users and moderators only see documents they have permission to access
            documents = await db.query(`
                SELECT 
                    d.id,
                    d.filename,
                    d.original_name,
                    d.description,
                    d.file_size,
                    d.mime_type,
                    d.created_at,
                    d.last_accessed_at,
                    u.email as uploaded_by_email,
                    dp.granted_at,
                    dp.granted_by
                FROM documents d
                INNER JOIN document_permissions dp ON d.id = dp.document_id
                INNER JOIN users u ON d.uploaded_by = u.id
                WHERE dp.user_id = $1 AND dp.revoked_at IS NULL
                ORDER BY d.created_at DESC
            `, [userId]);
        }
        
        res.json({
            success: true,
            data: {
                documents: documents.rows,
                total: documents.rows.length
            }
        });
        
    } catch (error) {
        console.error('Get documents error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve documents'
        });
    }
});

// GET /api/documents/:id - Get specific document info
router.get('/:id', authorizeDocumentAccess, async (req, res) => {
    try {
        const documentId = req.params.id;
        const userId = req.user.id;
        
        // Get document details
        const document = await db.query(`
            SELECT 
                d.*,
                u.email as uploaded_by_email
            FROM documents d
            LEFT JOIN users u ON d.uploaded_by = u.id
            WHERE d.id = $1
        `, [documentId]);
        
        if (document.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }
        
        const doc = document.rows[0];
        
        // Get permission info if admin
        let permissionInfo = null;
        if (req.user.role === 'ADMIN') {
            const permissions = await db.query(`
                SELECT 
                    dp.*,
                    u.email as user_email,
                    granted_by_user.email as granted_by_email
                FROM document_permissions dp
                LEFT JOIN users u ON dp.user_id = u.id
                LEFT JOIN users granted_by_user ON dp.granted_by = granted_by_user.id
                WHERE dp.document_id = $1 AND dp.revoked_at IS NULL
                ORDER BY dp.granted_at DESC
            `, [documentId]);
            
            permissionInfo = permissions.rows;
        }
        
        // Log document access
        await logDocumentAccess(req, documentId, 'VIEW_INFO');
        
        res.json({
            success: true,
            data: {
                document: doc,
                permissions: permissionInfo
            }
        });
        
    } catch (error) {
        console.error('Get document error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve document'
        });
    }
});

// GET /api/documents/:id/view - Secure document viewing endpoint
router.get('/:id/view', authorizeDocumentAccess, async (req, res) => {
    try {
        const documentId = req.params.id;
        const userId = req.user.id;
        
        // Get document info
        const document = await db.query(`
            SELECT * FROM documents WHERE id = $1
        `, [documentId]);
        
        if (document.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }
        
        const doc = document.rows[0];
        const filePath = path.join(__dirname, '../../uploads', doc.file_path);
        
        try {
            // Check if file exists
            await fs.access(filePath);
            
            // Log document access with detailed info
            await logDocumentAccess(req, documentId, 'VIEW_CONTENT', {
                duration_seconds: 0, // Will be updated when viewing ends
                file_size: doc.file_size,
                mime_type: doc.mime_type
            });
            
            // Set security headers to prevent caching and downloads
            res.set({
                'Cache-Control': 'no-store, no-cache, must-revalidate, private',
                'Pragma': 'no-cache',
                'Expires': '0',
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'X-XSS-Protection': '1; mode=block',
                'Content-Security-Policy': "default-src 'self'",
                'Content-Disposition': 'inline', // Force inline viewing, not download
                'Content-Type': doc.mime_type
            });
            
            // Stream the file
            const fileBuffer = await fs.readFile(filePath);
            
            // TODO: Add watermarking here
            // For now, send file as-is
            res.send(fileBuffer);
            
        } catch (fileError) {
            console.error('File access error:', fileError);
            
            // Log security event for missing file
            await logSecurityEvent(req, 'FILE_NOT_FOUND', 'HIGH', 
                `Attempt to access non-existent file: ${doc.filename}`);
            
            res.status(404).json({
                success: false,
                message: 'File not found on server'
            });
        }
        
    } catch (error) {
        console.error('Document view error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load document'
        });
    }
});

// POST /api/documents/upload - Upload new document (Admin only)
router.post('/upload', authorizeRole(['ADMIN']), async (req, res) => {
    try {
        // This endpoint will use multer middleware for file upload
        // For now, return not implemented
        res.status(501).json({
            success: false,
            message: 'File upload functionality will be implemented with multer middleware'
        });
        
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Upload failed'
        });
    }
});

// POST /api/documents/:id/permissions - Grant document access (Admin only)
router.post('/:id/permissions', [
    authorizeRole(['ADMIN']),
    body('userId').isInt().withMessage('Valid user ID required'),
    body('userEmail').optional().isEmail().withMessage('Valid email required')
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
        
        const documentId = req.params.id;
        const { userId, userEmail } = req.body;
        const adminId = req.user.id;
        
        // If email provided, get user ID
        let targetUserId = userId;
        if (userEmail && !userId) {
            const user = await db.findOne('users', { email: userEmail }, 'id');
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            targetUserId = user.id;
        }
        
        // Check if document exists
        const document = await db.findOne('documents', { id: documentId });
        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }
        
        // Check if permission already exists
        const existingPermission = await db.findOne('document_permissions', {
            document_id: documentId,
            user_id: targetUserId
        });
        
        if (existingPermission && !existingPermission.revoked_at) {
            return res.status(409).json({
                success: false,
                message: 'User already has access to this document'
            });
        }
        
        // Grant permission
        if (existingPermission) {
            // Restore revoked permission
            await db.update('document_permissions',
                { revoked_at: null, granted_by: adminId, granted_at: new Date() },
                { id: existingPermission.id }
            );
        } else {
            // Create new permission
            await db.insert('document_permissions', {
                document_id: documentId,
                user_id: targetUserId,
                granted_by: adminId
            });
        }
        
        // Log the permission grant
        await logSecurityEvent(req, 'PERMISSION_GRANTED', 'MEDIUM',
            `Admin granted document access to user ID: ${targetUserId}`);
        
        res.json({
            success: true,
            message: 'Document access granted successfully'
        });
        
    } catch (error) {
        console.error('Grant permission error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to grant permission'
        });
    }
});

// DELETE /api/documents/:id/permissions/:userId - Revoke document access (Admin only)
router.delete('/:id/permissions/:userId', authorizeRole(['ADMIN']), async (req, res) => {
    try {
        const documentId = req.params.id;
        const userId = req.params.userId;
        const adminId = req.user.id;
        
        // Find and revoke permission
        const permission = await db.findOne('document_permissions', {
            document_id: documentId,
            user_id: userId
        });
        
        if (!permission) {
            return res.status(404).json({
                success: false,
                message: 'Permission not found'
            });
        }
        
        if (permission.revoked_at) {
            return res.status(409).json({
                success: false,
                message: 'Permission already revoked'
            });
        }
        
        // Revoke permission (soft delete)
        await db.update('document_permissions',
            { revoked_at: new Date() },
            { id: permission.id }
        );
        
        // Log the permission revocation
        await logSecurityEvent(req, 'PERMISSION_REVOKED', 'MEDIUM',
            `Admin revoked document access from user ID: ${userId}`);
        
        res.json({
            success: true,
            message: 'Document access revoked successfully'
        });
        
    } catch (error) {
        console.error('Revoke permission error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to revoke permission'
        });
    }
});

// DELETE /api/documents/:id - Delete document (Admin only)
router.delete('/:id', authorizeRole(['ADMIN']), async (req, res) => {
    try {
        const documentId = req.params.id;
        const adminId = req.user.id;
        
        // Get document info before deletion
        const document = await db.findOne('documents', { id: documentId });
        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }
        
        // Use transaction to ensure data consistency
        await db.transaction(async (client) => {
            // Delete permissions first (due to foreign key constraints)
            await client.query('DELETE FROM document_permissions WHERE document_id = $1', [documentId]);
            
            // Delete access logs
            await client.query('DELETE FROM document_access_logs WHERE document_id = $1', [documentId]);
            
            // Delete file integrity logs
            await client.query('DELETE FROM file_integrity_logs WHERE document_id = $1', [documentId]);
            
            // Delete the document record
            await client.query('DELETE FROM documents WHERE id = $1', [documentId]);
        });
        
        // Delete physical file
        try {
            const filePath = path.join(__dirname, '../../uploads', document.file_path);
            await fs.unlink(filePath);
        } catch (fileError) {
            console.error('File deletion error:', fileError);
            // Continue even if file deletion fails
        }
        
        // Log the deletion
        await logSecurityEvent(req, 'DOCUMENT_DELETED', 'HIGH',
            `Admin deleted document: ${document.original_name}`);
        
        res.json({
            success: true,
            message: 'Document deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete document error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete document'
        });
    }
});

// GET /api/documents/:id/access-log - Get document access history (Admin only)
router.get('/:id/access-log', authorizeRole(['ADMIN']), async (req, res) => {
    try {
        const documentId = req.params.id;
        const { limit = 50, offset = 0 } = req.query;
        
        // Get access log for this document
        const accessLog = await db.query(`
            SELECT 
                dal.*,
                u.email as user_email,
                us.location_data
            FROM document_access_logs dal
            LEFT JOIN users u ON dal.user_id = u.id
            LEFT JOIN user_sessions us ON dal.session_id = us.id
            WHERE dal.document_id = $1
            ORDER BY dal.access_time DESC
            LIMIT $2 OFFSET $3
        `, [documentId, limit, offset]);
        
        // Get total count
        const countResult = await db.query(
            'SELECT COUNT(*) FROM document_access_logs WHERE document_id = $1',
            [documentId]
        );
        
        res.json({
            success: true,
            data: {
                accessLog: accessLog.rows,
                total: parseInt(countResult.rows[0].count),
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
        
    } catch (error) {
        console.error('Get access log error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve access log'
        });
    }
});

module.exports = router;