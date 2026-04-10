import { useEffect, useRef, useState } from 'react';
import type { Task } from '../../types/task';

interface UseAlarmManagerOptions {
  onSnoozeTask: (task: Task, alarmTime: Date) => Promise<void>;
  tasks: Task[];
}

const ALARM_GRACE_WINDOW_MS = 30_000;
const ALARM_LOOKAHEAD_MS = 60_000;

export function useAlarmManager({ onSnoozeTask, tasks }: UseAlarmManagerOptions) {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [alarmingTask, setAlarmingTask] = useState<Task | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [alarmInterval, setAlarmInterval] = useState<number | null>(null);
  const triggeredTaskIdsRef = useRef<Set<string>>(new Set());
  const alarmingTaskRef = useRef<Task | null>(null);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          setNotificationPermission(permission);
        });
      }
    }
  }, []);

  useEffect(() => {
    const activeTaskIds = new Set(tasks.filter((task) => !task.completed).map((task) => task.id));

    triggeredTaskIdsRef.current.forEach((taskId) => {
      if (!activeTaskIds.has(taskId)) {
        triggeredTaskIdsRef.current.delete(taskId);
      }
    });
  }, [tasks]);

  useEffect(() => {
    alarmingTaskRef.current = alarmingTask;
  }, [alarmingTask]);

  useEffect(() => {
    const checkAlarms = () => {
      const now = Date.now();

      const nextTaskToAlarm = tasks
        .filter((task) => {
          if (task.completed || !task.notificationEnabled) {
            return false;
          }

          const alarmTime = task.alarmTime.getTime();
          const isWithinWindow =
            alarmTime <= now + ALARM_LOOKAHEAD_MS && alarmTime >= now - ALARM_GRACE_WINDOW_MS;

          return isWithinWindow && !triggeredTaskIdsRef.current.has(task.id);
        })
        .sort((left, right) => left.alarmTime.getTime() - right.alarmTime.getTime())[0];

      if (nextTaskToAlarm) {
        triggerAlarm(nextTaskToAlarm);
      }
    };

    checkAlarms();
    const interval = window.setInterval(checkAlarms, 15_000);

    return () => window.clearInterval(interval);
  }, [notificationPermission, tasks]);

  const triggerAlarm = (task: Task) => {
    if (alarmingTaskRef.current?.id === task.id) {
      return;
    }

    triggeredTaskIdsRef.current.add(task.id);
    setAlarmingTask(task);

    if ('Notification' in window && notificationPermission === 'granted') {
      const notification = new Notification('Task Do - Reminder', {
        body: `${task.name}\n${task.description || 'No description'}`,
        icon: '/favicon.ico',
        tag: task.id,
        requireInteraction: true,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }

    startAlarmSound();
  };

  const startAlarmSound = () => {
    try {
      const AudioCtor =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioCtor) {
        return;
      }

      const context = new AudioCtor();
      setAudioContext(context);

      const playMelody = () => {
        const notes = [523.25, 659.25, 783.99, 659.25];
        const noteDuration = 0.4;
        const noteGap = 0.1;
        let time = context.currentTime;

        notes.forEach((frequency) => {
          const oscillator = context.createOscillator();
          const gainNode = context.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(context.destination);

          oscillator.frequency.value = frequency;
          oscillator.type = 'sine';

          gainNode.gain.setValueAtTime(0, time);
          gainNode.gain.linearRampToValueAtTime(0.6, time + 0.05);
          gainNode.gain.linearRampToValueAtTime(0.5, time + noteDuration - 0.1);
          gainNode.gain.linearRampToValueAtTime(0, time + noteDuration);

          oscillator.start(time);
          oscillator.stop(time + noteDuration);

          time += noteDuration + noteGap;
        });
      };

      playMelody();

      const interval = window.setInterval(() => {
        playMelody();
      }, 2_000);

      setAlarmInterval(interval);
    } catch (error) {
      console.log('Audio alert not available', error);
    }
  };

  const stopAlarmSound = () => {
    if (alarmInterval) {
      window.clearInterval(alarmInterval);
      setAlarmInterval(null);
    }

    if (audioContext) {
      void audioContext.close();
      setAudioContext(null);
    }
  };

  useEffect(() => {
    return () => {
      if (alarmInterval) {
        window.clearInterval(alarmInterval);
      }

      if (audioContext) {
        void audioContext.close();
      }
    };
  }, [alarmInterval, audioContext]);

  const dismissAlarm = () => {
    stopAlarmSound();
    setAlarmingTask(null);
  };

  const snoozeAlarm = () => {
    const taskToSnooze = alarmingTask;
    stopAlarmSound();
    setAlarmingTask(null);

    if (!taskToSnooze) {
      return;
    }

    const newAlarmTime = new Date(Date.now() + 5 * 60 * 1000);
    triggeredTaskIdsRef.current.delete(taskToSnooze.id);
    void onSnoozeTask(taskToSnooze, new Date(newAlarmTime));
  };

  return {
    alarmingTask,
    dismissAlarm,
    snoozeAlarm,
  };
}
