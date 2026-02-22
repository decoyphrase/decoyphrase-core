export const UPPERCASE_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
export const LOWERCASE_LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");
export const NUMBERS = "0123456789".split("");
export const SPECIAL_CHARACTERS = "`~!@#$%^&*()-_=+\\|]}[{'\":/?.,><".split("");

export const ALL_CHARACTERS = [
  ...UPPERCASE_LETTERS,
  ...LOWERCASE_LETTERS,
  ...NUMBERS,
  ...SPECIAL_CHARACTERS,
];

export const CHARACTER_CATEGORIES = {
  uppercase: UPPERCASE_LETTERS,
  lowercase: LOWERCASE_LETTERS,
  numbers: NUMBERS,
  special: SPECIAL_CHARACTERS,
};

export const getCharacterCategory = (char: string): string => {
  if (UPPERCASE_LETTERS.includes(char)) return "Uppercase";
  if (LOWERCASE_LETTERS.includes(char)) return "Lowercase";
  if (NUMBERS.includes(char)) return "Number";
  if (SPECIAL_CHARACTERS.includes(char)) return "Special";
  return "Unknown";
};

export const createEmptyMapping = (): Record<string, string> => {
  const mapping: Record<string, string> = {};
  ALL_CHARACTERS.forEach((char) => {
    mapping[char] = "";
  });
  return mapping;
};

export const getUsedCharacters = (
  mapping: Record<string, string>,
): string[] => {
  return Object.values(mapping).filter((val) => val !== "");
};

export const getAvailableCharacters = (
  mapping: Record<string, string>,
): string[] => {
  const used = new Set(getUsedCharacters(mapping));
  return ALL_CHARACTERS.filter((char) => !used.has(char));
};

export const validateMapping = (
  mapping: Record<string, string>,
): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  const usedValues = new Set<string>();
  const duplicates = new Set<string>();

  Object.entries(mapping).forEach(([, value]) => {
    if (value !== "") {
      if (usedValues.has(value)) {
        duplicates.add(value);
      }
      usedValues.add(value);
    }
  });

  if (duplicates.size > 0) {
    errors.push(
      `Duplicate mappings found: ${Array.from(duplicates).join(", ")}`,
    );
  }

  const mappedCount = Object.values(mapping).filter((v) => v !== "").length;
  if (mappedCount === 0) {
    errors.push("No character mappings defined");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const serializeMappingForTurbo = (
  mapping: Record<string, string>,
): string => {
  return JSON.stringify(mapping);
};

export const deserializeMappingFromTurbo = (
  serialized: string,
): Record<string, string> => {
  try {
    const parsed = JSON.parse(serialized) as Record<string, string>;
    return parsed;
  } catch {
    return {};
  }
};
