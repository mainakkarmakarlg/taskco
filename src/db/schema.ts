import { pgTable, pgEnum, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const users = pgTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const todos = pgTable('todos', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  completed: boolean('completed').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const taskStatusEnum = pgEnum('task_status', ['TODO', 'IN_PROGRESS', 'DONE']);
export const priorityEnum = pgEnum('priority', ['LOW', 'MEDIUM', 'HIGH']);

export const projects = pgTable('projects', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color').notNull().default('#3b82f6'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tasks = pgTable('tasks', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  title: text('title').notNull(),
  description: text('description'),
  status: taskStatusEnum('status').default('TODO').notNull(),
  priority: priorityEnum('priority').default('MEDIUM').notNull(),
  dueDate: timestamp('due_date'),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
}));
