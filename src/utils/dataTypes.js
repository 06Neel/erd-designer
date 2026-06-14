export const DATA_TYPES = {
  Numeric: [
    'INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT', 'DECIMAL(10,2)', 'NUMERIC(10,2)',
    'FLOAT', 'DOUBLE', 'REAL', 'BOOLEAN',
  ],
  Text: [
    'VARCHAR(255)', 'VARCHAR(100)', 'VARCHAR(50)', 'TEXT', 'CHAR(1)', 'CHAR(10)', 'CLOB',
  ],
  'Date/Time': [
    'DATE', 'TIME', 'TIMESTAMP', 'DATETIME', 'INTERVAL',
  ],
  Binary: [
    'BLOB', 'BYTEA', 'BINARY(255)', 'VARBINARY(255)',
  ],
  JSON: [
    'JSON', 'JSONB',
  ],
  UUID: [
    'UUID', 'UNIQUEIDENTIFIER',
  ],
  Other: [
    'ENUM', 'ARRAY', 'GEOMETRY', 'XML',
  ],
};

export const ALL_TYPES = Object.values(DATA_TYPES).flat();

// Types that are dialect-specific
export const DIALECT_SPECIFIC = {
  JSONB: ['postgresql'],
  SERIAL: ['postgresql'],
  BIGSERIAL: ['postgresql'],
  BYTEA: ['postgresql'],
  ARRAY: ['postgresql'],
  UNIQUEIDENTIFIER: ['mssql'],
  NVARCHAR: ['mssql'],
  DATETIME2: ['mssql'],
  AUTOINCREMENT: ['sqlite'],
  AUTO_INCREMENT: ['mysql'],
};

export function getTypeWarning(type, dialect) {
  const upperType = type?.toUpperCase() || '';
  for (const [t, dialects] of Object.entries(DIALECT_SPECIFIC)) {
    if (upperType.includes(t) && !dialects.includes(dialect)) {
      return `${t} is specific to ${dialects.join(', ')}`;
    }
  }
  return null;
}

export const TYPE_MAPPINGS = {
  postgresql: {
    AUTO_INCREMENT: 'SERIAL',
    BOOLEAN: 'BOOLEAN',
    TEXT: 'TEXT',
    TIMESTAMP: 'TIMESTAMP',
    BLOB: 'BYTEA',
    DOUBLE: 'DOUBLE PRECISION',
  },
  mysql: {
    SERIAL: 'INT AUTO_INCREMENT',
    BOOLEAN: 'TINYINT(1)',
    TEXT: 'TEXT',
    TIMESTAMP: 'TIMESTAMP',
    BYTEA: 'BLOB',
  },
  sqlite: {
    SERIAL: 'INTEGER',
    BOOLEAN: 'INTEGER',
    VARCHAR: 'TEXT',
    TIMESTAMP: 'TEXT',
    DECIMAL: 'REAL',
  },
  mssql: {
    SERIAL: 'INT IDENTITY(1,1)',
    BOOLEAN: 'BIT',
    TEXT: 'NVARCHAR(MAX)',
    TIMESTAMP: 'DATETIME2',
    BYTEA: 'VARBINARY(MAX)',
    DOUBLE: 'FLOAT',
  },
};
