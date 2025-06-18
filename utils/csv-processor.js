import { Readable } from "stream";
import csv from "csv-parser";

export class CsvProcessor {
  static async readCsvFromBuffer(buffer) {
    const rows = [];
    const stream = Readable.from(buffer); // 🔥 No fs.createReadStream here

    return new Promise((resolve, reject) => {
      stream
        .pipe(csv({ skipEmptyLines: true, trim: true }))
        .on("data", (row) => {
          const cleanedRow = {};
          for (const key in row) {
            const cleanKey = key.trim().toLowerCase().replace(/\s+/g, "_");
            cleanedRow[cleanKey] = typeof row[key] === "string" ? row[key].trim() : row[key];
          }
          rows.push(cleanedRow);
        })
        .on("end", () => resolve(rows))
        .on("error", reject);
    });
  }
}
