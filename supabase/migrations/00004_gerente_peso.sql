ALTER TABLE supermercados ADD COLUMN gerente_id UUID REFERENCES perfiles(id);

ALTER TABLE supermercado_areas ADD COLUMN peso DECIMAL(5,2) NOT NULL DEFAULT 10 CHECK (peso > 0);

UPDATE supermercado_areas SET peso = 10 WHERE peso IS NULL;
