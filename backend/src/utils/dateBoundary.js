/**
 * Date Boundary & Timezone Utility
 * Standardizes date-range calculation, period presets, and timezone boundary alignment for reports.
 */

const { BadRequestError } = require('./appError');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Convert a date or string to UTC ISO string formatted for PostgreSQL TIMESTAMPTZ
 * @param {Date|string} dateInput
 * @param {boolean} isEndOfDay - If true and string is YYYY-MM-DD, set to 23:59:59.999
 * @returns {string|null}
 */
function parseDateBoundary(dateInput, isEndOfDay = false) {
  if (!dateInput) return null;

  if (typeof dateInput === 'string' && DATE_REGEX.test(dateInput.trim())) {
    const trimmed = dateInput.trim();
    if (isEndOfDay) {
      return new Date(`${trimmed}T23:59:59.999Z`).toISOString();
    }
    return new Date(`${trimmed}T00:00:00.000Z`).toISOString();
  }

  const parsed = new Date(dateInput);
  if (isNaN(parsed.getTime())) {
    throw new BadRequestError(`Invalid date parameter: '${dateInput}'. Expected YYYY-MM-DD or valid ISO timestamp.`);
  }

  return parsed.toISOString();
}

/**
 * Resolve date bounds based on named period or custom start/end dates
 * Supported presets: 'today', 'yesterday', 'this-week', 'this-month', 'last-month', 'this-quarter', 'this-year', 'all'
 * 
 * @param {object} options
 * @param {string} [options.period]
 * @param {string} [options.startDate]
 * @param {string} [options.endDate]
 * @returns {{ startDate: string|null, endDate: string|null, periodName: string }}
 */
function resolveDateRange(options = {}) {
  const { period, startDate: rawStart, endDate: rawEnd } = options;

  const now = new Date();
  let start = null;
  let end = null;
  let periodName = 'custom';

  const normalizedPeriod = period ? String(period).toLowerCase().trim() : null;

  if (normalizedPeriod && normalizedPeriod !== 'custom') {
    periodName = normalizedPeriod;
    switch (normalizedPeriod) {
      case 'today': {
        const s = new Date(now);
        s.setUTCHours(0, 0, 0, 0);
        const e = new Date(now);
        e.setUTCHours(23, 59, 59, 999);
        start = s.toISOString();
        end = e.toISOString();
        break;
      }
      case 'yesterday': {
        const s = new Date(now);
        s.setUTCDate(s.getUTCDate() - 1);
        s.setUTCHours(0, 0, 0, 0);
        const e = new Date(s);
        e.setUTCHours(23, 59, 59, 999);
        start = s.toISOString();
        end = e.toISOString();
        break;
      }
      case 'this-week':
      case 'week': {
        const s = new Date(now);
        // ISO week starts on Monday
        const day = s.getUTCDay() || 7;
        s.setUTCDate(s.getUTCDate() - day + 1);
        s.setUTCHours(0, 0, 0, 0);
        const e = new Date(now);
        e.setUTCHours(23, 59, 59, 999);
        start = s.toISOString();
        end = e.toISOString();
        break;
      }
      case 'this-month':
      case 'month': {
        const s = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
        const e = new Date(now);
        e.setUTCHours(23, 59, 59, 999);
        start = s.toISOString();
        end = e.toISOString();
        break;
      }
      case 'last-month': {
        const year = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
        const month = now.getUTCMonth() === 0 ? 11 : now.getUTCMonth() - 1;
        const s = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
        // Day 0 of next month is the last day of target month
        const e = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
        start = s.toISOString();
        end = e.toISOString();
        break;
      }
      case 'this-quarter':
      case 'quarter': {
        const qMonth = Math.floor(now.getUTCMonth() / 3) * 3;
        const s = new Date(Date.UTC(now.getUTCFullYear(), qMonth, 1, 0, 0, 0, 0));
        const e = new Date(now);
        e.setUTCHours(23, 59, 59, 999);
        start = s.toISOString();
        end = e.toISOString();
        break;
      }
      case 'this-year':
      case 'year': {
        const s = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
        const e = new Date(now);
        e.setUTCHours(23, 59, 59, 999);
        start = s.toISOString();
        end = e.toISOString();
        break;
      }
      case 'all':
      case 'all-time': {
        start = null;
        end = null;
        periodName = 'all-time';
        break;
      }
      default:
        throw new BadRequestError(
          `Unsupported period preset: '${period}'. Allowed presets: 'today', 'yesterday', 'this-week', 'this-month', 'last-month', 'this-quarter', 'this-year', 'all'`
        );
    }
  } else {
    // Custom range
    start = parseDateBoundary(rawStart, false);
    end = parseDateBoundary(rawEnd, true);

    if (start && end && new Date(start).getTime() > new Date(end).getTime()) {
      throw new BadRequestError(`startDate (${start}) cannot be chronologically later than endDate (${end})`);
    }

    if (!start && !end) {
      periodName = 'all-time';
    }
  }

  return {
    startDate: start,
    endDate: end,
    periodName,
  };
}

module.exports = {
  parseDateBoundary,
  resolveDateRange,
};
