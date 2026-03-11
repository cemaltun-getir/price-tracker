@@ -1,30 +1,60 @@
-import React, { useState } from 'react';
-
-function Login({ onLogin }) {
-  const [username, setUsername] = useState('');
-  const [password, setPassword] = useState('');
-  const [error, setError] = useState(null);
-
-  const handleSubmit = async (e) => {
-    e.preventDefault();
-    setError(null);
-    try {
-      const res = await fetch('/login', {
-        method: 'POST',
-        headers: { 'Content-Type': 'application/json' },
-        body: JSON.stringify({ username, password }),
-      });
-      const data = await res.json();
-      if (!res.ok) {
-        setError(data.error || 'Login failed');
-      } else {
-        onLogin();
-      }
-    } catch (err) {
-      setError('Network error');
-    }
-  };
-
-  return (
-    <form onSubmit={handleSubmit}>
-      <input
-        type="text"
-        value={username}
-        onChange={(e) => setUsername(e.target.value)}
-        placeholder="Username"
-        required
-      />
-      <input
-        type="password"
-        value={password}
-        onChange={(e) => setPassword(e.target.value)}
-        placeholder="Password"
-        required
-      />
-      <button type="submit">Login</button>
-      {error && <p className="error">{error}</p>}
-    </form>
-  );
-}
-
-export default Login;
+import React, { useState, useEffect } from 'react';
+
+function Login({ onLogin }) {
+  const [username, setUsername] = useState('');
+  const [password, setPassword] = useState('');
+  const [error, setError] = useState(null);
+  const [csrfToken, setCsrfToken] = useState('');
+
+  // Fetch CSRF token on mount
+  useEffect(() => {
+    fetch('/csrf-token', { credentials: 'include' })
+      .then(res => res.json())
+      .then(data => setCsrfToken(data.csrfToken))
+      .catch(() => setError('Failed to get CSRF token'));
+  }, []);
+
+  const handleSubmit = async (e) => {
+    e.preventDefault();
+    setError(null);
+    try {
+      const res = await fetch('/login', {
+        method: 'POST',
+        headers: {
+          'Content-Type': 'application/json',
+          'CSRF-Token': csrfToken,
+        },
+        credentials: 'include',
+        body: JSON.stringify({ username, password }),
+      });
+      const data = await res.json();
+      if (!res.ok) {
+        setError(data.error || 'Login failed');
+      } else {
+        onLogin();
+      }
+    } catch (err) {
+      setError('Network error');
+    }
+  };
+
+  return (
+    <form onSubmit={handleSubmit}>
+      <input
+        type="text"
+        value={username}
+        onChange={(e) => setUsername(e.target.value)}
+        placeholder="Username"
+        required
+        autoComplete="username"
+      />
+      <input
+        type="password"
+        value={password}
+        onChange={(e) => setPassword(e.target.value)}
+        placeholder="Password"
+        required
+        autoComplete="current-password"
+      />
+      <button type="submit">Login</button>
+      {error && <p className="error" role="alert">{error}</p>}
+    </form>
+  );
+}
+
+export default Login;
