import CustomError from "./custom-error.js";

class ExtractDateFromNin {
  /*
   * Extract date from NIN
   */
  static extract(nin) {
    // Ensure NIN is in the expected format
    const match = nin.match(/^(\d{8})-\d{5}-\d{5}-\d{2}$/);
    if (!match) {
      throw new CustomError("Invalid NIN format", 400);
    }

    const birthSegment = match[1]; // "19570716"
    const year = birthSegment.slice(0, 4);
    const month = birthSegment.slice(4, 6);
    const day = birthSegment.slice(6, 8);

    return `${year}-${month}-${day}`;
  }
}

export default ExtractDateFromNin;
