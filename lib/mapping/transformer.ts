export const transformPasswordToDecoy = (
  password: string,
  mapping: Record<string, string>,
): string => {
  return password
    .split("")
    .map((char) => mapping[char] || char)
    .join("");
};

export const transformDecoyToPassword = (
  decoy: string,
  mapping: Record<string, string>,
): string => {
  const reverseMapping: Record<string, string> = {};
  Object.entries(mapping).forEach(([key, value]) => {
    if (value) {
      reverseMapping[value] = key;
    }
  });

  return decoy
    .split("")
    .map((char) => reverseMapping[char] || char)
    .join("");
};

export const analyzePassword = (
  password: string,
): {
  length: number;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumbers: boolean;
  hasSpecial: boolean;
  uniqueChars: number;
  charFrequency: Record<string, number>;
} => {
  const charFrequency: Record<string, number> = {};
  const uniqueChars = new Set<string>();

  let hasUppercase = false;
  let hasLowercase = false;
  let hasNumbers = false;
  let hasSpecial = false;

  password.split("").forEach((char) => {
    uniqueChars.add(char);
    charFrequency[char] = (charFrequency[char] || 0) + 1;

    if (/[A-Z]/.test(char)) hasUppercase = true;
    if (/[a-z]/.test(char)) hasLowercase = true;
    if (/[0-9]/.test(char)) hasNumbers = true;
    if (/[^A-Za-z0-9]/.test(char)) hasSpecial = true;
  });

  return {
    length: password.length,
    hasUppercase,
    hasLowercase,
    hasNumbers,
    hasSpecial,
    uniqueChars: uniqueChars.size,
    charFrequency,
  };
};

export const generateMappingSuggestion = (
  password: string,
): Record<string, string> => {
  const uniqueChars = Array.from(new Set(password.split("")));
  const suggestion: Record<string, string> = {};

  const availableChars = "0123456789".split("");
  let index = 0;

  uniqueChars.forEach((char) => {
    if (index < availableChars.length) {
      suggestion[char] = availableChars[index];
      index++;
    }
  });

  return suggestion;
};

export const calculateMappingCoverage = (
  password: string,
  mapping: Record<string, string>,
): {
  totalChars: number;
  mappedChars: number;
  unmappedChars: string[];
  coverage: number;
} => {
  const passwordChars = password.split("");
  const uniqueChars = Array.from(new Set(passwordChars));
  const unmappedChars: string[] = [];

  let mappedCount = 0;

  uniqueChars.forEach((char) => {
    if (mapping[char] && mapping[char] !== "") {
      mappedCount++;
    } else {
      unmappedChars.push(char);
    }
  });

  return {
    totalChars: uniqueChars.length,
    mappedChars: mappedCount,
    unmappedChars,
    coverage:
      uniqueChars.length > 0 ? (mappedCount / uniqueChars.length) * 100 : 0,
  };
};

export const validateTransformedPassword = (
  original: string,
  decoy: string,
  mapping: Record<string, string>,
): boolean => {
  const transformed = transformPasswordToDecoy(original, mapping);
  return transformed === decoy;
};

export const validateReverseTransform = (
  decoy: string,
  original: string,
  mapping: Record<string, string>,
): boolean => {
  const reversed = transformDecoyToPassword(decoy, mapping);
  return reversed === original;
};
