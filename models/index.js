const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',         
  host: 'localhost',        
  database: 'boilerplate',  
  password: 'Megumine14_',  
  port: 5432,               
});

async function insertConversation(user_id, message, session_id) {
  const query = `
    INSERT INTO chat.conversations (user_id, message, session_id, created_at, updated_at)
    VALUES ($1, $2, $3, NOW(), NOW())
    RETURNING *;
  `;
  const values = [user_id, message, session_id];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (err) {
    console.error('Error inserting conversation:', err);
    throw err;
  }
}

async function getAllConversations() {
  try {
    const result = await pool.query('SELECT * FROM chat.conversations ORDER BY id DESC');
    return result.rows;
  } catch (err) {
    console.error('Error fetching conversations:', err);
    throw err;
  }
}

async function getConversationById(id) {
  try {
    const result = await pool.query('SELECT * FROM chat.conversations WHERE id = $1', [id]);
    return result.rows[0];
  } catch (err) {
    console.error('Error fetching conversation:', err);
    throw err;
  }
}

async function updateConversation(id, message) {
  const query = `
    UPDATE chat.conversations
    SET message = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *;
  `;
  try {
    const result = await pool.query(query, [message, id]);
    return result.rows[0];
  } catch (err) {
    console.error('Error updating conversation:', err);
    throw err;
  }
}

async function deleteConversation(id) {
  try {
    const result = await pool.query('DELETE FROM chat.conversations WHERE id = $1 RETURNING *;', [id]);
    return result.rows[0];
  } catch (err) {
    console.error('Error deleting conversation:', err);
    throw err;
  }
}

async function getConversationBySessionId(session_id) {
  const query = `
    SELECT * FROM chat.conversations
    WHERE session_id = $1
    LIMIT 1;
  `;
  try {
    const result = await pool.query(query, [session_id]);
    return result.rows[0]; 
  } catch (err) {
    console.error('Error fetching conversation by session_id:', err);
    throw err;
  }
}

async function insertMessage(conversation_id, sender_type, content) {
  const query = `
    INSERT INTO chat.messages (conversation_id, sender_type, content, sent_at)
    VALUES ($1, $2, $3, NOW())
    RETURNING *;
  `;
  const values = [conversation_id, sender_type, content];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (err) {
    console.error('Error inserting message:', err);
    throw err;
  }
}

module.exports = {
  insertConversation,
  getAllConversations,
  getConversationById,
  updateConversation,
  deleteConversation,
  getConversationBySessionId,
  insertMessage,  
};
