/**
 * Recursively removes void properties (undefined, null, empty strings) from an object
 */
export function cleanVoidProperties(obj: any): any {
  if (obj === null || obj === undefined) {
    return undefined;
  }
  
  if (typeof obj === 'string') {
    return obj === '' ? undefined : obj;
  }
  
  if (Array.isArray(obj)) {
    const cleaned = obj.map(cleanVoidProperties).filter(item => item !== undefined);
    return cleaned.length === 0 ? undefined : cleaned;
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    let hasProperties = false;
    
    for (const [key, value] of Object.entries(obj)) {
      const cleanedValue = cleanVoidProperties(value);
      if (cleanedValue !== undefined) {
        cleaned[key] = cleanedValue;
        hasProperties = true;
      }
    }
    
    return hasProperties ? cleaned : undefined;
  }
  
  return obj;
}
