import { apiDelete, apiGet, apiPost, apiPut } from './api';
import type { Task, TaskApiPayload } from '../types/task';

function fromApi(task: TaskApiPayload): Task {
  return {
    ...task,
    alarmTime: new Date(task.alarmTime),
    deadline: new Date(task.deadline),
  };
}

function toApi(task: Omit<Task, 'id'> | Task) {
  return {
    ...task,
    alarmTime: task.alarmTime.toISOString(),
    deadline: task.deadline.toISOString(),
  };
}

export async function fetchTasks() {
  const tasks = await apiGet<TaskApiPayload[]>('/api/tasks');
  return tasks.map(fromApi);
}

export async function createTask(task: Omit<Task, 'id'>) {
  const created = await apiPost<TaskApiPayload>('/api/tasks', toApi(task));
  return fromApi(created);
}

export async function updateTask(task: Task) {
  const updated = await apiPut<TaskApiPayload>(`/api/tasks/${task.id}`, toApi(task));
  return fromApi(updated);
}

export async function deleteTask(taskId: string) {
  await apiDelete<void>(`/api/tasks/${taskId}`);
}

export async function importTasks(tasks: Task[]) {
  const imported = await apiPost<TaskApiPayload[]>('/api/tasks/import', {
    tasks: tasks.map(toApi),
  });

  return imported.map(fromApi);
}
