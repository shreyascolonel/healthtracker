import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getRecords, updateRecord } from './repository';

/** Local notifications are not supported in Expo Go (SDK 53+). Use a dev/production build. */
export function areNotificationsAvailable(): boolean {
  return Constants.executionEnvironment !== 'storeClient';
}

async function getNotifications() {
  return import('expo-notifications');
}

async function initNotificationHandler(): Promise<void> {
  if (!areNotificationsAvailable()) return;
  const Notifications = await getNotifications();
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

let handlerInitialized = false;

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!areNotificationsAvailable()) return false;

  if (!handlerInitialized) {
    await initNotificationHandler();
    handlerInitialized = true;
  }

  const Notifications = await getNotifications();
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Health Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E91E8C',
    });
  }

  return true;
}

interface Reminder {
  id: string;
  type: string;
  title: string;
  message?: string;
  time_of_day: string;
  days_of_week: string;
  enabled: number;
  notification_id?: string;
}

export async function scheduleReminder(reminder: Reminder): Promise<string | null> {
  if (!areNotificationsAvailable() || !reminder.enabled) return null;

  const Notifications = await getNotifications();
  const [hours, minutes] = reminder.time_of_day.split(':').map(Number);

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: reminder.title,
      body: reminder.message || getDefaultMessage(reminder.type),
      data: { reminderId: reminder.id, type: reminder.type },
      ...(Platform.OS === 'android' && { channelId: 'reminders' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: hours,
      minute: minutes,
    },
  });

  return notificationId;
}

function getDefaultMessage(type: string): string {
  switch (type) {
    case 'water':
      return 'Time to drink some water! Stay hydrated 💧';
    case 'food':
      return 'Remember to eat something nutritious 🍎';
    default:
      return 'Health reminder';
  }
}

export async function cancelReminder(notificationId: string): Promise<void> {
  if (!areNotificationsAvailable()) return;
  const Notifications = await getNotifications();
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function rescheduleAllReminders(): Promise<void> {
  if (!areNotificationsAvailable()) return;

  const Notifications = await getNotifications();
  await Notifications.cancelAllScheduledNotificationsAsync();

  const reminders = await getRecords<Reminder>('reminders', 'enabled = 1');
  for (const reminder of reminders) {
    const notificationId = await scheduleReminder(reminder);
    if (notificationId) {
      await updateRecord('reminders', reminder.id, { notification_id: notificationId });
    }
  }
}

export async function setupDefaultReminders(): Promise<void> {
  const existing = await getRecords('reminders');
  if (existing.length > 0) {
    if (areNotificationsAvailable()) await rescheduleAllReminders();
    return;
  }

  const { createRecord } = await import('./repository');
  const defaults = [
    { type: 'water', title: 'Morning Water', time_of_day: '08:00', message: 'Start your day with a glass of water! 💧' },
    { type: 'water', title: 'Midday Hydration', time_of_day: '12:00', message: 'Time for your midday water break 💧' },
    { type: 'water', title: 'Afternoon Water', time_of_day: '15:00', message: 'Keep hydrating! 💧' },
    { type: 'food', title: 'Breakfast Reminder', time_of_day: '08:30', message: 'Don\'t skip breakfast! 🍳' },
    { type: 'food', title: 'Lunch Reminder', time_of_day: '12:30', message: 'Time for a healthy lunch 🥗' },
    { type: 'food', title: 'Dinner Reminder', time_of_day: '19:00', message: 'Time for dinner 🍽️' },
  ];

  for (const d of defaults) {
    await createRecord('reminders', {
      type: d.type,
      title: d.title,
      message: d.message,
      time_of_day: d.time_of_day,
      days_of_week: '[0,1,2,3,4,5,6]',
      enabled: 1,
    });
  }

  await rescheduleAllReminders();
}
