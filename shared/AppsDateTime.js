/**
 * @typedef {object} AdtTimeOptions
 * @prop {number} [hours]
 * @prop {number} [minutes] 
 * @prop {number} [seconds]
 * @prop {number} [milliseconds] 
 */

/**
 * @typedef {object} AdtCreateOptions
 * @prop {number} [year]
 * @prop {number} [month]
 * @prop {number} [day]
 * @prop {number} [hours]
 * @prop {number} [minutes] 
 * @prop {number} [seconds]
 * @prop {number} [milliseconds] 
 * @prop {boolean} [utc]
 */

/**
 * @typedef {object} AdtModifyOptions
 * @prop {number} [years] 
 * @prop {number} [months] 
 * @prop {number} [days]
 * @prop {number} [hours]
 * @prop {number} [minutes] 
 * @prop {number} [seconds]
 * @prop {number} [milliseconds]  
 * @prop {boolean} [utc]
 */

class AppsDateTime {

  static adt() {
    /**
     * Applies options to the date
     * @param {Date} date - date
     * @param {AdtCreateOptions} [options]
     */
    const apply = (date, options = {}) => {
      if (options.utc) {
        if (options.year !== undefined) date.setUTCFullYear(options.year);
        if (options.month !== undefined) date.setUTCMonth(options.month - 1);
        if (options.day !== undefined) date.setUTCDate(options.day);
        if (options.hours !== undefined) date.setUTCHours(options.hours);
        if (options.minutes !== undefined) date.setUTCMinutes(options.minutes);
        if (options.seconds !== undefined) date.setUTCSeconds(options.seconds);
        if (options.milliseconds !== undefined) date.setUTCMilliseconds(options.milliseconds);
      } else {
        if (options.year !== undefined) date.setFullYear(options.year);
        if (options.month !== undefined) date.setMonth(options.month - 1);
        if (options.day !== undefined) date.setDate(options.day);
        if (options.hours !== undefined) date.setHours(options.hours);
        if (options.minutes !== undefined) date.setMinutes(options.minutes);
        if (options.seconds !== undefined) date.setSeconds(options.seconds);
        if (options.milliseconds !== undefined) date.setMilliseconds(options.milliseconds);
      }

      return date;
    };

    /**
     * Applies arithmetic to date
     * @param {Date} date - date
     * @param {-1 | 1} sign - -1 | 1
     * @param {AdtModifyOptions} [options]
     */
    const arithmetic = (date, sign, options = {}) => {

      if (options.utc) {
        if (options.years !== undefined) date.setUTCFullYear(date.getUTCFullYear() + (sign * options.years));
        if (options.months !== undefined) date.setUTCMonth(date.getUTCMonth() + (sign * options.months));
        if (options.days !== undefined) date.setUTCDate(date.getUTCDate() + (sign * options.days));
        if (options.hours !== undefined) date.setUTCHours(date.getUTCHours() + (sign * options.hours));
        if (options.minutes !== undefined) date.setUTCMinutes(date.getUTCMinutes() + (sign * options.minutes));
        if (options.seconds !== undefined) date.setUTCSeconds(date.getUTCSeconds() + (sign * options.seconds));
        if (options.milliseconds !== undefined) date.setUTCMilliseconds(date.getUTCMilliseconds() + (sign * options.milliseconds));
      } else {
        if (options.years !== undefined) date.setFullYear(date.getFullYear() + (sign * options.years));
        if (options.months !== undefined) date.setMonth(date.getMonth() + (sign * options.months));
        if (options.days !== undefined) date.setDate(date.getDate() + (sign * options.days));
        if (options.hours !== undefined) date.setHours(date.getHours() + (sign * options.hours));
        if (options.minutes !== undefined) date.setMinutes(date.getMinutes() + (sign * options.minutes));
        if (options.seconds !== undefined) date.setSeconds(date.getSeconds() + (sign * options.seconds));
        if (options.milliseconds !== undefined) date.setMilliseconds(date.getMilliseconds() + (sign * options.milliseconds));
      }

      return date;
    };

    /** @param {AdtCreateOptions} [options] */
    const build = ({ year, month, day, hours, minutes, seconds, milliseconds } = {}) => {
      const date = new Date();
      apply(date, { year, month, day, hours, minutes, seconds, milliseconds });
      return date;
    };

    /** @param {string} dtstr */
    const fromString = (dtstr) => {
      const datePattern = /^\d+-\d{2}-\d{2}$/;
      const datetimePattern = /^\d+-\d{2}-\d{2}(T|\s)\d{2}:\d{2}:\d{2}(\.\d{3}Z?)?$/;

      const isUTC = dtstr.endsWith('Z');

      const isDate = datePattern.test(dtstr);
      const isDateTime = datetimePattern.test(dtstr);
      if (!isDate && !isDateTime)
        return null;

      const dt = new Date(1970, 0, 1);
      if (isDate) {
        const [year, month, day] = dtstr.split('-').map((part) => parseInt(part, 10));
        apply(dt, { year, month, day, hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });
      }

      if (isDateTime) {
        const delimByT = dtstr.includes('T');
        const [date, timepart] = dtstr.split(delimByT ? 'T' : ' ');
        const [year, month, day] = date.split('-').map((part) => parseInt(part, 10));
        const [time, ms] = timepart.split('.');
        const [hours, minutes, seconds] = time.split(':').map((part) => parseInt(part, 10));
        apply(dt, { year, month, day, hours, minutes, seconds, milliseconds: parseInt(ms, 10), utc: isUTC });
      }

      if (Number.isNaN(dt.getTime()))
        return null;

      return dt;
    };

    /**
     * @param {Date} dt - date
     * @param {AdtCreateOptions} [options]
     */
    const update = (dt, { year, month, day, hours, minutes, seconds, milliseconds } = {}) => {
      const date = new Date(dt);
      apply(date, { year, month, day, hours, minutes, seconds, milliseconds });
      return date;
    };

    /**
     * @param {Date} dt - date
     * @param {AdtModifyOptions} [options]
     */
    const add = (dt, { years, months, days, hours, minutes, seconds, milliseconds } = {}) => {
      const date = new Date(dt);
      arithmetic(date, 1, { years, months, days, hours, minutes, seconds, milliseconds });
      return date;
    };

    /**
     * @param {Date} dt - date
     * @param {AdtModifyOptions} [options]
     */
    const subtract = (dt, { years, months, days, hours, minutes, seconds, milliseconds } = {}) => {
      const date = new Date(dt);
      arithmetic(date, -1, { years, months, days, hours, minutes, seconds, milliseconds });
      return date;
    };

    /** @param {Date[]} dts */
    const min = (dts) => {
      if (dts.length === 0)
        return null;

      const ms = Math.min(...dts.map(dt => dt.getTime()));
      return new Date(ms);
    };

    /** @param {Date[]} dts */
    const max = (dts) => {
      if (dts.length === 0)
        return null;

      const ms = Math.max(...dts.map(dt => dt.getTime()));
      return new Date(ms);
    };

    /**
     * @param {Date} larger - Larger date
     * @param {Date} smaller - Smaller date
     * @param {AdtTimeOptions} [options]
     */
    const prettyDiff = (larger, smaller, { hours, minutes, seconds, milliseconds } = {}) => {
      const yearDiff = larger.getFullYear() - smaller.getFullYear();
      const monthDiff = larger.getMonth() - smaller.getMonth();
      const dayDiff = larger.getDate() - smaller.getDate();
      const hoursDiff = larger.getHours() - smaller.getHours();
      const minutesDiff = larger.getMinutes() - smaller.getMinutes();
      const secondsDiff = larger.getSeconds() - smaller.getSeconds();
      const millisecondsDiff = larger.getMilliseconds() - smaller.getMilliseconds();

      const allMonths = (yearDiff * 12) + monthDiff - (dayDiff < 0);
      const totalYears = Math.floor(allMonths / 12);
      const totalMonths = allMonths % 12;

      const adjustedDays = dayDiff - (hoursDiff < 0);
      const totalDays = adjustedDays >= 0 ? adjustedDays : new Date(larger.getFullYear(), larger.getMonth() + 1, 0).getDate() + adjustedDays;

      const adjustedHours = hoursDiff - (minutesDiff < 0);
      const totalHours = adjustedHours >= 0 ? adjustedHours : 24 + adjustedHours;

      const adjustedMinutes = minutesDiff - (secondsDiff < 0);
      const totalMinutes = adjustedMinutes >= 0 ? adjustedMinutes : 60 + adjustedMinutes;

      const adjustedSeconds = secondsDiff - (millisecondsDiff < 0);
      const totalSeconds = adjustedSeconds >= 0 ? adjustedSeconds : 60 + adjustedSeconds;

      const totalMilliseconds = ((millisecondsDiff < 0) * 1000) + millisecondsDiff;

      const showMilliseconds = !!milliseconds;
      const showSeconds = !!seconds || showMilliseconds;
      const showMinutes = !!minutes || showSeconds;
      const showHours = !!hours || showMinutes;

      const parts = [];
      if (totalYears > 0)
        parts.push(`${totalYears} year${totalYears > 1 ? 's' : ''}`);

      if (totalMonths > 0)
        parts.push(`${totalMonths} month${totalMonths > 1 ? 's' : ''}`);

      if (totalDays > 0)
        parts.push(`${totalDays} day${totalDays > 1 ? 's' : ''}`);

      if (showHours && totalHours > 0)
        parts.push(`${totalHours} hr${totalHours > 1 ? 's' : ''}`);

      if (showMinutes && totalMinutes > 0)
        parts.push(`${totalMinutes} min`);

      if (showSeconds && totalSeconds > 0)
        parts.push(`${totalSeconds} s`);

      if (showMilliseconds && totalMilliseconds > 0)
        parts.push(`${totalMilliseconds} ms`);

      return parts.join(', ');
    };

    /**
     * @param {Date} one - date
     * @param {Date} two - date
     */
    const diff = (one, two) => {
      const larger = one > two ? one : two;
      const smaller = one < two ? one : two;

      const milliseconds = larger.getTime() - smaller.getTime();
      const seconds = parseFloat((milliseconds / 1000).toFixed(2));
      const minutes = parseFloat((seconds / 60).toFixed(2));
      const hours = parseFloat((minutes / 60).toFixed(2));
      const days = parseFloat((hours / 24).toFixed(2));

      const yearDiff = larger.getFullYear() - smaller.getFullYear();
      const monthDiff = larger.getMonth() - smaller.getMonth();
      const dayDiff = larger.getDate() - smaller.getDate();

      // bit of just an approx here....
      const monthRatio = parseFloat((dayDiff / 30.437).toFixed(2));
      const totalMonths = monthDiff + monthRatio + (yearDiff * 12);

      const months = totalMonths;
      const years = parseFloat((months / 12).toFixed(10));

      const pretty = ({ hours, minutes, seconds, milliseconds } = {}) => prettyDiff(larger, smaller, { hours, minutes, seconds, milliseconds });

      return { years, months, days, hours, minutes, seconds, milliseconds, pretty };
    };

    /**
     * @param {Date} dt - date
     * @param {Date} start - date
     * @param {Date} end - date
     * @param {object} [options] - optional options
     * @param {boolean} [options.time] - compare times
     * @param {boolean} [options.includeStart] - inclusive for the start date
     * @param {boolean} [options.includeEnd] - inclusive for the end date
     */
    const compare = (dt, start, end, { time = true, includeStart, includeEnd } = {}) => {
      const d = new Date(dt);
      const s = new Date(start);
      const e = new Date(end);

      if (!time) {
        apply(d, { hours: 0, seconds: 0, milliseconds: 0 });
        apply(s, { hours: 0, seconds: 0, milliseconds: 0 });
        apply(e, { hours: 0, seconds: 0, milliseconds: 0 });
      }

      const gt = includeStart ? d >= s : d > s;
      const lt = includeEnd ? d <= e : d < e;

      return { gt, lt };
    };

    /**
     * Calculates interval from now to the provided date
     * @param {Date} to - date
     * @param {object} [options] - optional options
     * @param {'year' | 'month' | 'day'} [options.cutoff] - when to cutoff to just the date vs the diff
     */
    const interval = (to, { cutoff } = {}) => {
      const from = new Date();
      const isPast = from > to;
      const larger = isPast ? from : to;
      const smaller = !isPast ? from : to;

      const { years, months, days, hours, minutes, seconds, pretty } = diff(from, to);

      const hasBeenYears = years >= 1;
      const hasBeenMonths = months >= 1;
      const hasBeenDays = days >= 1;
      const hasBeenHours = hasBeenDays || hours >= 1;
      const hasBeenMinutes = hasBeenHours || minutes >= 1;
      const hasBeenSeconds = hasBeenMinutes || seconds >= 1;

      const isPastCutoff = !!cutoff
        && (
          (cutoff === 'year' && hasBeenYears)
          || (cutoff === 'month' && hasBeenMonths)
          || (cutoff === 'day' && hasBeenDays)
        );

      if (isPastCutoff)
        return to.toLocaleDateString();

      const suffix = isPast ? ' ago' : '';

      if (hasBeenMonths)
        return `${prettyDiff(larger, smaller)}${suffix}`;

      if (hasBeenDays)
        return `${prettyDiff(larger, smaller, { hours: true })}${suffix}`;

      if (hasBeenHours || hasBeenMinutes)
        return `${pretty({ minutes: true })}${suffix}`;

      if (hasBeenSeconds)
        return `${pretty({ seconds: true })}${suffix}`;

      return 'Just now';
    };

    /**
     * @param {Date} dt - date
     * @param {Date} start - date
     * @param {Date} end - date
     * @param {object} [options] - optional options
     * @param {boolean} [options.time] - compare times
     * @param {boolean} [options.includeStart] - inclusive for the start date
     * @param {boolean} [options.includeEnd] - inclusive for the end date
     */
    const between = (dt, start, end, { time = true, includeStart, includeEnd } = {}) => {
      const { gt, lt } = compare(dt, start, end, { time, includeStart, includeEnd });
      return gt && lt;
    };

    /**
     * @param {Date} dt - date
     * @param {Date} start - date
     * @param {Date} end - date
     * @param {object} [options] - optional options
     * @param {boolean} [options.time] - compare times
     * @param {boolean} [options.includeStart] - inclusive for the start date
     * @param {boolean} [options.includeEnd] - inclusive for the end date
     */
    const clamp = (dt, start, end, { time = true, includeStart, includeEnd } = {}) => {
      const { gt, lt } = compare(dt, start, end, { time, includeStart, includeEnd });
      return (gt && lt) || (!gt && !lt) ? new Date(dt)
        : !gt ? new Date(start)
          : new Date(end);
    };

    const api = {
      build,
      fromString,
      update,
      add,
      subtract,
      min,
      max,
      diff,
      interval,
      between,
      clamp
    };

    return api;
  }

}