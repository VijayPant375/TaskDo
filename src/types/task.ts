export interface Task {
  id: string;
  name: string;
  description: string;
  deadline: Date;
  priority: 'high' | 'medium' | 'low';
  notificationEnabled: boolean;
  alarmTime: Date;
  completed: boolean;
}

export interface TaskApiPayload {
  id: string;
  name: string;
  description: string;
  deadline: string;
  priority: 'high' | 'medium' | 'low';
  notificationEnabled: boolean;
  alarmTime: string;
  completed: boolean;
}
