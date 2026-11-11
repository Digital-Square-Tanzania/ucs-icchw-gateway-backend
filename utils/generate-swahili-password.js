/*
  @author: Kizito Mrema
  @date: 2026-11-11
  @description: This file is used to generate a password using Swahili words and a random number
  @usage:
    const password = GenerateSwahiliPassword.generate();
    console.log(password); 
*/
import dotenv from "dotenv";
dotenv.config();

class GenerateSwahiliPassword {
  /**
   * Generates a 3-component password combining phonetically accurate,
   * procedurally generated Swahili words with a cryptographically secure tail.
   */
  static generate() {
    // 1. Swahili Phoneme Sets (Consonants, Digraphs, Blends, Vowels)
    const SIMPLE_C = ["b", "d", "f", "g", "h", "j", "k", "l", "m", "n", "p", "r", "s", "t", "v", "w", "y", "z"];
    const DIGRAPHS = ["ch", "sh", "th", "dh", "gh", "kw", "mw", "bw", "pw"];
    const NASAL_BLENDS = ["mb", "nd", "nj", "ng", "ny", "nz"];
    const VOWELS = ["a", "e", "i", "o", "u"];

    // Combine consonant distributions (weighting single consonants higher for natural flow)
    const ONSETS = [...SIMPLE_C, ...SIMPLE_C, ...DIGRAPHS, ...NASAL_BLENDS];

    // 2. Cryptographically secure random helper (0 to max-1)
    const getRandomInt = (max) => {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      return array[0] % max;
    };

    const pick = (arr) => arr[getRandomInt(arr.length)];

    /**
     * Synthesizes a phonetically legal Swahili root.
     * Pattern: (Vowel/Onset + Vowel) repeating for `syllableCount` cycles.
     */
    const generateWord = (minSyllables = 2, maxSyllables = 3) => {
      const count = minSyllables + getRandomInt(maxSyllables - minSyllables + 1);
      let word = "";

      // 15% chance of starting with a pure vowel (e.g., "Amani", "Elimu")
      let allowVowelStart = getRandomInt(100) < 15;

      for (let i = 0; i < count; i++) {
        if (i === 0 && allowVowelStart) {
          word += pick(VOWELS);
        } else {
          word += pick(ONSETS) + pick(VOWELS);
        }
      }

      // TitleCase formatting
      return word.charAt(0).toUpperCase() + word.slice(1);
    };

    // 3. Generate password parts
    const word1 = generateWord(2, 3); // e.g., "Njiwa", "Chiumba"
    const word2 = generateWord(2, 3); // e.g., "Kamba", "Shikoro"

    // 4. Secure 3-digit number (100–999) using modulo offset
    const number = 100 + getRandomInt(900);

    return `${word1}${word2}${number}`;
  }
}

export default GenerateSwahiliPassword;
