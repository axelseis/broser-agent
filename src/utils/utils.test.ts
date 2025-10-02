import { describe, it, expect } from 'vitest';
import { cleanVoidProperties } from './utils';

describe('cleanVoidProperties', () => {
  it('should remove null, undefined, and empty string values', () => {
    const input = {
      name: 'John',
      age: null,
      email: undefined,
      address: '',
      active: true
    };
    
    const expected = {
      name: 'John',
      active: true
    };
    
    expect(cleanVoidProperties(input)).toEqual(expected);
  });

  it('should handle nested objects', () => {
    const input = {
      user: {
        name: 'Jane',
        details: {
          age: 25,
          city: '',
          country: null,
          preferences: undefined
        },
        active: true
      },
      settings: {
        theme: 'dark',
        notifications: ''
      }
    };
    
    const expected = {
      user: {
        name: 'Jane',
        details: {
          age: 25
        },
        active: true
      },
      settings: {
        theme: 'dark'
      }
    };
    
    expect(cleanVoidProperties(input)).toEqual(expected);
  });

  it('should handle arrays', () => {
    const input = {
      items: ['apple', '', 'banana', null, 'cherry', undefined],
      tags: [],
      categories: ['design', 'ui', '']
    };
    
    const expected = {
      items: ['apple', 'banana', 'cherry'],
      categories: ['design', 'ui']
    };
    
    expect(cleanVoidProperties(input)).toEqual(expected);
  });

  it('should handle mixed complex structures', () => {
    const input = {
      project: {
        name: 'My Project',
        description: '',
        members: [
          { name: 'Alice', role: 'designer', email: '' },
          { name: 'Bob', role: null, email: 'bob@example.com' },
          { name: '', role: 'developer', email: undefined }
        ],
        settings: {
          public: true,
          archived: null,
          tags: ['design', '', 'ui', null]
        }
      },
      metadata: {
        created: '2024-01-01',
        updated: '',
        version: undefined
      }
    };
    
    const expected = {
      project: {
        name: 'My Project',
        members: [
          { name: 'Alice', role: 'designer' },
          { name: 'Bob', email: 'bob@example.com' },
          { role: 'developer' }
        ],
        settings: {
          public: true,
          tags: ['design', 'ui']
        }
      },
      metadata: {
        created: '2024-01-01'
      }
    };
    
    expect(cleanVoidProperties(input)).toEqual(expected);
  });

  it('should handle edge cases correctly', () => {
    const input = {
      emptyObject: {},
      emptyArray: [],
      nullValue: null,
      undefinedValue: undefined,
      emptyString: '',
      zero: 0,
      falseValue: false,
      validString: 'hello'
    };
    
    const expected = {
      zero: 0,
      falseValue: false,
      validString: 'hello'
    };
    
    expect(cleanVoidProperties(input)).toEqual(expected);
  });

  it('should handle deep nesting', () => {
    const input = {
      level1: {
        level2: {
          level3: {
            level4: {
              value: 'deep',
              empty: '',
              null: null
            },
            valid: true
          },
          invalid: undefined
        },
        name: 'test'
      }
    };
    
    const expected = {
      level1: {
        level2: {
          level3: {
            level4: {
              value: 'deep'
            },
            valid: true
          }
        },
        name: 'test'
      }
    };
    
    expect(cleanVoidProperties(input)).toEqual(expected);
  });

  it('should return undefined for completely empty objects', () => {
    const input = {
      empty: {},
      nullVal: null,
      undefinedVal: undefined,
      emptyStr: ''
    };
    
    expect(cleanVoidProperties(input)).toBeUndefined();
  });

  it('should return undefined for empty arrays', () => {
    const input = ['', null, undefined, {}];
    expect(cleanVoidProperties(input)).toBeUndefined();
  });

  it('should preserve falsy but valid values', () => {
    const input = {
      zero: 0,
      false: false,
      emptyString: '',
      nullValue: null,
      undefinedValue: undefined,
      validString: 'hello'
    };
    
    const expected = {
      zero: 0,
      false: false,
      validString: 'hello'
    };
    
    expect(cleanVoidProperties(input)).toEqual(expected);
  });
});
