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
          const cleanedRow = {};
          let hasValue = false;

          for (const key in row) {
            const cleanKey = key.trim().toLowerCase().replace(/\s+/g, "_");
            const cleanValue = typeof row[key] === "string" ? row[key].trim() : row[key];

            if (cleanValue !== "") {
              hasValue = true;
            }

            cleanedRow[cleanKey] = cleanValue;
          }

          // Only add row if at least one value is not empty
          if (hasValue) {
            rows.push(cleanedRow);
          }
        })
        .on("end", () => resolve(rows))
        .on("error", reject);
    });
  }
}
