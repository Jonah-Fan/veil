import {browser} from 'wxt/browser';
import {getSettings} from '@/services/storage/vault';
import {AUTO_LOCK_ALARM, lockNow} from '@/domain/auth/session';

export async function scheduleAutoLock(): Promise<void> {
  const {autoLockMinutes} = await getSettings();
  if (autoLockMinutes <= 0) {
    void browser.alarms.clear(AUTO_LOCK_ALARM);
    return;
  }
  void browser.alarms.create(AUTO_LOCK_ALARM, {
    delayInMinutes: autoLockMinutes,
  });
}

export function setupAutoLockListener(): void {
  browser.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === AUTO_LOCK_ALARM) lockNow();
  });
}
