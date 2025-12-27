// test-superadmin-route.js
// Script untuk test apakah route superadmin terdaftar dengan benar

const testSuperadminRoute = () => {
  console.log('=== Testing Superadmin Route Configuration ===\n');
  
  // Test 1: Check if running on correct port
  console.log('1. Current URL:', window.location.href);
  console.log('   Expected: http://localhost:5173 or http://localhost:5174\n');
  
  // Test 2: Check localStorage for user
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('expressToken');
  
  console.log('2. User Data:');
  console.log('   - Nama:', user.nama || 'N/A');
  console.log('   - Email:', user.email || 'N/A');
  console.log('   - Role:', user.role || 'N/A');
  console.log('   - Token exists:', !!token, '\n');
  
  // Test 3: Check if role is exactly 'superadmin'
  if (user.role) {
    const roleMatch = user.role === 'superadmin';
    console.log('3. Role Check:');
    console.log('   - Current role:', `"${user.role}"`);
    console.log('   - Expected role:', '"superadmin"');
    console.log('   - Match:', roleMatch ? '✅ YES' : '❌ NO');
    console.log('   - Role length:', user.role.length, 'chars');
    console.log('   - Has whitespace:', user.role !== user.role.trim() ? '⚠️ YES' : '✅ NO');
    console.log('');
  }
  
  // Test 4: Try to navigate to superadmin dashboard
  console.log('4. Navigation Test:');
  console.log('   Will attempt to navigate to: /superadmin/dashboard');
  console.log('   Current path:', window.location.pathname);
  
  if (user.role === 'superadmin' && token) {
    console.log('   Status: ✅ Credentials valid, navigating...\n');
    
    // Give time to see logs
    setTimeout(() => {
      window.location.href = '/superadmin/dashboard';
    }, 2000);
  } else {
    console.log('   Status: ❌ Cannot navigate - invalid credentials\n');
  }
  
  // Test 5: Check React Router routes (if available)
  console.log('5. React Router Check:');
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('   React DevTools detected ✅');
  } else {
    console.log('   React DevTools not found ⚠️');
  }
  
  console.log('\n=== Test Complete ===');
  console.log('If navigation fails, check:');
  console.log('1. Role in database is exactly "superadmin" (case-sensitive)');
  console.log('2. Route /superadmin exists in App.jsx');
  console.log('3. RoleProtectedRoute allows "superadmin" role');
  console.log('4. SuperadminLayout.jsx has <Outlet /> component');
};

// Auto-run if script is loaded
if (typeof window !== 'undefined') {
  testSuperadminRoute();
}

// Make available globally
window.testSuperadminRoute = testSuperadminRoute;

console.log('💡 Tip: Run testSuperadminRoute() anytime to re-test');
