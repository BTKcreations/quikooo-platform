/**
 * @quikooo/design-system
 * Shared tokens and design utilities for QUIKOOO applications
 */

const TOKENS = {
  colors: {
    brandPrimary: '#059669',
    brandHover: '#047857',
    brandActive: '#065f46',
    brandDark: '#064e3b',
    brandDeepest: '#022c22',
    canvasBg: '#FBFBF9',
    surfaceCard: '#FFFFFF',
    surfaceSubtle: '#F3F4F0',
    brandLight50: '#ecfdf5',
    brandLight100: '#d1fae5',
    brandLight200: '#a7f3d0',
    textPrimary: '#111827',
    textSecondary: '#4B5563',
    textMuted: '#9CA3AF',
    statusSuccess: '#10B981',
    statusWarning: '#F59E0B',
    statusDanger: '#EF4444',
  },
  typography: {
    fontDisplay: "'Outfit', sans-serif",
    fontBody: "'Plus Jakarta Sans', sans-serif",
  },
};

/**
 * Formats a number as Indian Rupee (INR)
 * @param {number} amount
 * @returns {string} e.g. "₹135.00"
 */
function formatINR(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

module.exports = {
  TOKENS,
  formatINR,
};
