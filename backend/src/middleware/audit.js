// src/middleware/audit.js - Comprehensive audit logging middleware
const db = require('../config/database');
const geoip = require('geoip-lite');
const useragent = require('useragent');

// Audit logger middleware - logs all requests
const auditLogger = async (req, res, next) => {
    const startTime = Date.now();
    
    // Get client information
    const clientIP = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const agent = useragent.parse(userAgent);
    const geo = geoip.lookup(clientIP);
    
    // Store original res.json to intercept responses
    const originalJson = res.json;
    let responseBody = null;
    let statusCode = null;
    
    res.json = function(body) {
        responseBody = body;
        statusCode = res.statusCode;
        return originalJson.call(this, body);
    };
    
    // Continue with request
    next();
    
    // Log after response is sent
    res.on('finish', async () => {
        try {
            const duration = Date.now() - startTime;
            const success = statusCode < 400;
            
            // Don't log health checks and static files
            if (shouldSkipLogging(req.path)) {
                return;
            }
            
            const auditData = {
                user_id: req.user?.id || null,
                action_type: `${req.method} ${req.path}`,
                resource_type: getResourceType(req.path),
                resource_id: extractResourceId(req),
                ip_address: clientIP,
                success: success,
                details: JSON.stringify({
                    userAgent: userAgent,
                    browser: `${agent.family} ${agent.major}`,
                    os: `${agent.os.family} ${agent.os.major}`,
                    device: agent.device.family,
                    referer: req.headers['referer'],
                    contentLength: req.headers['content-length'],
                    duration: duration,
                    statusCode: statusCode,
                    geo: geo ? {
                        country: geo.country,
                        region: geo.region,
                        city: geo.city,
                        timezone: geo.timezone
                    } : null,
                    query: Object.keys(req.query).length > 0 ? req.query : null,
                    params: Object.keys(req.params).length > 0 ? req.params : null
                }),
                error_message: !success && responseBody?.message ? responseBody.message : null
            };
            
            await db.insert('activity_logs', auditData);
            
            // Log high-value actions separately
            if (isHighValueAction(req)) {
                await logHighValueAction(req, auditData);
            }
            
        } catch (error) {
            console.error('Audit logging error:', error);
        }
    });
};

// Log document access specifically
const logDocumentAccess = async (req, documentId, action = 'VIEW', additionalData = {}) => {
    try {
        if (!req.user || !documentId) return;
        
        const clientIP = getClientIP(req);
        const userAgent = req.headers['user-agent'] || '';
        
        const accessData = {
            user_id: req.user.id,
            document_id: documentId,
            session_id: req.sessionId || null,
            ip_address: clientIP,
            action_type: action,
            user_agent: userAgent,
            referrer: req.headers['referer'] || null,
            ...additionalData
        };
        
        await db.insert('document_access_logs', accessData);
        
        // Update document last_accessed_at
        await db.update('documents', 
            { last_accessed_at: new Date() }, 
            { id: documentId }
        );
        
    } catch (error) {
        console.error('Document access logging error:', error);
    }
};

// Log user session activity
const logUserSession = async (userId, action, sessionData = {}) => {
    try {
        const clientIP = sessionData.ip || null;
        const userAgent = sessionData.userAgent || '';
        const geo = clientIP ? geoip.lookup(clientIP) : null;
        
        if (action === 'LOGIN') {
            // Create new session record
            const sessionRecord = {
                user_id: userId,
                session_token: sessionData.sessionToken,
                ip_address: clientIP,
                user_agent: userAgent,
                login_time: new Date(),
                is_active: true,
                location_data: geo ? JSON.stringify({
                    country: geo.country,
                    region: geo.region,
                    city: geo.city,
                    timezone: geo.timezone,
                    coordinates: [geo.ll[1], geo.ll[0]] // [longitude, latitude]
                }) : null,
                device_fingerprint: generateDeviceFingerprint(userAgent, clientIP)
            };
            
            await db.insert('user_sessions', sessionRecord);
            
            // Update user last login
            await db.update('users', 
                { 
                    last_login_at: new Date(),
                    last_login_ip: clientIP,
                    failed_login_attempts: 0
                }, 
                { id: userId }
            );
            
        } else if (action === 'LOGOUT') {
            // Close session
            await db.query(`
                UPDATE user_sessions 
                SET logout_time = NOW(), is_active = false
                WHERE session_token = $1 AND user_id = $2
            `, [sessionData.sessionToken, userId]);
        }
        
    } catch (error) {
        console.error('Session logging error:', error);
    }
};

// Helper functions
const getClientIP = (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           req.headers['cf-connecting-ip'] || // Cloudflare
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.ip ||
           '127.0.0.1';
};

const shouldSkipLogging = (path) => {
    const skipPaths = ['/health', '/favicon.ico', '/robots.txt'];
    return skipPaths.some(skipPath => path.startsWith(skipPath));
};

const getResourceType = (path) => {
    if (path.includes('/auth')) return 'auth';
    if (path.includes('/documents')) return 'document';
    if (path.includes('/users')) return 'user';
    if (path.includes('/admin')) return 'admin';
    if (path.includes('/files')) return 'file';
    return 'system';
};

const extractResourceId = (req) => {
    // Try to extract ID from various sources
    return req.params.id || 
           req.params.documentId || 
           req.params.userId || 
           req.body.id || 
           req.body.documentId || 
           req.query.id ||
           null;
};

const isHighValueAction = (req) => {
    const highValueActions = [
        '/api/auth/login',
        '/api/auth/register', 
        '/api/documents/upload',
        '/api/admin/users',
        '/api/admin/permissions'
    ];
    
    return highValueActions.some(action => req.path.includes(action)) ||
           req.method === 'DELETE' ||
           (req.method === 'POST' && req.path.includes('/admin'));
};

const logHighValueAction = async (req, auditData) => {
    try {
        // Create security event for high-value actions
        const securityEvent = {
            user_id: req.user?.id || null,
            event_type: `HIGH_VALUE_${req.method}`,
            severity: 'MEDIUM',
            ip_address: auditData.ip_address,
            description: `High-value action: ${req.method} ${req.path}`,
            auto_resolved: true
        };
        
        await db.insert('security_events', securityEvent);
    } catch (error) {
        console.error('High-value action logging error:', error);
    }
};

const generateDeviceFingerprint = (userAgent, ip) => {
    // Simple device fingerprinting - can be enhanced
    const crypto = require('crypto');
    const fingerprint = `${userAgent}|${ip}`;
    return crypto.createHash('sha256').update(fingerprint).digest('hex').substring(0, 32);
};

// Middleware to track document viewing time
const trackDocumentViewTime = () => {
    return (req, res, next) => {
        req.viewStartTime = Date.now();
        
        // Override res.end to capture view duration
        const originalEnd = res.end;
        res.end = function(...args) {
            const duration = Math.round((Date.now() - req.viewStartTime) / 1000);
            
            // Log duration if it's a document view
            if (req.path.includes('/documents/') && req.method === 'GET' && duration > 1) {
                logDocumentAccess(req, req.params.id, 'VIEW_COMPLETE', {
                    duration_seconds: duration,
                    exit_method: 'normal'
                }).catch(console.error);
            }
            
            return originalEnd.apply(this, args);
        };
        
        next();
    };
};

module.exports = {
    auditLogger,
    logDocumentAccess,
    logUserSession,
    trackDocumentViewTime,
    getClientIP
};