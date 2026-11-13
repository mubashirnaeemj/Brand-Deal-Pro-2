// Content-strategy split for each creator (percent, each row sums to 100) plus how much of their content is product-focused.
// Keys match creators.ts ids; "me" is the logged-in creator from me.ts.
export interface ContentStrategy { tutorial: number; productReview: number; lifestyle: number; educational: number; entertainment: number; productFocused: number }

export const STRATEGY: Record<string, ContentStrategy> = {
  me: { tutorial: 32, productReview: 18, lifestyle: 14, educational: 22, entertainment: 14, productFocused: 26 },
  c1: { tutorial: 30, productReview: 22, lifestyle: 8, educational: 22, entertainment: 18, productFocused: 38 },
  c2: { tutorial: 38, productReview: 28, lifestyle: 8, educational: 18, entertainment: 8, productFocused: 45 },
  c3: { tutorial: 22, productReview: 42, lifestyle: 6, educational: 20, entertainment: 10, productFocused: 62 },
  c4: { tutorial: 14, productReview: 10, lifestyle: 28, educational: 14, entertainment: 34, productFocused: 20 },
  c5: { tutorial: 30, productReview: 12, lifestyle: 30, educational: 16, entertainment: 12, productFocused: 22 },
  c6: { tutorial: 10, productReview: 30, lifestyle: 6, educational: 14, entertainment: 40, productFocused: 48 },
  c7: { tutorial: 40, productReview: 8, lifestyle: 20, educational: 24, entertainment: 8, productFocused: 14 },
  c8: { tutorial: 30, productReview: 30, lifestyle: 25, educational: 5, entertainment: 10, productFocused: 55 },
  c9: { tutorial: 10, productReview: 25, lifestyle: 35, educational: 5, entertainment: 25, productFocused: 40 },
  c10: { tutorial: 25, productReview: 35, lifestyle: 15, educational: 20, entertainment: 5, productFocused: 50 },
  c11: { tutorial: 30, productReview: 15, lifestyle: 15, educational: 25, entertainment: 15, productFocused: 25 },
  c12: { tutorial: 30, productReview: 10, lifestyle: 20, educational: 30, entertainment: 10, productFocused: 18 },
  c13: { tutorial: 10, productReview: 15, lifestyle: 40, educational: 25, entertainment: 10, productFocused: 22 },
  c14: { tutorial: 15, productReview: 20, lifestyle: 20, educational: 35, entertainment: 10, productFocused: 28 },
};
