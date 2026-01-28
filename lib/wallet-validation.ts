// BIP39 English wordlist (first 100 words for validation)
const BIP39_WORDS = [
  "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract", "absurd", "abuse",
  "access", "accident", "account", "accuse", "achieve", "acid", "acoustic", "acquire", "across", "act",
  "action", "actor", "actual", "adapt", "add", "addict", "address", "adjust", "admit", "adult",
  "advance", "advice", "aerobic", "affair", "afford", "afraid", "again", "age", "agent", "agree",
  "ahead", "aim", "air", "airport", "aisle", "alarm", "album", "alcohol", "alert", "alien",
  "all", "alley", "allow", "almost", "alone", "alpha", "already", "also", "alter", "always",
  "amateur", "amazing", "among", "amount", "amused", "analyst", "anchor", "ancient", "anger", "angle",
  "angry", "animal", "ankle", "announce", "annual", "another", "answer", "antenna", "antique", "anxiety",
  "any", "apart", "apology", "appear", "apple", "approve", "april", "area", "arena", "argue",
  "arm", "armed", "armor", "army", "around", "arrange", "arrest", "arrive", "arrow", "art"
]

// Extended wordlist check (simplified - in production use full BIP39 wordlist)
const isValidBIP39Word = (word: string): boolean => {
  const normalizedWord = word.toLowerCase().trim()
  // Check against common BIP39 words
  return BIP39_WORDS.includes(normalizedWord) || 
         normalizedWord.length >= 3 && normalizedWord.length <= 8
}

export const validateSeedPhrase = (words: string[]): { valid: boolean; error?: string } => {
  // Check if all 12 words are provided
  if (words.length !== 12) {
    return { valid: false, error: "Seed phrase must contain exactly 12 words" }
  }

  // Check if all words are filled
  const emptyWords = words.filter(word => !word || word.trim() === "")
  if (emptyWords.length > 0) {
    return { valid: false, error: "All seed phrase words must be filled" }
  }

  // Check if words are valid (basic validation)
  const invalidWords: number[] = []
  words.forEach((word, index) => {
    const normalizedWord = word.toLowerCase().trim()
    // Basic validation: word should be 3-8 characters and contain only letters
    if (!/^[a-z]+$/.test(normalizedWord) || normalizedWord.length < 3 || normalizedWord.length > 8) {
      invalidWords.push(index + 1)
    }
  })

  if (invalidWords.length > 0) {
    return { 
      valid: false, 
      error: `Invalid words at positions: ${invalidWords.join(", ")}` 
    }
  }

  // Check for duplicate words (seed phrases can have duplicates, but too many might indicate spam)
  const uniqueWords = new Set(words.map(w => w.toLowerCase().trim()))
  if (uniqueWords.size < 6) {
    return { valid: false, error: "Seed phrase appears to be invalid (too many duplicate words)" }
  }

  // Check for common spam patterns (all same word, sequential numbers, etc.)
  const normalizedWords = words.map(w => w.toLowerCase().trim())
  const allSame = normalizedWords.every(w => w === normalizedWords[0])
  if (allSame && normalizedWords.length > 1) {
    return { valid: false, error: "Seed phrase appears to be invalid" }
  }

  // Check for sequential patterns (like word1, word2, word3...)
  const hasSequentialPattern = normalizedWords.some((word, index) => {
    if (index === 0) return false
    const prevWord = normalizedWords[index - 1]
    // Check if words are sequential numbers or similar patterns
    return /^\d+$/.test(word) && /^\d+$/.test(prevWord) && 
           parseInt(word) === parseInt(prevWord) + 1
  })
  if (hasSequentialPattern) {
    return { valid: false, error: "Seed phrase appears to be invalid" }
  }

  return { valid: true }
}

export const validatePrivateKey = (privateKey: string): { valid: boolean; error?: string } => {
  // Remove whitespace
  const cleanedKey = privateKey.trim().replace(/\s+/g, "")

  // Check if empty
  if (!cleanedKey) {
    return { valid: false, error: "Private key cannot be empty" }
  }

  // Check length (Ethereum private keys are 64 hex characters, with or without 0x prefix)
  const hexKey = cleanedKey.startsWith("0x") ? cleanedKey.slice(2) : cleanedKey
  
  if (hexKey.length !== 64) {
    return { valid: false, error: "Private key must be 64 hexadecimal characters" }
  }

  // Check if it's valid hexadecimal
  if (!/^[0-9a-fA-F]{64}$/.test(hexKey)) {
    return { valid: false, error: "Private key must contain only hexadecimal characters (0-9, a-f, A-F)" }
  }

  // Check for common invalid patterns (all zeros, all ones, etc.)
  if (/^0+$/.test(hexKey) || /^f+$/i.test(hexKey)) {
    return { valid: false, error: "Private key appears to be invalid" }
  }

  return { valid: true }
}

