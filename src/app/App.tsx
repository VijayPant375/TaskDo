import { ThemeProvider, useTheme } from 'next-themes';
import { Bell, Crown, LogOut, Moon, Plus, Settings, Sparkles, Sun, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SubscriptionProvider, useSubscription } from '../context/SubscriptionContext';
import { FREE_TASK_LIMIT } from '../types/subscription';
import { AddEditTaskScreen } from './components/AddEditTaskScreen';
import { AuthLandingScreen } from './components/AuthLandingScreen';
import { NotificationsScreen } from './components/NotificationsScreen';
import { PremiumBadge } from './components/PremiumBadge';
import { SettingsScreen } from './components/SettingsScreen';
import { SuccessScreen } from './components/SuccessScreen';
import { TaskCard } from './components/TaskCard';
import { TaskListSkeleton } from './components/TaskListSkeleton';
import { UpgradeModal } from './components/UpgradeModal';
import { Button } from './components/ui/button';
import { useAlarmManager } from './hooks/useAlarmManager';
import { useAppScreenState } from './hooks/useAppScreenState';
import { useTaskManager } from './hooks/useTaskManager';

function AppContent() {
  const { theme, setTheme } = useTheme();
  const { canCreateTask, isPremium } = useSubscription();
  const {
    googleOAuthEnabled,
    isAuthenticated,
    isLoading: isAuthLoading,
    loginWithPassword,
    signInWithGoogle,
    signUpWithPassword,
    signOut,
    user,
  } = useAuth();
  const {
    beginAddTask,
    beginEditTask,
    checkoutSessionId,
    closeUpgradeModal,
    completeCheckoutFlow,
    currentScreen,
    editingTask,
    finishTaskEditor,
    openUpgradeModal,
    setCurrentScreen,
    showUpgradeModal,
    upgradeModalTrigger,
  } = useAppScreenState();
  const {
    activeTasks,
    clearCompletedTasks,
    completedTasks,
    groupedTasks,
    isTasksLoading,
    persistTaskUpdate,
    removeTask,
    saveTask,
    tasks,
  } = useTaskManager(isAuthenticated, isAuthLoading);
  const { alarmingTask, dismissAlarm, snoozeAlarm } = useAlarmManager({
    onSnoozeTask: async (task, alarmTime) => {
      try {
        await persistTaskUpdate({ ...task, alarmTime: new Date(alarmTime) });
      } catch (error) {
        console.error('Failed to snooze task alarm.', error);
      }
    },
    tasks,
  });

  const handleToggleComplete = (id: string) => {
    const target = tasks.find((task) => task.id === id);
    if (!target) {
      return;
    }

    void persistTaskUpdate({ ...target, completed: !target.completed }).catch((error) => {
      console.error('Failed to update task.', error);
    });
  };

  const handleDelete = (id: string) => {
    void removeTask(id).catch((error) => {
      console.error('Failed to delete task.', error);
    });
  };

  const handleAddTask = () => {
    if (!canCreateTask(activeTasks.length)) {
      openUpgradeModal('task_limit');
      return;
    }

    beginAddTask();
  };

  const handleSaveTask = (taskData: Omit<(typeof tasks)[number], 'id'>) => {
    void saveTask(taskData, editingTask)
      .then(() => {
        finishTaskEditor();
      })
      .catch((error) => {
        if (
          error instanceof Error &&
          error.message.toLowerCase().includes('free plan task limit reached')
        ) {
          openUpgradeModal('task_limit');
          return;
        }

        console.error('Failed to save task.', error);
      });
  };

  const handleToggleNotification = (id: string) => {
    const target = tasks.find((task) => task.id === id);
    if (!target) {
      return;
    }

    void persistTaskUpdate({
      ...target,
      notificationEnabled: !target.notificationEnabled,
    }).catch((error) => {
      console.error('Failed to update task notification.', error);
    });
  };

  const handleClearCompleted = () => {
    void clearCompletedTasks().catch((error) => {
      console.error('Failed to clear completed tasks.', error);
    });
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const taskLimitReached = !isPremium && activeTasks.length >= FREE_TASK_LIMIT;
  const prioritySummary = [
    { label: 'High priority', value: groupedTasks.high.length, tone: 'text-red-500' },
    { label: 'Medium priority', value: groupedTasks.medium.length, tone: 'text-blue-500' },
    { label: 'Low priority', value: groupedTasks.low.length, tone: 'text-green-500' },
  ];
  const userInitial = user?.name?.charAt(0).toUpperCase() ?? 'T';

  if (currentScreen === 'success' && checkoutSessionId) {
    return <SuccessScreen onContinue={completeCheckoutFlow} sessionId={checkoutSessionId} />;
  }

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="surface-panel w-full max-w-md rounded-[2rem] border px-8 py-10 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold">Preparing TaskDo</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Restoring your account session and workspace.
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthLandingScreen
        googleOAuthEnabled={googleOAuthEnabled}
        isLoading={isAuthLoading}
        onLogin={loginWithPassword}
        onContinueWithGoogle={signInWithGoogle}
        onSignUp={signUpWithPassword}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background app-shell">
      {currentScreen === 'home' && (
        <div className="screen-transition mx-auto max-w-7xl px-4 py-4 pb-24 sm:py-6 lg:px-6">
          <header className="surface-panel mb-5 rounded-[1.75rem] border border-white/20 px-4 py-4 shadow-sm sm:mb-6 sm:px-6 sm:py-5">
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-[1.15rem] bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg sm:h-14 sm:w-14">
                  <Sparkles className="h-7 w-7" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">TaskDo</h1>
                    {isPremium ? <PremiumBadge size="sm" /> : null}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Welcome back, {user?.name ?? 'there'}. Your tasks are synced to your account.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  {!isPremium ? (
                    <Button
                      className="h-10 bg-gradient-to-r from-amber-500 to-orange-500 px-4 hover:from-amber-600 hover:to-orange-600"
                      onClick={() => openUpgradeModal('manual')}
                      size="sm"
                    >
                      <Crown className="mr-2 h-4 w-4" />
                      Upgrade
                    </Button>
                  ) : null}

                  <Button
                    className="relative"
                    onClick={() => setCurrentScreen('notifications')}
                    size="icon"
                    variant="ghost"
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

                <div className="flex items-center justify-between gap-3 rounded-[1.3rem] border border-border/70 bg-muted/75 px-3 py-2 shadow-sm backdrop-blur sm:justify-start sm:rounded-full">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {userInitial}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium leading-5">{user?.name}</p>
                      <p className="truncate text-xs text-muted-foreground/90">{user?.email}</p>
                    </div>
                  </div>
                  <Button className="shrink-0 rounded-full" onClick={() => void signOut()} variant="outline">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Sign out</span>
                  </Button>
                </div>
              </div>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
              <div className="surface-panel rounded-[1.9rem] border border-white/20 p-5 shadow-sm">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-[-0.03em]">Focus dashboard</h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      A structured snapshot of what needs attention next.
                    </p>
                  </div>
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
                        className="h-9 shrink-0 px-3"
                        onClick={() => openUpgradeModal(taskLimitReached ? 'task_limit' : 'manual')}
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
                      Unlimited tasks and account controls are ready whenever you need them.
                    </p>
                  </div>
                )}
              </div>
            </aside>

            <section className="min-w-0">
              <div className="surface-panel mb-5 rounded-[1.9rem] border border-white/20 p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Today&apos;s flow</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {isTasksLoading
                        ? 'Loading your tasks...'
                        : activeTasks.length === 0
                          ? 'You are clear for now. Add a task when something new comes up.'
                          : `${activeTasks.length} active task${activeTasks.length === 1 ? '' : 's'} across your current priorities.`}
                    </p>
                  </div>

                  <div className="w-fit rounded-full border border-border/70 bg-muted/75 px-4 py-2 text-sm font-medium text-foreground shadow-sm backdrop-blur">
                    {completedTasks.length} completed today
                  </div>
                </div>
              </div>

              {isTasksLoading ? <TaskListSkeleton /> : null}

              {activeTasks.length === 0 && !isTasksLoading ? (
                <div className="surface-panel rounded-[1.9rem] border border-white/20 px-4 py-12 text-center shadow-sm sm:px-6">
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

              {!isTasksLoading ? (
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
                            onEdit={beginEditTask}
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
                            onEdit={beginEditTask}
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
                            onEdit={beginEditTask}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {completedTasks.length > 0 ? (
                    <div className="surface-panel rounded-[1.9rem] border border-white/20 p-4 shadow-sm sm:p-5">
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
                            onEdit={beginEditTask}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          </div>

          <Button
            size="lg"
            className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg sm:bottom-6 sm:right-6"
            onClick={handleAddTask}
          >
            <Plus className="h-6 w-6" />
          </Button>

          {taskLimitReached ? (
            <div className="fixed bottom-24 left-4 right-20 rounded-xl bg-amber-500 px-3 py-2 text-sm font-medium text-white shadow-lg sm:left-auto sm:right-6 sm:max-w-[11rem]">
              Free limit reached
            </div>
          ) : null}
        </div>
      )}

      {(currentScreen === 'add' || currentScreen === 'edit') && (
        <AddEditTaskScreen task={editingTask} onSave={handleSaveTask} onCancel={finishTaskEditor} />
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
            openUpgradeModal('manual');
          }}
        />
      )}

      {showUpgradeModal ? <UpgradeModal onClose={closeUpgradeModal} trigger={upgradeModalTrigger} /> : null}

      {alarmingTask ? (
        <div className="fixed inset-0 z-50 flex animate-pulse items-center justify-center bg-black/80 p-4">
          <div className="animate-in fade-in zoom-in w-full max-w-sm rounded-3xl border-4 border-red-500 bg-background p-8 shadow-2xl duration-300">
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-red-500/20" />
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
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <SubscriptionProvider>
        <AppContent />
      </SubscriptionProvider>
    </ThemeProvider>
  );
}
