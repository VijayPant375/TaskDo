import { useEffect, useMemo, useState } from 'react';
import { ThemeProvider, useTheme } from 'next-themes';
import { Bell, Crown, Moon, Plus, Settings, Sun, Trash2 } from 'lucide-react';
import { SubscriptionProvider, useSubscription } from '../context/SubscriptionContext';
import { FREE_TASK_LIMIT } from '../types/subscription';
import { AddEditTaskScreen } from './components/AddEditTaskScreen';
import { NotificationsScreen } from './components/NotificationsScreen';
import { PremiumBadge } from './components/PremiumBadge';
import { SettingsScreen } from './components/SettingsScreen';
import { SuccessScreen } from './components/SuccessScreen';
import { TaskCard, type Task } from './components/TaskCard';
import { UpgradeModal } from './components/UpgradeModal';
import { Button } from './components/ui/button';

const TASKS_STORAGE_KEY = 'tasks';

function loadTasksFromLocalStorage(): Task[] {
  try {
    const tasksJson = localStorage.getItem(TASKS_STORAGE_KEY);
    if (!tasksJson) {
      return [];
    }

    const tasks = JSON.parse(tasksJson) as Array<Task & { deadline: string; alarmTime: string }>;
    return tasks.map((task) => ({
      ...task,
      deadline: new Date(task.deadline),
      alarmTime: new Date(task.alarmTime),
    }));
  } catch (error) {
    console.error('Error loading tasks from localStorage:', error);
    return [];
  }
}

function saveTasksToLocalStorage(tasks: Task[]) {
  try {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error('Error saving tasks to localStorage:', error);
  }
}

function AppContent() {
  const { theme, setTheme } = useTheme();
  const { canCreateTask, isPremium } = useSubscription();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentScreen, setCurrentScreen] = useState<
    'home' | 'add' | 'edit' | 'notifications' | 'settings' | 'success'
  >('home');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalTrigger, setUpgradeModalTrigger] = useState<'manual' | 'task_limit' | 'feature_locked'>('manual');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [alarmingTask, setAlarmingTask] = useState<Task | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [alarmInterval, setAlarmInterval] = useState<number | null>(null);

  useEffect(() => {
    setTasks(loadTasksFromLocalStorage());
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const checkoutState = searchParams.get('checkout');
    const sessionId = searchParams.get('session_id');

    if (checkoutState === 'success' && sessionId) {
      setCheckoutSessionId(sessionId);
      setCurrentScreen('success');
      return;
    }

    if (checkoutState === 'canceled') {
      setUpgradeModalTrigger('manual');
      setShowUpgradeModal(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (tasks.length > 0 || localStorage.getItem(TASKS_STORAGE_KEY)) {
      saveTasksToLocalStorage(tasks);
    }
  }, [tasks]);

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
    const checkAlarms = () => {
      const now = new Date();

      tasks.forEach((task) => {
        if (!task.completed && task.notificationEnabled && task.alarmTime) {
          const alarmTime = new Date(task.alarmTime);
          const timeDiff = alarmTime.getTime() - now.getTime();

          if (timeDiff <= 60000 && timeDiff > 0) {
            triggerAlarm(task);
          }
        }
      });
    };

    checkAlarms();
    const interval = setInterval(checkAlarms, 30000);
    return () => clearInterval(interval);
  }, [tasks, alarmingTask, notificationPermission]);

  const triggerAlarm = (task: Task) => {
    if (alarmingTask) {
      return;
    }

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
      }, 2000);

      setAlarmInterval(interval);
    } catch (error) {
      console.log('Audio alert not available', error);
    }
  };

  const stopAlarmSound = () => {
    if (alarmInterval) {
      clearInterval(alarmInterval);
      setAlarmInterval(null);
    }

    if (audioContext) {
      void audioContext.close();
      setAudioContext(null);
    }
  };

  const dismissAlarm = () => {
    stopAlarmSound();
    setAlarmingTask(null);
  };

  const snoozeAlarm = () => {
    stopAlarmSound();

    if (alarmingTask) {
      const newAlarmTime = new Date(Date.now() + 5 * 60 * 1000);
      setTasks((prev) =>
        prev.map((task) =>
          task.id === alarmingTask.id ? { ...task, alarmTime: newAlarmTime } : task
        )
      );
    }

    setAlarmingTask(null);
  };

  const sortedTasks = useMemo(() => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };

    return [...tasks].sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }

      return a.deadline.getTime() - b.deadline.getTime();
    });
  }, [tasks]);

  const groupedTasks = useMemo(
    () => ({
      high: sortedTasks.filter((task) => task.priority === 'high' && !task.completed),
      medium: sortedTasks.filter((task) => task.priority === 'medium' && !task.completed),
      low: sortedTasks.filter((task) => task.priority === 'low' && !task.completed),
      completed: sortedTasks.filter((task) => task.completed),
    }),
    [sortedTasks]
  );

  const handleToggleComplete = (id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const handleDelete = (id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setCurrentScreen('edit');
  };

  const handleAddTask = () => {
    const activeTaskCount = tasks.filter((task) => !task.completed).length;

    if (!canCreateTask(activeTaskCount)) {
      setUpgradeModalTrigger('task_limit');
      setShowUpgradeModal(true);
      return;
    }

    setCurrentScreen('add');
  };

  const handleSaveTask = (taskData: Omit<Task, 'id'>) => {
    if (editingTask) {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === editingTask.id ? { ...taskData, id: task.id } : task
        )
      );
    } else {
      const newTask: Task = {
        ...taskData,
        id: Date.now().toString(),
      };
      setTasks((prev) => [...prev, newTask]);
    }

    setCurrentScreen('home');
    setEditingTask(null);
  };

  const handleCancelEdit = () => {
    setCurrentScreen('home');
    setEditingTask(null);
  };

  const handleToggleNotification = (id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? { ...task, notificationEnabled: !task.notificationEnabled }
          : task
      )
    );
  };

  const handleClearCompleted = () => {
    setTasks((prev) => prev.filter((task) => !task.completed));
  };

  const handleSuccessContinue = () => {
    setCheckoutSessionId(null);
    setCurrentScreen('home');
    window.history.replaceState({}, '', window.location.pathname);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const activeTasks = tasks.filter((task) => !task.completed);
  const completedTasks = tasks.filter((task) => task.completed);
  const taskLimitReached = !isPremium && activeTasks.length >= FREE_TASK_LIMIT;
  const prioritySummary = [
    { label: 'High priority', value: groupedTasks.high.length, tone: 'text-red-500' },
    { label: 'Medium priority', value: groupedTasks.medium.length, tone: 'text-blue-500' },
    { label: 'Low priority', value: groupedTasks.low.length, tone: 'text-green-500' },
  ];

  if (currentScreen === 'success' && checkoutSessionId) {
    return <SuccessScreen onContinue={handleSuccessContinue} sessionId={checkoutSessionId} />;
  }

  return (
    <div className="min-h-screen bg-background app-shell">
      {currentScreen === 'home' && (
        <div className="mx-auto max-w-6xl px-4 py-5 pb-24 sm:py-6 lg:px-6">
          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
              <div className="surface-panel rounded-[1.75rem] border p-5 shadow-sm">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <h1 className="text-3xl font-bold">Task Do</h1>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Plan your day with fewer taps and clearer priorities.
                    </p>
                  </div>
                  {isPremium ? <PremiumBadge size="sm" /> : null}
                </div>

                <div className="grid grid-cols-3 gap-2.5 lg:grid-cols-1">
                  {prioritySummary.map((item) => (
                    <div key={item.label} className="rounded-2xl bg-muted/60 p-3 lg:p-4">
                      <div className={`text-2xl font-bold ${item.tone}`}>{item.value}</div>
                      <div className="text-xs text-muted-foreground">{item.label}</div>
                    </div>
                  ))}
                </div>

                {!isPremium ? (
                  <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Active tasks</p>
                        <p className="text-2xl font-bold">
                          {activeTasks.length} / {FREE_TASK_LIMIT}
                        </p>
                      </div>
                      <Button
                        className="h-9 px-3"
                        onClick={() => {
                          setUpgradeModalTrigger(taskLimitReached ? 'task_limit' : 'manual');
                          setShowUpgradeModal(true);
                        }}
                        variant={taskLimitReached ? 'default' : 'outline'}
                      >
                        Upgrade
                      </Button>
                    </div>

                    {!taskLimitReached && activeTasks.length >= FREE_TASK_LIMIT - 10 ? (
                      <p className="mt-3 text-xs leading-5 text-amber-700 dark:text-amber-300">
                        You are getting close to the free plan limit.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <p className="text-sm font-medium text-foreground">Premium is active</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Unlimited tasks and billing controls are available in Settings.
                    </p>
                  </div>
                )}
              </div>
            </aside>

            <section className="min-w-0">
              <div className="surface-panel mb-5 rounded-[1.75rem] border p-4 shadow-sm sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">Today&apos;s flow</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {activeTasks.length === 0
                        ? 'You are clear for now. Add a task when something new comes up.'
                        : `${activeTasks.length} active task${activeTasks.length === 1 ? '' : 's'} across your current priorities.`}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                    {!isPremium ? (
                      <Button
                        className="h-9 bg-gradient-to-r from-amber-500 to-orange-500 px-3 text-xs hover:from-amber-600 hover:to-orange-600 sm:text-sm"
                        onClick={() => {
                          setUpgradeModalTrigger('manual');
                          setShowUpgradeModal(true);
                        }}
                        size="sm"
                      >
                        <Crown className="mr-2 h-4 w-4" />
                        Upgrade
                      </Button>
                    ) : null}

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCurrentScreen('notifications')}
                      className="relative"
                    >
                      <Bell className="h-5 w-5" />
                      {activeTasks.filter((task) => task.notificationEnabled).length > 0 ? (
                        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                          {activeTasks.filter((task) => task.notificationEnabled).length}
                        </span>
                      ) : null}
                    </Button>

                    <Button variant="ghost" size="icon" onClick={toggleTheme}>
                      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </Button>

                    <Button variant="ghost" size="icon" onClick={() => setCurrentScreen('settings')}>
                      <Settings className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>

              {activeTasks.length === 0 ? (
                <div className="surface-panel rounded-[1.75rem] border px-4 py-12 text-center shadow-sm sm:px-6">
                  <button
                    type="button"
                    onClick={handleAddTask}
                    className="mb-4 inline-flex rounded-full bg-muted p-4 transition hover:scale-105 hover:bg-muted/80"
                    aria-label="Add task"
                  >
                    <Plus className="h-8 w-8 text-muted-foreground" />
                  </button>
                  <h3 className="mb-2 font-semibold">No tasks yet</h3>
                  <p className="mx-auto max-w-sm text-sm leading-6 text-muted-foreground">
                    Keep the list light. Add your next task only when it deserves attention.
                  </p>
                </div>
              ) : null}
              <div className="space-y-6">
                {groupedTasks.high.length > 0 ? (
                  <div>
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      High Priority
                    </h2>
                    <div className="space-y-3">
                      {groupedTasks.high.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onToggleComplete={handleToggleComplete}
                          onDelete={handleDelete}
                          onEdit={handleEdit}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}

                {groupedTasks.medium.length > 0 ? (
                  <div>
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Medium Priority
                    </h2>
                    <div className="space-y-3">
                      {groupedTasks.medium.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onToggleComplete={handleToggleComplete}
                          onDelete={handleDelete}
                          onEdit={handleEdit}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}

                {groupedTasks.low.length > 0 ? (
                  <div>
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Low Priority
                    </h2>
                    <div className="space-y-3">
                      {groupedTasks.low.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onToggleComplete={handleToggleComplete}
                          onDelete={handleDelete}
                          onEdit={handleEdit}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}

                {completedTasks.length > 0 ? (
                  <div className="surface-panel rounded-[1.75rem] border p-4 shadow-sm sm:p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Completed
                      </h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearCompleted}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear All
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {completedTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onToggleComplete={handleToggleComplete}
                          onDelete={handleDelete}
                          onEdit={handleEdit}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </div>

          <Button
            size="lg"
            className="fixed bottom-5 right-5 h-14 w-14 rounded-full shadow-lg sm:bottom-6 sm:right-6"
            onClick={handleAddTask}
          >
            <Plus className="h-6 w-6" />
          </Button>

          {taskLimitReached ? (
            <div className="fixed bottom-24 right-4 max-w-[11rem] rounded-xl bg-amber-500 px-3 py-2 text-sm font-medium text-white shadow-lg sm:right-6">
              Free limit reached
            </div>
          ) : null}
        </div>
      )}

      {(currentScreen === 'add' || currentScreen === 'edit') && (
        <AddEditTaskScreen
          task={editingTask}
          onSave={handleSaveTask}
          onCancel={handleCancelEdit}
        />
      )}

      {currentScreen === 'notifications' && (
        <NotificationsScreen
          tasks={tasks}
          onClose={() => setCurrentScreen('home')}
          onToggleNotification={handleToggleNotification}
        />
      )}

      {currentScreen === 'settings' && (
        <SettingsScreen
          activeTaskCount={activeTasks.length}
          onClose={() => setCurrentScreen('home')}
          onUpgrade={() => {
            setCurrentScreen('home');
            setUpgradeModalTrigger('manual');
            setShowUpgradeModal(true);
          }}
        />
      )}

      {showUpgradeModal ? (
        <UpgradeModal
          onClose={() => setShowUpgradeModal(false)}
          trigger={upgradeModalTrigger}
        />
      ) : null}

      {alarmingTask ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-pulse">
          <div className="w-full max-w-sm rounded-3xl border-4 border-red-500 bg-background p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                <div className="relative rounded-full bg-red-500 p-6">
                  <Bell className="h-12 w-12 animate-bounce text-white" />
                </div>
              </div>
            </div>

            <div className="mb-6 text-center">
              <h2 className="mb-2 text-2xl font-bold">Task Reminder!</h2>
              <h3 className="mb-3 text-xl font-semibold text-red-500">{alarmingTask.name}</h3>
              {alarmingTask.description ? (
                <p className="mb-4 text-muted-foreground">{alarmingTask.description}</p>
              ) : null}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Bell className="h-4 w-4" />
                <span>
                  {new Date(alarmingTask.alarmTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <Button className="h-12 w-full" onClick={dismissAlarm} size="lg">
                Dismiss Alarm
              </Button>
              <Button variant="outline" className="h-12 w-full" onClick={snoozeAlarm} size="lg">
                Snooze (5 min)
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <SubscriptionProvider>
        <AppContent />
      </SubscriptionProvider>
    </ThemeProvider>
  );
}
