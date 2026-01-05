// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { clearAllSessionData, backupSessionToIndexedDB, restoreSessionFromIndexedDB } from "../utils/sessionPersistence";

// 1. Membuat Context
const AuthContext = createContext(null);

// Session configuration - NO EXPIRY!
const SESSION_CONFIG = {
	ACTIVITY_CHECK_INTERVAL: 5 * 60 * 1000, // Check every 5 minutes (just for tracking, no expiry)
};

// Helper function to save session
// ASYNC to wait for IndexedDB backup to complete
// NO EXPIRY - session lasts forever until manual logout
const saveSession = async (user, token) => {
	const sessionData = {
		user,
		token,
		lastActivity: Date.now(),
		// NO expiresAt - session never expires!
	};
	
	console.log('[Auth] 💾 Saving PERMANENT session (no expiry)...');
	localStorage.setItem("authSession", JSON.stringify(sessionData));
	localStorage.setItem("user", JSON.stringify(user));
	localStorage.setItem("expressToken", token);
	
	// WAIT for IndexedDB backup to complete before returning
	console.log('[Auth] 💾 Backing up to IndexedDB...');
	const success = await backupSessionToIndexedDB();
	if (success) {
		console.log('[Auth] ✅ Session saved and BACKED UP to IndexedDB (PERMANENT)');
	} else {
		console.log('[Auth] ⚠️ Session saved but IndexedDB backup failed');
	}
	
	return success;
};

// Helper function to load session
// NO EXPIRY CHECK - session is valid forever until logout
const loadSession = () => {
	try {
		const sessionStr = localStorage.getItem("authSession");
		if (!sessionStr) {
			// Fallback to old storage format
			const user = localStorage.getItem("user");
			const token = localStorage.getItem("expressToken");
			if (user && token) {
				return {
					user: JSON.parse(user),
					token,
					lastActivity: Date.now(),
					// NO expiresAt
				};
			}
			return null;
		}
		
		const session = JSON.parse(sessionStr);
		
		// NO EXPIRY CHECK - session is always valid!
		// Just update last activity timestamp
		session.lastActivity = Date.now();
		localStorage.setItem("authSession", JSON.stringify(session));
		
		// console.log('[Auth] ✅ Session loaded (no expiry check)');
		return session;
	} catch (error) {
		console.error('[Auth] Error loading session:', error);
		return null;
	}
};

// Helper function to clear session
const clearSession = () => {
	localStorage.removeItem("authSession");
	localStorage.removeItem("user");
	localStorage.removeItem("expressToken");
};

// Helper function to update activity timestamp
const updateActivity = () => {
	try {
		const sessionStr = localStorage.getItem("authSession");
		if (sessionStr) {
			const session = JSON.parse(sessionStr);
			session.lastActivity = Date.now();
			// NO expiry extension - session is permanent!
			
			localStorage.setItem("authSession", JSON.stringify(session));
			
			// Backup to IndexedDB after activity update
			backupSessionToIndexedDB();
		}
	} catch (error) {
		console.error('[Auth] Error updating activity:', error);
	}
};

// 2. Membuat Provider (Penyedia Data)
export const AuthProvider = ({ children }) => {
	// NEW STRATEGY: Start with null, then check both localStorage and IndexedDB
	const [user, setUser] = useState(null);
	const [expressToken, setExpressToken] = useState(null);
	const [isCheckingSession, setIsCheckingSession] = useState(true);

	// PROACTIVE SESSION CHECK - Runs once on mount
	// Use ref to ensure this only runs once
	const sessionCheckedRef = useRef(false);

	useEffect(() => {
		if (sessionCheckedRef.current) return; // Prevent duplicate execution
		sessionCheckedRef.current = true;

		async function checkAndRestoreSession() {
			// console.log('[Auth] 🔍 Checking for existing session...');
			
			try {
				// Step 1: Check localStorage first
				let session = loadSession();
				
				if (session) {
					// console.log('[Auth] ✅ Session found in localStorage');
					setUser(session.user);
					setExpressToken(session.token);
					setIsCheckingSession(false);
					return;
				}
				
				console.log('[Auth] 📦 localStorage empty, checking IndexedDB...');
				
				// Step 2: Try to restore from IndexedDB
				const restored = await restoreSessionFromIndexedDB();
				
				if (restored) {
					// Step 3: After restore, load from localStorage again
					session = loadSession();
					
					if (session) {
						console.log('[Auth] ✅ Session restored from IndexedDB and loaded to state');
						setUser(session.user);
						setExpressToken(session.token);
					} else {
						console.log('[Auth] ⚠️ Restore successful but session invalid/expired');
					}
				} else {
					console.log('[Auth] ℹ️ No session to restore from IndexedDB');
				}
			} catch (error) {
				console.error('[Auth] ❌ Error checking session:', error);
			} finally {
				setIsCheckingSession(false);
				// console.log('[Auth] ✅ Session check complete');
			}
		}
		
		checkAndRestoreSession();
	}, []); // Run only once on mount

	// Activity monitoring - just for tracking, NO EXPIRY CHECK
	// BACKUP on EVERY user interaction for maximum reliability
	useEffect(() => {
		if (!user || !expressToken) return;

		// Update activity on user interaction (no backup, just activity update)
		const updateOnActivity = () => {
			updateActivity();
			// Backup is handled by periodic interval only
		};

		// Listen to user activity events
		const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
		events.forEach(event => {
			window.addEventListener(event, updateOnActivity, { passive: true });
		});

		// Periodic backup (every 5 minutes - reduced from 30 seconds)
		const backupInterval = setInterval(() => {
			console.log('[Auth] ⏰ Periodic backup triggered');
			backupSessionToIndexedDB();
		}, 5 * 60 * 1000); // 5 minutes

		return () => {
			events.forEach(event => {
				window.removeEventListener(event, updateOnActivity);
			});
			clearInterval(backupInterval);
		};
	}, [user, expressToken]);

	// Update activity on visibility change (when user returns to app)
	// This serves as a fallback to check session when app becomes visible again
	useEffect(() => {
		if (!user || !expressToken) return; // Only run if logged in
		
		const handleVisibilityChange = async () => {
			if (document.visibilityState === 'visible') {
				console.log('[Auth] 👁️ App became visible, verifying session...');
				
				// Check localStorage first
				let session = loadSession();
				
				if (!session) {
					// If localStorage empty, try restore from IndexedDB
					console.log('[Auth] � Session missing, attempting restore from IndexedDB...');
					const restored = await restoreSessionFromIndexedDB();
					
					if (restored) {
						session = loadSession();
						if (session) {
							setUser(session.user);
							setExpressToken(session.token);
							console.log('[Auth] ✅ Session restored on visibility change');
							return;
						}
					}
					
					// Session truly lost, logout
					console.log('[Auth] ⚠️ Session lost, logging out...');
					logout();
				} else {
					// Session valid, just update activity
					updateActivity();
					console.log('[Auth] ✅ Session verified, activity updated');
				}
			}
		};

		document.addEventListener('visibilitychange', handleVisibilityChange);
		return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
	}, [user, expressToken]);

	// Fungsi untuk menyimpan data saat login (Express-only)
	// ASYNC to wait for session backup to complete
	// NO EXPIRY - session is permanent until manual logout
	const login = async (userData, _deprecated = null, expressAuthToken = null) => {
		console.log('[Auth] 🔐 Logging in user...');
		
		// Set state first for immediate UI update
		setUser(userData);
		setExpressToken(expressAuthToken);
		
		// WAIT for session to be saved AND backed up to IndexedDB
		const backed = await saveSession(userData, expressAuthToken);
		
		if (backed) {
			console.log('[Auth] ✅ User logged in successfully, session backed up (PERMANENT - no expiry)');
			
			// EXTRA DELAY to ensure IndexedDB transaction fully committed
			await new Promise(resolve => setTimeout(resolve, 500));
			console.log('[Auth] 🔒 Backup guaranteed committed');
			
			// FORCE another backup as safety measure
			await backupSessionToIndexedDB();
			console.log('[Auth] 🔒 Safety backup completed');
		} else {
			console.log('[Auth] ⚠️ User logged in but backup failed - session may not persist!');
		}
	};

	// Fungsi untuk menghapus data saat logout
	const logout = async () => {
		clearSession();
		// Also clear IndexedDB backup
		await clearAllSessionData();
		setUser(null);
		setExpressToken(null);
		console.log('[Auth] User logged out, all session data cleared');
	};

	// Role helper functions
	// Memeriksa apakah user adalah superadmin
	const isSuperAdmin = () => {
		return user?.role === "superadmin";
	};

	// Memeriksa apakah user adalah admin bidang pemberdayaan masyarakat
	// (kepala_bidang atau pegawai dengan bidang_id === 5)
	const isAdminBidang = () => {
		if (!user) return false;
		
		// Bidang Pemberdayaan Masyarakat memiliki bidang_id = 5
		const isPMDBidang = user.bidang_id === 5;
		
		return (
			(user.role === "kepala_bidang" && isPMDBidang) ||
			(user.role === "pegawai" && isPMDBidang)
		);
	};

	// Memeriksa apakah user adalah user desa
	const isUserDesa = () => {
		return user?.role === "desa";
	};

	// Memeriksa apakah user memiliki akses admin untuk kelembagaan
	// (superadmin atau admin bidang)
	const isKelembagaanAdmin = () => {
		return isSuperAdmin() || isAdminBidang();
	};

	// Memeriksa apakah user dapat mengelola kelembagaan
	// (superadmin, admin bidang, atau user desa)
	const canManageKelembagaan = () => {
		return isSuperAdmin() || isAdminBidang() || isUserDesa();
	};

	// Nilai yang akan dibagikan ke semua komponen
	const value = {
		user,
		token: expressToken, // Alias for compatibility
		expressToken,
		login,
		logout,
		updateActivity, // Expose for manual updates if needed
		isCheckingSession, // Expose loading state
		// Role helpers
		isSuperAdmin,
		isAdminBidang,
		isUserDesa,
		isKelembagaanAdmin,
		canManageKelembagaan,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 3. Membuat Custom Hook (useAuth)
// Ini adalah "jalan pintas" untuk menggunakan context
export const useAuth = () => {
	return useContext(AuthContext);
};
