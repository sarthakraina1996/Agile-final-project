CREATE TABLE rate_plans(id TEXT PRIMARY KEY,property_id TEXT NOT NULL REFERENCES properties(id),name TEXT NOT NULL,multiplier INTEGER NOT NULL CHECK(multiplier>0),refundable INTEGER DEFAULT 1,includes_breakfast INTEGER DEFAULT 0);
ALTER TABLE reservations ADD COLUMN rate_plan_id TEXT REFERENCES rate_plans(id);
INSERT INTO rate_plans(id,property_id,name,multiplier,refundable,includes_breakfast) SELECT id||'bar',id,'Best available rate',10000,1,0 FROM properties;
INSERT INTO rate_plans(id,property_id,name,multiplier,refundable,includes_breakfast) SELECT id||'breakfast',id,'Bed & breakfast',11200,1,1 FROM properties;
UPDATE reservations SET rate_plan_id=property_id||'bar';
INSERT INTO schema_migrations(version) VALUES(2);
