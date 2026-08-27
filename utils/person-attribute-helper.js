import dotenv from "dotenv";

dotenv.config();

const NIN_UUID = process.env.NIN_ATTRIBUTE_TYPE_UUID;
const EMAIL_UUID = process.env.EMAIL_ATTRIBUTE_TYPE_UUID || "c60b17ba-1c41-454b-89a1-6c329c75417e";
const PHONE_UUID = process.env.PHONE_NUMBER_ATTRIBUTE_TYPE_UUID || "c1aa993d-251b-4295-9e58-4c5d8a73397e";

function normalizeDisplay(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

/**
 * Extract NIN, email, and phone from OpenMRS person attributes using UUIDs
 * with display-name fallbacks (Email, Phone Number, etc.).
 * @param {Array} attributes
 */
export function extractPersonContactAttributes(attributes = []) {
  let nin = null;
  let email = null;
  let phoneNumber = null;

  for (const attr of attributes) {
    if (attr?.voided) continue;
    const value = String(attr?.value || "").trim();
    if (!value) continue;

    const typeUuid = attr.attributeType?.uuid;
    const display = normalizeDisplay(attr.attributeType?.display || attr.display);

    if (typeUuid === NIN_UUID || display === "nin") {
      nin = value;
    } else if (typeUuid === EMAIL_UUID || display === "email") {
      email = value;
    } else if (typeUuid === PHONE_UUID || display === "phonenumber" || display === "phone") {
      phoneNumber = value;
    }
  }

  return { nin, email, phoneNumber };
}

export function genderToSexLabel(gender) {
  if (gender === "M") return "MALE";
  if (gender === "F") return "FEMALE";
  return gender || null;
}
