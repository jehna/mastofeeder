--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------

CREATE TABLE followers (
  id        INTEGER PRIMARY KEY,
  hostname  TEXT    NOT NULL,
  follower  TEXT    NOT NULL,
  CONSTRAINT followers_hostname_follower_key UNIQUE (hostname, follower)
);

CREATE UNIQUE INDEX followers_hostname_key ON followers (hostname);

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

DROP INDEX followers_hostname_key;
DROP TABLE followers;