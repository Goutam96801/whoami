import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const ENABLED_KEY = "whoami.notifications.enabled";
const MESSAGE_KEY = "whoami.notifications.message";
const MATCH_KEY = "whoami.notifications.match";

type NotificationPrefs = {
  enabled: boolean;
  message: boolean;
  match: boolean;
};

export type NotificationType = "message" | "match";
export type NotificationLogItem = {
  id: string;
  type: NotificationType;
  title: string;
  body?: string;
  createdAt: string;
  data?: Record<string, unknown>;
};

const LOG_KEY = "whoami.notifications.log";

export const initNotifications = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF8FD6",
    }).catch(() => null);
  }
};

const parseBool = (value: string | null, fallback = false) => {
  if (value === null) {
    return fallback;
  }
  return value === "true";
};

export const getNotificationPreferences = async (): Promise<NotificationPrefs> => {
  const [enabledRaw, messageRaw, matchRaw] = await Promise.all([
    AsyncStorage.getItem(ENABLED_KEY),
    AsyncStorage.getItem(MESSAGE_KEY),
    AsyncStorage.getItem(MATCH_KEY),
  ]);

  const enabled = parseBool(enabledRaw, false);
  return {
    enabled,
    message: parseBool(messageRaw, enabled),
    match: parseBool(matchRaw, enabled),
  };
};

export const setNotificationPreferences = async (prefs: Partial<NotificationPrefs>) => {
  const ops: Promise<void>[] = [];
  if (typeof prefs.enabled === "boolean") {
    ops.push(AsyncStorage.setItem(ENABLED_KEY, String(prefs.enabled)));
  }
  if (typeof prefs.message === "boolean") {
    ops.push(AsyncStorage.setItem(MESSAGE_KEY, String(prefs.message)));
  }
  if (typeof prefs.match === "boolean") {
    ops.push(AsyncStorage.setItem(MATCH_KEY, String(prefs.match)));
  }
  await Promise.all(ops);
};

export const requestNotificationPermission = async () => {
  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const request = await Notifications.requestPermissionsAsync();
    status = request.status;
  }

  if (Platform.OS === "android" && status === "granted") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF8FD6",
    });
  }

  return status === "granted";
};

const canNotify = async (type: NotificationType) => {
  const prefs = await getNotificationPreferences();
  if (!prefs.enabled) {
    return false;
  }
  if (type === "message" && !prefs.message) {
    return false;
  }
  if (type === "match" && !prefs.match) {
    return false;
  }

  const permission = await Notifications.getPermissionsAsync();
  return permission.status === "granted";
};

export const sendLocalNotification = async (
  type: NotificationType,
  content: { title: string; body?: string; data?: Record<string, unknown> },
) => {
  const logItem: NotificationLogItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    title: content.title,
    body: content.body,
    createdAt: new Date().toISOString(),
    data: content.data,
  };

  AsyncStorage.getItem(LOG_KEY)
    .then((raw) => {
      const parsed = raw ? (JSON.parse(raw) as NotificationLogItem[]) : [];
      const next = [logItem, ...(Array.isArray(parsed) ? parsed : [])].slice(0, 50);
      return AsyncStorage.setItem(LOG_KEY, JSON.stringify(next));
    })
    .catch(() => null);

  const allowed = await canNotify(type);
  if (!allowed) {
    return false;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: content.title,
      body: content.body,
      data: content.data,
    },
    trigger: null,
  });

  return true;
};

export const getNotificationLog = async (): Promise<NotificationLogItem[]> => {
  const raw = await AsyncStorage.getItem(LOG_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as NotificationLogItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const clearNotificationLog = async () => {
  await AsyncStorage.removeItem(LOG_KEY);
};
