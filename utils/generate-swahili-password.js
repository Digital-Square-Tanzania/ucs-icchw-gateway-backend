import dotenv from "dotenv";
dotenv.config();

/*
 * Generate a password using Swahili words and a random number
 * The password consists of two Swahili words and a 3-digit number
 * Example: "JamboHabari123"
 */
class GenerateSwahiliPassword {
  /*
   * Swahili password generator
   */
  static generate() {
    const rawWords = process.env.SWAHILI_WORDS || "";
    const swahiliWords = rawWords
      .split(",")
      .map((w) => w.trim())
      .filter(Boolean);

    const getRandomWord = () => {
      const word = swahiliWords[Math.floor(Math.random() * swahiliWords.length)];
      return word.charAt(0).toUpperCase() + word.slice(1);
    };

    const word1 = getRandomWord();
    const word2 = getRandomWord();
    const number = Math.floor(100 + Math.random() * 900); // 3-digit number

    return `${word1}${word2}${number}`;
  }
}

export default GenerateSwahiliPassword;
