-- Local-only fixtures. Never run against a remote database.
INSERT OR IGNORE INTO users(external_user_id,email,display_name,role,status) VALUES ('local-schedule-test-admin','schedule-test-admin@example.invalid','Local schedule test','ADMIN','ACTIVE');
INSERT OR IGNORE INTO users(external_user_id,email,display_name,role,status) VALUES ('local-schedule-test-member','schedule-test-member@example.invalid','Local member test','MEMBER','ACTIVE');
INSERT OR REPLACE INTO user_sessions(token,user_id,expires_at) SELECT 'local-schedule-test-admin-session',id,'2099-01-01' FROM users WHERE external_user_id='local-schedule-test-admin';
INSERT OR REPLACE INTO user_sessions(token,user_id,expires_at) SELECT 'local-schedule-test-member-session',id,'2099-01-01' FROM users WHERE external_user_id='local-schedule-test-member';
