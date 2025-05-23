import fs from "fs";
import csv from "csv-parser";

export class CsvProcessor {
  static async readCsv(filePath) {
    const rows = [];

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (row) => {
          // Add your custom row processing here
          console.log("Row:", row);
          rows.push(row);
        })
        .on("end", () => {
          console.log(`Finished processing ${rows.length} rows.`);
          resolve(rows);
        })
        .on("error", (err) => {
          console.error("Error reading file:", err);
          reject(err);
        });
    });
  }
}
