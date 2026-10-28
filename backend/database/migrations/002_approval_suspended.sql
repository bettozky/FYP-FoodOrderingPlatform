-- Merchants can also be SUSPENDED by an admin (the apps show this state).
ALTER TYPE approval_status ADD VALUE IF NOT EXISTS 'SUSPENDED';
