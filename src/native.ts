import { Capacitor, registerPlugin } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';

type NotificationLesson = { id: string; studentId: string; date: string; startTime: string; subject: string; status: string };
type NotificationStudent = { id: string; name: string; nickname: string; commuteMinutes?: number; locationShort?: string };
type NotificationSettings = { lessonReminderMinutes: number; departureBufferMinutes: number; notificationsEnabled: boolean };
type BiometryType = 'faceId' | 'touchId' | 'none';
type BiometryStatus = { available: boolean; biometryType: BiometryType };

interface BiometricAuthPlugin {
  checkAvailability(): Promise<BiometryStatus>;
  authenticate(options: { reason: string }): Promise<{ success: boolean; biometryType: BiometryType }>;
}

const BiometricAuth = registerPlugin<BiometricAuthPlugin>('BiometricAuth');

function notificationId(value: string) {
  let hash = 17;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) | 0;
  return Math.abs(hash % 2_000_000_000) || 1;
}
export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export async function checkBiometryAvailability(): Promise<BiometryStatus> {
  if (!isNativeApp()) return { available: false, biometryType: 'none' };
  return BiometricAuth.checkAvailability();
}

export async function authenticateAppLock() {
  if (!isNativeApp()) return { success: true, biometryType: 'none' as BiometryType };
  return BiometricAuth.authenticate({ reason: '解锁课程、学生档案和老师私密备注' });
}

export async function saveAndShareBackup(filename: string, contents: string) {
  if (!isNativeApp()) return false;
  const result = await Filesystem.writeFile({ path: filename, data: contents, directory: Directory.Documents, encoding: Encoding.UTF8, recursive: true });
  await Share.share({ title: '杨老师家教加密备份', text: '请将这份备份保存到安全位置。', url: result.uri, dialogTitle: '保存加密备份' });
  return true;
}

export async function syncLocalNotifications(lessons: NotificationLesson[], students: NotificationStudent[], settings: NotificationSettings) {
  if (!isNativeApp()) return { native: false, scheduled: 0 };
  if (!settings.notificationsEnabled) {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications });
    return { native: true, scheduled: 0 };
  }

  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== 'granted') throw new Error('请先在 iPhone 设置中允许通知。');
  const now = new Date();
  const studentMap = new Map(students.map((student) => [student.id, student]));
  const notifications: LocalNotificationSchema[] = [];

  lessons
    .filter((lesson) => lesson.status === '已预约')
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
    .forEach((lesson) => {
      if (notifications.length >= 60) return;
      const start = new Date(`${lesson.date}T${lesson.startTime}:00`);
      const student = studentMap.get(lesson.studentId);
      const lessonReminder = new Date(start.getTime() - settings.lessonReminderMinutes * 60_000);
      if (lessonReminder > now) notifications.push({
        id: notificationId(`lesson:${lesson.id}`),
        title: `即将上课 · ${student?.nickname || student?.name || '学生'}`,
        body: `${lesson.startTime} ${lesson.subject}课${student?.locationShort ? ` · ${student.locationShort}` : ''}`,
        schedule: { at: lessonReminder },
      });
      const departureMinutes = (student?.commuteMinutes || 0) + settings.departureBufferMinutes;
      const departureReminder = new Date(start.getTime() - departureMinutes * 60_000);
      if (student?.commuteMinutes && departureReminder > now && notifications.length < 60) notifications.push({
        id: notificationId(`departure:${lesson.id}`),
        title: `该出发去${student.locationShort || '学生家'}了`,
        body: `预计通勤 ${student.commuteMinutes} 分钟，已预留 ${settings.departureBufferMinutes} 分钟缓冲。`,
        schedule: { at: departureReminder },
      });
    });

  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications });
  if (notifications.length) await LocalNotifications.schedule({ notifications });
  return { native: true, scheduled: notifications.length };
}
