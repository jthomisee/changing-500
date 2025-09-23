// Utility functions for timezone-aware date formatting
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Configure Day.js plugins
dayjs.extend(utc);
dayjs.extend(timezone);

export const formatGameDateTime = (game, userTimezone = 'America/New_York') => {
  if (!game.date) return '';

  try {
    if (game.time) {
      // Create UTC datetime from game date and time
      const utcDateTime = new Date(`${game.date}T${game.time}:00.000Z`);

      // Format in user's timezone
      const options = {
        timeZone: userTimezone,
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      };

      return new Intl.DateTimeFormat('en-US', options).format(utcDateTime);
    }

    // Just date without time
    const date = new Date(game.date);
    const options = {
      timeZone: userTimezone,
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };

    return new Intl.DateTimeFormat('en-US', options).format(date);
  } catch (error) {
    console.error('Error formatting game date/time:', error);
    // Fallback to original logic
    if (game.time) {
      const utcDateTime = new Date(`${game.date}T${game.time}:00.000Z`);
      return utcDateTime.toLocaleString();
    }
    return new Date(game.date).toLocaleDateString();
  }
};

export const formatDate = (dateString, userTimezone = 'America/New_York') => {
  if (!dateString) return 'N/A';

  try {
    const date = new Date(dateString);
    const options = {
      timeZone: userTimezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };

    return new Intl.DateTimeFormat('en-US', options).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return new Date(dateString).toLocaleDateString();
  }
};

export const formatDateTime = (
  dateString,
  userTimezone = 'America/New_York'
) => {
  if (!dateString) return 'N/A';

  try {
    const date = new Date(dateString);
    const options = {
      timeZone: userTimezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };

    return new Intl.DateTimeFormat('en-US', options).format(date);
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return new Date(dateString).toLocaleString();
  }
};

// Helper function to convert datetime from user's timezone to UTC for storage
export const convertToUTC = (date, time, userTimezone = 'America/New_York') => {
  if (!date) return { date, time: null };

  if (time) {
    try {
      // Parse the input as being in the user's timezone, then convert to UTC
      const userDateTime = dayjs.tz(`${date} ${time}`, userTimezone);
      const utcDateTime = userDateTime.utc();

      return {
        date: utcDateTime.format('YYYY-MM-DD'),
        time: utcDateTime.format('HH:mm'),
      };
    } catch (error) {
      console.error('Error converting to UTC with Day.js:', error);
      // Fallback to treating input as local time
      const localDateTime = new Date(`${date}T${time}`);
      return {
        date: localDateTime.toISOString().split('T')[0],
        time: localDateTime.toISOString().split('T')[1].substring(0, 5),
      };
    }
  }

  return { date, time: null };
};

// Helper function to convert UTC datetime from database to local time for display
export const convertFromUTC = (
  utcDate,
  utcTime,
  userTimezone = 'America/New_York'
) => {
  if (!utcDate) return { date: '', time: '' };

  if (utcTime) {
    try {
      // Parse UTC datetime and convert to user's timezone
      const utcDateTime = dayjs.utc(`${utcDate} ${utcTime}`);
      const userDateTime = utcDateTime.tz(userTimezone);

      return {
        date: userDateTime.format('YYYY-MM-DD'),
        time: userDateTime.format('HH:mm'),
      };
    } catch (error) {
      console.error('Error converting from UTC with Day.js:', error);
      // Fallback to original logic
      const utcDateTime = new Date(`${utcDate}T${utcTime}:00.000Z`);
      const localDate = utcDateTime.toLocaleDateString('en-CA'); // YYYY-MM-DD format
      const localTime = utcDateTime.toLocaleTimeString('en-GB', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      }); // HH:MM format
      return { date: localDate, time: localTime };
    }
  }

  return { date: utcDate, time: '' };
};

// Helper function to check if a game is scheduled for the future (handles UTC stored times)
export const isGameInFuture = (gameDate, gameTime) => {
  if (!gameDate) return false;

  const gameDateTime = gameTime
    ? new Date(`${gameDate}T${gameTime}:00.000Z`) // Treat stored time as UTC
    : new Date(`${gameDate}T00:00:00.000Z`);

  return gameDateTime > new Date();
};
