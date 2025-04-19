/**
 * Cleans AI framing language from responses to ensure they stay in character
 * @param {string} response - The raw response from the AI
 * @param {string} characterName - The character's name
 * @returns {string} Cleaned response
 */
export function cleanRoleplayResponse(response, characterName) {
  if (!response) return '';
  
  // Remove common out-of-character prefixes
  let cleaned = response
    .replace(/^As [^,]+,\s*/i, '')
    .replace(/^In my role as [^,]+,\s*/i, '')
    .replace(/^Playing the role of [^,]+,\s*/i, '')
    .replace(/^As an AI playing [^,]+,\s*/i, '')
    .replace(new RegExp(`^${characterName}:\\s*`, 'i'), '');
  
  // Remove meta-commentary about the character
  cleaned = cleaned
    .replace(/I would respond as follows:\s*/i, '')
    .replace(/Here's how I would respond:\s*/i, '')
    .replace(/Here is my response:\s*/i, '');
  
  return cleaned.trim();
} 