-- 单用户：在 migrate 脚本中会用 MIRRORLY_USER_ID 替换占位符
-- 此文件由 scripts/migrate.ts 在应用时注入实际 user id / email / nickname

INSERT INTO users (id, email, nickname)
VALUES ('__USER_ID__', '__USER_EMAIL__', '__USER_NICKNAME__')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  nickname = EXCLUDED.nickname;
