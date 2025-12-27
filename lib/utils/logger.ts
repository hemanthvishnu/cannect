/**
 * Cannect Remote Logger
 * 
 * Comprehensive logging system that sends all app events to Supabase
 * for real-time monitoring. Silent, non-blocking, fire-and-forget.
 */

import { Platform } from 'react-native';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase Logging Project (separate from main app)
const LOG_SUPABASE_URL = process.env.EXPO_PUBLIC_LOG_SUPABASE_URL || '';
const LOG_SUPABASE_KEY = process.env.EXPO_PUBLIC_LOG_SUPABASE_ANON_KEY || '';

// Log categories
export type LogCategory = 
  | 'auth'      // Login, logout, register, session
  | 'post'      // Create, delete, like, repost
  | 'media'     // Upload, compress, view
  | 'push'      // Web push flow
  | 'nav'       // Navigation, screen views
  | 'error'     // Errors, exceptions
  | 'network'   // API calls
  | 'profile'   // Profile updates, follows
  | 'system';   // App lifecycle

export type LogStatus = 'start' | 'success' | 'error' | 'info';

interface LogEntry {
  category: LogCategory;
  action: string;
  status: LogStatus;
  message?: string;
  error?: string;
  metadata?: Record<string, any>;
}

// Session ID - unique per app load
const SESSION_ID = generateSessionId();

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Detect platform
function getPlatform(): string {
  if (Platform.OS !== 'web') return Platform.OS;
  if (typeof window === 'undefined') return 'ssr';
  
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isStandalone = (window.navigator as any).standalone === true || 
    window.matchMedia('(display-mode: standalone)').matches;
  
  if (isIOS && isStandalone) return 'ios-pwa';
  if (isAndroid && isStandalone) return 'android-pwa';
  if (isIOS) return 'ios-web';
  if (isAndroid) return 'android-web';
  return 'web';
}

// Get current URL/route
function getCurrentUrl(): string {
  if (typeof window === 'undefined') return '';
  return window.location.pathname + window.location.search;
}

// Get user agent
function getUserAgent(): string {
  if (typeof navigator === 'undefined') return '';
  return navigator.userAgent;
}

// Lazy-init Supabase client
let supabaseClient: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (!LOG_SUPABASE_URL || !LOG_SUPABASE_KEY) {
    return null;
  }
  
  if (!supabaseClient) {
    supabaseClient = createClient(LOG_SUPABASE_URL, LOG_SUPABASE_KEY, {
      auth: { persistSession: false }
    });
  }
  
  return supabaseClient;
}

// Current user DID (set by auth store)
let currentDid: string | null = null;

/**
 * Set the current user DID for logging context
 */
export function setLoggerDid(did: string | null) {
  currentDid = did;
}

/**
 * Log queue for batching (send every 2 seconds or 10 logs)
 */
const logQueue: any[] = [];
let flushTimer: NodeJS.Timeout | null = null;

const FLUSH_INTERVAL = 2000; // 2 seconds
const FLUSH_THRESHOLD = 10; // 10 logs

async function flushLogs() {
  if (logQueue.length === 0) return;
  
  const supabase = getSupabase();
  if (!supabase) {
    logQueue.length = 0; // Clear queue if no supabase
    return;
  }
  
  const logsToSend = [...logQueue];
  logQueue.length = 0;
  
  try {
    await supabase.from('app_logs').insert(logsToSend);
  } catch (e) {
    // Silent fail - don't log logging errors
    console.warn('[Logger] Failed to send logs:', e);
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushLogs();
  }, FLUSH_INTERVAL);
}

function queueLog(entry: any) {
  logQueue.push(entry);
  
  if (logQueue.length >= FLUSH_THRESHOLD) {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    flushLogs();
  } else {
    scheduleFlush();
  }
}

/**
 * Main logging function
 */
export function log(entry: LogEntry) {
  const fullEntry = {
    ...entry,
    did: currentDid,
    session_id: SESSION_ID,
    url: getCurrentUrl(),
    user_agent: getUserAgent(),
    platform: getPlatform(),
    app_version: '1.0.0', // TODO: Get from app.json
  };
  
  // Also log to console in dev
  if (__DEV__) {
    const icon = entry.status === 'error' ? '🔴' : 
                 entry.status === 'success' ? '🟢' : 
                 entry.status === 'start' ? '🔵' : '⚪';
    console.log(`${icon} [${entry.category}] ${entry.action}:`, entry.message || '', entry.metadata || '');
  }
  
  queueLog(fullEntry);
}

// ============================================
// Convenience methods
// ============================================

export const logger = {
  /**
   * Set current user DID
   */
  setUser: setLoggerDid,
  
  /**
   * Generic log
   */
  log,
  
  /**
   * Log an error
   */
  error: (category: LogCategory, action: string, error: Error | string, metadata?: Record<string, any>) => {
    log({
      category,
      action,
      status: 'error',
      error: error instanceof Error ? error.message : error,
      metadata: {
        ...metadata,
        stack: error instanceof Error ? error.stack : undefined,
      },
    });
  },
  
  /**
   * Log success
   */
  success: (category: LogCategory, action: string, message?: string, metadata?: Record<string, any>) => {
    log({
      category,
      action,
      status: 'success',
      message,
      metadata,
    });
  },
  
  /**
   * Log action start
   */
  start: (category: LogCategory, action: string, message?: string, metadata?: Record<string, any>) => {
    log({
      category,
      action,
      status: 'start',
      message,
      metadata,
    });
  },
  
  /**
   * Log info
   */
  info: (category: LogCategory, action: string, message?: string, metadata?: Record<string, any>) => {
    log({
      category,
      action,
      status: 'info',
      message,
      metadata,
    });
  },
  
  // ============================================
  // Auth helpers
  // ============================================
  
  auth: {
    loginStart: (handle: string) => 
      log({ category: 'auth', action: 'login', status: 'start', message: `Login attempt: ${handle}` }),
    
    loginSuccess: (did: string, handle: string) => {
      setLoggerDid(did);
      log({ category: 'auth', action: 'login', status: 'success', message: `Logged in: ${handle}`, metadata: { did } });
    },
    
    loginError: (handle: string, error: string) => 
      log({ category: 'auth', action: 'login', status: 'error', error, message: `Login failed: ${handle}` }),
    
    registerStart: (handle: string) => 
      log({ category: 'auth', action: 'register', status: 'start', message: `Register attempt: ${handle}` }),
    
    registerSuccess: (did: string, handle: string) => {
      setLoggerDid(did);
      log({ category: 'auth', action: 'register', status: 'success', message: `Registered: ${handle}`, metadata: { did } });
    },
    
    registerError: (handle: string, error: string) => 
      log({ category: 'auth', action: 'register', status: 'error', error, message: `Register failed: ${handle}` }),
    
    logout: () => {
      log({ category: 'auth', action: 'logout', status: 'success' });
      setLoggerDid(null);
    },
    
    sessionRestore: (did: string) => {
      setLoggerDid(did);
      log({ category: 'auth', action: 'session_restore', status: 'success', metadata: { did } });
    },
    
    sessionRestoreError: (error: string) => 
      log({ category: 'auth', action: 'session_restore', status: 'error', error }),
  },
  
  // ============================================
  // Post helpers
  // ============================================
  
  post: {
    createStart: (text: string, imageCount: number) => 
      log({ category: 'post', action: 'create', status: 'start', message: `Creating post`, metadata: { textLength: text.length, imageCount } }),
    
    createSuccess: (uri: string) => 
      log({ category: 'post', action: 'create', status: 'success', metadata: { uri } }),
    
    createError: (error: string) => 
      log({ category: 'post', action: 'create', status: 'error', error }),
    
    deleteStart: (uri: string) => 
      log({ category: 'post', action: 'delete', status: 'start', metadata: { uri } }),
    
    deleteSuccess: (uri: string) => 
      log({ category: 'post', action: 'delete', status: 'success', metadata: { uri } }),
    
    deleteError: (uri: string, error: string) => 
      log({ category: 'post', action: 'delete', status: 'error', error, metadata: { uri } }),
    
    like: (uri: string) => 
      log({ category: 'post', action: 'like', status: 'success', metadata: { uri } }),
    
    unlike: (uri: string) => 
      log({ category: 'post', action: 'unlike', status: 'success', metadata: { uri } }),
    
    repost: (uri: string) => 
      log({ category: 'post', action: 'repost', status: 'success', metadata: { uri } }),
    
    unrepost: (uri: string) => 
      log({ category: 'post', action: 'unrepost', status: 'success', metadata: { uri } }),
  },
  
  // ============================================
  // Media helpers
  // ============================================
  
  media: {
    uploadStart: (count: number, totalSize: number) => 
      log({ category: 'media', action: 'upload', status: 'start', metadata: { count, totalSizeKB: Math.round(totalSize / 1024) } }),
    
    uploadSuccess: (count: number, durationMs: number) => 
      log({ category: 'media', action: 'upload', status: 'success', metadata: { count, durationMs } }),
    
    uploadError: (error: string, metadata?: Record<string, any>) => 
      log({ category: 'media', action: 'upload', status: 'error', error, metadata }),
    
    compressStart: (originalSize: number) => 
      log({ category: 'media', action: 'compress', status: 'start', metadata: { originalSizeKB: Math.round(originalSize / 1024) } }),
    
    compressSuccess: (originalSize: number, compressedSize: number) => 
      log({ category: 'media', action: 'compress', status: 'success', metadata: { 
        originalSizeKB: Math.round(originalSize / 1024), 
        compressedSizeKB: Math.round(compressedSize / 1024),
        reduction: Math.round((1 - compressedSize / originalSize) * 100) + '%'
      }}),
    
    compressError: (error: string) => 
      log({ category: 'media', action: 'compress', status: 'error', error }),
  },
  
  // ============================================
  // Push notification helpers
  // ============================================
  
  push: {
    checkSupport: (result: Record<string, any>) => 
      log({ category: 'push', action: 'check_support', status: 'info', metadata: result }),
    
    permissionRequest: (result: string) => 
      log({ category: 'push', action: 'permission_request', status: result === 'granted' ? 'success' : 'info', metadata: { result } }),
    
    subscribeStart: () => 
      log({ category: 'push', action: 'subscribe', status: 'start' }),
    
    subscribeSuccess: () => 
      log({ category: 'push', action: 'subscribe', status: 'success' }),
    
    subscribeError: (error: string) => 
      log({ category: 'push', action: 'subscribe', status: 'error', error }),
    
    unsubscribe: () => 
      log({ category: 'push', action: 'unsubscribe', status: 'success' }),
    
    received: (title: string) => 
      log({ category: 'push', action: 'received', status: 'success', message: title }),
  },
  
  // ============================================
  // Profile helpers
  // ============================================
  
  profile: {
    updateStart: (fields: string[]) => 
      log({ category: 'profile', action: 'update', status: 'start', metadata: { fields } }),
    
    updateSuccess: () => 
      log({ category: 'profile', action: 'update', status: 'success' }),
    
    updateError: (error: string) => 
      log({ category: 'profile', action: 'update', status: 'error', error }),
    
    follow: (did: string) => 
      log({ category: 'profile', action: 'follow', status: 'success', metadata: { targetDid: did } }),
    
    unfollow: (did: string) => 
      log({ category: 'profile', action: 'unfollow', status: 'success', metadata: { targetDid: did } }),
  },
  
  // ============================================
  // Navigation helpers
  // ============================================
  
  nav: {
    screenView: (screen: string) => 
      log({ category: 'nav', action: 'screen_view', status: 'info', message: screen }),
    
    appStart: () => 
      log({ category: 'nav', action: 'app_start', status: 'info', metadata: { platform: getPlatform() } }),
    
    appBackground: () => 
      log({ category: 'nav', action: 'app_background', status: 'info' }),
    
    appForeground: () => 
      log({ category: 'nav', action: 'app_foreground', status: 'info' }),
  },
  
  // ============================================
  // Network helpers
  // ============================================
  
  network: {
    requestStart: (endpoint: string, method: string) => 
      log({ category: 'network', action: 'request', status: 'start', metadata: { endpoint, method } }),
    
    requestSuccess: (endpoint: string, durationMs: number) => 
      log({ category: 'network', action: 'request', status: 'success', metadata: { endpoint, durationMs } }),
    
    requestError: (endpoint: string, error: string, status?: number) => 
      log({ category: 'network', action: 'request', status: 'error', error, metadata: { endpoint, httpStatus: status } }),
  },
  
  // ============================================
  // System helpers
  // ============================================
  
  system: {
    error: (error: Error, context?: string) => 
      log({ 
        category: 'error', 
        action: 'unhandled', 
        status: 'error', 
        error: error.message,
        metadata: { stack: error.stack, context }
      }),
    
    jsError: (message: string, source?: string, line?: number, col?: number) => 
      log({ 
        category: 'error', 
        action: 'js_error', 
        status: 'error', 
        error: message,
        metadata: { source, line, col }
      }),
    
    promiseRejection: (reason: any) => 
      log({ 
        category: 'error', 
        action: 'promise_rejection', 
        status: 'error', 
        error: reason?.message || String(reason),
        metadata: { stack: reason?.stack }
      }),
  },
  
  /**
   * Flush all pending logs immediately
   */
  flush: flushLogs,
};

// ============================================
// Global error handlers (call once on app start)
// ============================================

export function setupGlobalErrorHandlers() {
  if (typeof window === 'undefined') return;
  
  // Catch unhandled JS errors
  window.onerror = (message, source, lineno, colno, error) => {
    logger.system.jsError(String(message), source, lineno, colno);
    return false; // Let the error propagate
  };
  
  // Catch unhandled promise rejections
  window.onunhandledrejection = (event) => {
    logger.system.promiseRejection(event.reason);
  };
  
  // Flush logs before page unload
  window.addEventListener('beforeunload', () => {
    flushLogs();
  });
  
  // Log app visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      logger.nav.appBackground();
      flushLogs();
    } else {
      logger.nav.appForeground();
    }
  });
  
  // Log app start
  logger.nav.appStart();
}

export default logger;
