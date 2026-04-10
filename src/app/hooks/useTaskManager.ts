import { useEffect, useMemo, useState } from 'react';
import { createTask, deleteTask, fetchTasks, updateTask } from '../../services/tasks';
import type { Task } from '../../types/task';

export function useTaskManager(isAuthenticated: boolean, isAuthLoading: boolean) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isTasksLoading, setIsTasksLoading] = useState(false);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!isAuthenticated) {
      setTasks([]);
      setIsTasksLoading(false);
      return;
    }

    const loadAuthenticatedTasks = async () => {
      setIsTasksLoading(true);

      try {
        const remoteTasks = await fetchTasks();
        setTasks(remoteTasks);
      } catch (error) {
        console.error('Failed to sync tasks for the authenticated user.', error);
      } finally {
        setIsTasksLoading(false);
      }
    };

    void loadAuthenticatedTasks();
  }, [isAuthenticated, isAuthLoading]);

  const persistTaskUpdate = async (nextTask: Task) => {
    const updated = await updateTask(nextTask);
    setTasks((prev) => prev.map((task) => (task.id === updated.id ? updated : task)));
    return updated;
  };

  const saveTask = async (taskData: Omit<Task, 'id'>, editingTask: Task | null) => {
    if (editingTask) {
      const updatedTask = await updateTask({ ...taskData, id: editingTask.id });
      setTasks((prev) => prev.map((task) => (task.id === updatedTask.id ? updatedTask : task)));
      return updatedTask;
    }

    const createdTask = await createTask(taskData);
    setTasks((prev) => [...prev, createdTask]);
    return createdTask;
  };

  const removeTask = async (taskId: string) => {
    await deleteTask(taskId);
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  };

  const clearCompletedTasks = async () => {
    const completedTaskIds = tasks.filter((task) => task.completed).map((task) => task.id);
    await Promise.all(completedTaskIds.map((taskId) => deleteTask(taskId)));
    setTasks((prev) => prev.filter((task) => !task.completed));
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

  const activeTasks = useMemo(() => tasks.filter((task) => !task.completed), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((task) => task.completed), [tasks]);

  return {
    activeTasks,
    clearCompletedTasks,
    completedTasks,
    groupedTasks,
    isTasksLoading,
    persistTaskUpdate,
    removeTask,
    saveTask,
    setTasks,
    tasks,
  };
}
