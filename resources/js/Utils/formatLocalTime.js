import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

// const formatLocalTime = (utcString) => {
//   return dayjs.utc(utcString).local().format('MMM D, YYYY h:mm A');
// };
const formatLocalTime = (utcString) => {
  if (!utcString) return "—";
  const raw = String(utcString).trim().replace(" ", "T");
  const normalized = /(Z|[+-]\d{2}:?\d{2})$/.test(raw) ? raw : raw + "Z";
  const date = new Date(normalized);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleString('en-PH', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Manila',
  });
};

export default formatLocalTime;