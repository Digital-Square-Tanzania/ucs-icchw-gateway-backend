class DateFormatter {
  static async formatDateToYMD(date) {
    if (!date || isNaN(new Date(date))) return null;
    const d = new Date(date);
    return d.toISOString().split("T")[0]; // yyyy-mm-dd
  }
}

export default DateFormatter;
