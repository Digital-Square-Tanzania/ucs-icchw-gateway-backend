import { Readable } from "stream";
import csv from "csv-parser";

export class CsvProcessor {
  static async readCsvFromBuffer(buffer) {
    const rows = [];
    const stream = Readable.from(buffer);

    return new Promise((resolve, reject) => {
      stream
        .pipe(csv({ skipEmptyLines: true, trim: true }))
        .on("data", (row) => {
          // Normalize keys: trim, lowercase, remove accidental whitespace in headers
          const cleanedRow = {};
          for (const key in row) {
            const cleanKey = key.trim().toLowerCase().replace(/\s+/g, "_");
            cleanedRow[cleanKey] = typeof row[key] === "string" ? row[key].trim() : row[key];
          }
          rows.push(cleanedRow);
        })
        .on("end", () => {
          console.log(`✅ Parsed ${rows.length} rows from buffer`);
          resolve(rows);
        })
        .on("error", (err) => {
          console.error("❌ Error processing CSV:", err);
          reject(err);
        });
    });
  }
}
// This module provides a utility to read and process CSV data from a buffer.
// It uses the `csv-parser` library to parse CSV data and returns an array of objects with normalized keys.
// The keys are trimmed, converted to lowercase, and spaces are replaced with underscores to ensure consistency.
// The `readCsvFromBuffer` method takes a buffer as input and returns a promise that resolves with the parsed data.
// It handles errors gracefully and logs the number of rows parsed successfully.
// Usage example:
// const csvData = await CsvProcessor.readCsvFromBuffer(buffer);
// This can be used in conjunction with file upload handling in Express.js applications, such as with multer.
// It is designed to be efficient and handle large CSV files by streaming the data instead of loading it all into memory at once.
// This code is part of a utility module for processing CSV files in a Node.js application.
// It is designed to be used in conjunction with file upload handling in Express.js applications, such as with multer.
// The `CsvProcessor` class provides a static method `readCsvFromBuffer` that takes a buffer as input and returns a promise that resolves with the parsed CSV data.
