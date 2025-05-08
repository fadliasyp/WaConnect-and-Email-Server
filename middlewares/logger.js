const pool = require('../config/db');

async function logEntry(type, description, user_id = 'unknown', ip_address = 'unknown', metadata = {}) {
  const timestamp = new Date();

  // Simpan ke Log_Entry
  const result = await pool.query(
    'INSERT INTO Log_Entry (timestamp, level, code_ref, message) VALUES ($1, $2, $3, $4) RETURNING id',
    [timestamp, 'INFO', type, description]
  );

  const logId = result.rows[0].id;

  // Simpan metadata standar
  await pool.query(
    'INSERT INTO Log_Metadata (logId, key, value) VALUES ($1, $2, $3), ($1, $4, $5)',
    [logId, 'user_id', user_id, 'ip_address', ip_address]
  );

  // Simpan metadata tambahan jika ada
  for (const key in metadata) {
    await pool.query(
      'INSERT INTO Log_Metadata (logId, key, value) VALUES ($1, $2, $3)',
      [logId, key, String(metadata[key])]
    );
  }
}

module.exports = logEntry;
