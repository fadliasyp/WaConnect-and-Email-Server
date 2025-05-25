const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',         
  host: 'localhost',        
  database: 'postgres',  
  password: '',  
  port: 5432,               
});

const { v4: uuidv4 } = require('uuid');
async function insertConversation(id, channel_id, user_id, username, last_message, read_status, last_date, session_id, status) {
  const query = `
    INSERT INTO chat.conversations
    (id, channel_id, user_id, username, last_message, read_status, last_date, session_id, status, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
    RETURNING *;
  `;
  const parsedLastDate = (last_date && !isNaN(Date.parse(last_date))) ? last_date : null;

  const values = [id, channel_id, user_id, username, last_message, read_status, parsedLastDate, session_id, status];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (err) {
    console.error('Error inserting conversation:', err);
    throw err;
  }
}

async function getUnreadUserMessagesByEmail(userEmail) {
  const sql = `SELECT * FROM chat_messages WHERE sender_email = ? AND read_status = 'unread'`;
  const [rows] = await pool.query(sql, [userEmail]);
  return rows;
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

async function updateConversation(id, last_message, read_status, last_date, status) {
  const query = `
    UPDATE chat.conversations
    SET last_message = $1, read_status = $2, last_date = $3, status = $4, updated_at = NOW()
    WHERE id = $5
    RETURNING *;
  `;
  const values = [last_message, read_status, last_date, status, id];

  try {
    const result = await pool.query(query, values);
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

async function getAllMessages() {
  const query = `SELECT * FROM chat.messages ORDER BY created_at ASC`;
  const result = await pool.query(query);
  return result.rows;
}

async function getMessagesByConversationId(conversationId) {
  const query = `SELECT * FROM chat.messages WHERE conversation_id = $1 ORDER BY created_at ASC`;
  const result = await pool.query(query, [conversationId]);
  return result.rows; 
}

async function insertMessage(conversation_id, sender_type, content, read_status) {
  const id = uuidv4();
  const query = `
  INSERT INTO chat.messages (
    id, conversation_id, sender_type, content, read_status, sent_at, created_at, updated_at
  )
  VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW())
  RETURNING *;
`;
  const values = [id, conversation_id, sender_type, content, read_status];
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function markUserMessagesAsRead(conversation_id) {
  const query = `
    UPDATE chat.messages
    SET read_status = 'read', updated_at = NOW()
    WHERE conversation_id = $1 AND sender_type = 'user' AND read_status = 'unread'
  `;
  try {
    await pool.query(query, [conversation_id]);
  } catch (err) {
    console.error('Error marking user messages as read:', err);
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
  getAllMessages,
  getMessagesByConversationId,
  insertMessage,
  markUserMessagesAsRead,
  getUnreadUserMessagesByEmail,
};