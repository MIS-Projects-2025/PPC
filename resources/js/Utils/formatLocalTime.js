import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

// const formatLocalTime = (utcString) => {
//   return dayjs.utc(utcString).local().format('MMM D, YYYY h:mm A');
// };
const formatLocalTime = (utcString) => {
  const normalized = utcString.endsWith('Z') ? utcString : utcString + 'Z';
  return new Date(normalized).toLocaleString('en-PH', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
};

export default formatLocalTime;