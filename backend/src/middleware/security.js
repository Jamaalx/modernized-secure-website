// src/middleware/security.js - Real-time security monitoring and threat detection
const db = require('../config/database');
const { getClientIP } = require('./audit');

// In-memory tracking for performance (consider Redis for production)
const securityCache = {
    failedLogins: new Map(), // IP -> { count, lastAttempt }
    suspiciousIPs: new Set(),
    activeThreats: new Map(),
    rateLimit: new Map() // IP -> { requests: [], windowStart }
};

// Main security monitoring middleware
const securityMonitor = async (req, res, next) => {
    const clientIP = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const timestamp = Date.now();
    
    try {
        // 1. Check if IP is already flagged as suspicious
        if (securityCache.suspiciousIPs.has(clientIP)) {
            await logSecurityEvent(req, 'SUSPICIOUS_IP_ACCESS', 'HIGH', 
                `Access attempt from flagged IP: ${clientIP}`);
        }
        
        // 2. Detect unusual patterns
        await detectAnomalousActivity(req, clientIP, userAgent, timestamp);
        
        // 3. Check for concurrent sessions (if user is authenticated)
        if (req.headers.authorization) {
            await checkConcurrentSessions(req, clientIP);
        }
        
        // 4. Monitor for rapid requests (additional to express-rate-limit)
        const isRapidRequest = checkRapidRequests(clientIP, timestamp);
        if (isRapidRequest) {
            await logSecurityEvent(req, 'RAPID_REQUESTS', 'MEDIUM',
                `Rapid requests detected from IP: ${clientIP}`);
        }
        
        // 5. Detect potential data scraping
        if (isDataScrapingPattern(req, clientIP)) {
            await logSecurityEvent(req, 'POTENTIAL_SCRAPING', 'HIGH',
                `Potential data scraping detected from IP: ${clientIP}`);
        }
        
        next();
        
    } catch (error) {
        console.error('Security monitoring error:', error);
        next(); // Don't block requests on monitoring errors
    }
};

// Detect anomalous user activity
const detectAnomalousActivity = async (req, clientIP, userAgent, timestamp) => {
    // Check for suspicious user agent patterns
    if (isSuspiciousUserAgent(userAgent)) {
        await logSecurityEvent(req, 'SUSPICIOUS_USER_AGENT', 'MEDIUM',
            `Suspicious user agent detected: ${userAgent}`);
    }
    
    // Check for unusual request patterns
    if (req.user) {
        await checkUserBehaviorAnomalies(req, clientIP, timestamp);
    }
};

// Check for concurrent sessions from different locations
const checkConcurrentSessions = async (req, clientIP) => {
    if (!req.user) return;
    
    try {
        // Get active sessions for this user
        const activeSessions = await db.query(`
            SELECT DISTINCT ip_address, location_data, login_time
            FROM user_sessions 
            WHERE user_id = $1 AND is_active = true
            AND login_time > NOW() - INTERVAL '24 hours'
        `, [req.user.id]);
        
        if (activeSessions.rows.length > 1) {
            const ips = activeSessions.rows.map(s => s.ip_address);
            const uniqueIPs = [...new Set(ips)];
            
            if (uniqueIPs.length > 1) {
                await logSecurityEvent(req, 'CONCURRENT_SESSIONS', 'HIGH',
                    `User has concurrent sessions from multiple IPs: ${uniqueIPs.join(', ')}`);
            }
        }
    } catch (error) {
        console.error('Concurrent session check error:', error);
    }
};

// Check for rapid requests pattern
const checkRapidRequests = (clientIP, timestamp) => {
    if (!securityCache.rateLimit.has(clientIP)) {
        securityCache.rateLimit.set(clientIP, { requests: [], windowStart: timestamp });
    }
    
    const ipData = securityCache.rateLimit.get(clientIP);
    const windowMs = 60000; // 1 minute window
    const maxRequests = 120; // requests per minute
    
    // Clean old requests
    ipData.requests = ipData.requests.filter(time => timestamp - time < windowMs);
    ipData.requests.push(timestamp);
    
    // Check if exceeding limits
    if (ipData.requests.length > maxRequests) {
        securityCache.suspiciousIPs.add(clientIP);
        return true;
    }
    
    return false;
};

// Detect potential data scraping patterns
const isDataScrapingPattern = (req, clientIP) => {
    // Check for automated patterns
    const suspiciousPatterns = [
        req.path.includes('/documents/') && req.method === 'GET',
        req.headers['user-agent']?.includes('bot'),
        req.headers['user-agent']?.includes('crawler'),
        !req.headers['accept']?.includes('text/html'), // Non-browser requests
        req.headers['accept'] === '*/*' // Generic accept header
    ];
    
    const patternCount = suspiciousPatterns.filter(Boolean).length;
    return patternCount >= 2;
};

// Check for suspicious user agents
const isSuspiciousUserAgent = (userAgent) => {
    const suspiciousPatterns = [
        /bot/i,
        /crawler/i,
        /spider/i,
        /scraper/i,
        /curl/i,
        /wget/i,
        /python/i,
        /go-http-client/i,
        /^$/,
        /^mozilla\/5\.0$/i
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
};

// Analyze user behavior for anomalies
const checkUserBehaviorAnomalies = async (req, clientIP, timestamp) => {
    try {
        const userId = req.user.id;
        const timeWindow = 24 * 60 * 60 * 1000; // 24 hours
        
        // Get recent user activity
        const recentActivity = await db.query(`
            SELECT action_type, ip_address, timestamp, details
            FROM activity_logs 
            WHERE user_id = $1 
            AND timestamp > NOW() - INTERVAL '24 hours'
            ORDER BY timestamp DESC
            LIMIT 100
        `, [userId]);
        
        const activities = recentActivity.rows;
        
        // 1. Check for unusual access times
        const currentHour = new Date().getHours();
        const userNormalHours = getUserNormalAccessHours(activities);
        if (userNormalHours.length > 0 && !userNormalHours.includes(currentHour)) {
            await logSecurityEvent(req, 'UNUSUAL_ACCESS_TIME', 'MEDIUM',
                `User accessing system outside normal hours: ${currentHour}:00`);
        }
        
        // 2. Check for geographic anomalies
        const userNormalLocations = getUserNormalLocations(activities);
        const currentLocation = await getLocationFromIP(clientIP);
        if (currentLocation && userNormalLocations.length > 0) {
            const isNormalLocation = userNormalLocations.some(loc => 
                loc.country === currentLocation.country
            );
            if (!isNormalLocation) {
                await logSecurityEvent(req, 'UNUSUAL_LOCATION', 'HIGH',
                    `User accessing from unusual location: ${currentLocation.country}`);
            }
        }
        
        // 3. Check for rapid document access
        const documentAccesses = activities.filter(a => a.action_type.includes('documents'));
        if (documentAccesses.length > 20) { // More than 20 document accesses in 24h
            await logSecurityEvent(req, 'EXCESSIVE_DOCUMENT_ACCESS', 'HIGH',
                `User has accessed ${documentAccesses.length} documents in 24 hours`);
        }
        
    } catch (error) {
        console.error('User behavior analysis error:', error);
    }
};

// Handle failed login attempts
const handleFailedLogin = async (req, email, clientIP) => {
    try {
        // Track failed attempts by IP
        if (!securityCache.failedLogins.has(clientIP)) {
            securityCache.failedLogins.set(clientIP, { count: 0, lastAttempt: 0 });
        }
        
        const ipData = securityCache.failedLogins.get(clientIP);
        ipData.count++;
        ipData.lastAttempt = Date.now();
        
        // Log failed login
        await logSecurityEvent(req, 'FAILED_LOGIN', 'MEDIUM',
            `Failed login attempt for email: ${email}`);
        
        // Check if should lock account or flag IP
        if (ipData.count >= 5) {
            securityCache.suspiciousIPs.add(clientIP);
            await logSecurityEvent(req, 'BRUTE_FORCE_DETECTED', 'CRITICAL',
                `Brute force attack detected from IP: ${clientIP}`);
            
            // Lock user account if exists
            await db.query(`
                UPDATE users 
                SET account_locked_until = NOW() + INTERVAL '30 minutes',
                    failed_login_attempts = failed_login_attempts + 1
                WHERE email = $1
            `, [email]);
        }
        
        return ipData.count;
    } catch (error) {
        console.error('Failed login handling error:', error);
        return 0;
    }
};

// Handle successful login
const handleSuccessfulLogin = async (req, userId, clientIP) => {
    try {
        // Clear failed attempts for this IP
        securityCache.failedLogins.delete(clientIP);
        
        // Reset user failed attempts
        await db.update('users', 
            { failed_login_attempts: 0, account_locked_until: null },
            { id: userId }
        );
        
        // Log successful login
        await logSecurityEvent(req, 'SUCCESSFUL_LOGIN', 'LOW',
            `User successfully logged in`);
            
    } catch (error) {
        console.error('Successful login handling error:', error);
    }
};

// Log security events
const logSecurityEvent = async (req, eventType, severity, description, userId = null) => {
    try {
        const securityEvent = {
            user_id: userId || req.user?.id || null,
            event_type: eventType,
            severity: severity,
            ip_address: getClientIP(req),
            description: description,
            auto_resolved: severity === 'LOW'
        };
        
        await db.insert('security_events', securityEvent);
        
        // For critical events, could trigger immediate alerts
        if (severity === 'CRITICAL') {
            console.error('🚨 CRITICAL SECURITY EVENT:', securityEvent);
            // TODO: Send immediate notification to admins
        }
        
    } catch (error) {
        console.error('Security event logging error:', error);
    }
};

// Helper functions
const getUserNormalAccessHours = (activities) => {
    const hours = activities.map(a => new Date(a.timestamp).getHours());
    const hourCounts = {};
    hours.forEach(hour => hourCounts[hour] = (hourCounts[hour] || 0) + 1);
    
    // Return hours with more than 20% of total activity
    const threshold = activities.length * 0.2;
    return Object.keys(hourCounts)
        .filter(hour => hourCounts[hour] > threshold)
        .map(Number);
};

const getUserNormalLocations = (activities) => {
    const locations = activities
        .map(a => {
            try {
                const details = JSON.parse(a.details || '{}');
                return details.geo;
            } catch {
                return null;
            }
        })
        .filter(Boolean);
    
    // Return unique countries where user has accessed from
    const countries = [...new Set(locations.map(loc => loc.country))];
    return countries.map(country => ({ country }));
};

const getLocationFromIP = async (ip) => {
    // Implementation depends on your GeoIP service
    // This is a placeholder
    try {
        const geoip = require('geoip-lite');
        return geoip.lookup(ip);
    } catch {
        return null;
    }
};

// Clean up old cache entries periodically
setInterval(() => {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour
    
    // Clean failed logins
    for (const [ip, data] of securityCache.failedLogins.entries()) {
        if (now - data.lastAttempt > maxAge) {
            securityCache.failedLogins.delete(ip);
        }
    }
    
    // Clean rate limits
    for (const [ip, data] of securityCache.rateLimit.entries()) {
        if (now - data.windowStart > maxAge) {
            securityCache.rateLimit.delete(ip);
        }
    }
}, 10 * 60 * 1000); // Clean every 10 minutes

module.exports = {
    securityMonitor,
    handleFailedLogin,
    handleSuccessfulLogin,
    logSecurityEvent
};