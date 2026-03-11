@@
-// Placeholder for user lookup
-async function getUserByUsername(username) {
-  // Implement DB lookup here
-  return null;
-}
-
-module.exports = { getUserByUsername };
+const db = require('../db'); // hypothetical DB module
+
+/**
+ * Fetch user by username from DB
+ * @param {string} username
+ * @returns {Promise<{id: string, username: string, passwordHash: string} | null>}
+ */
+async function getUserByUsername(username) {
+  // Use parameterized queries to prevent injection
+  const query = 'SELECT id, username, password_hash as passwordHash FROM users WHERE username = $1';
+  const result = await db.query(query, [username]);
+  if (result.rows.length === 0) return null;
+  return result.rows[0];
+}
+
+module.exports = { getUserByUsername };
