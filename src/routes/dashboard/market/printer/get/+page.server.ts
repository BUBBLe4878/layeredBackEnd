import { db } from '$lib/server/db/index.js';
import { user } from '$lib/server/db/schema.js';
import { error, redirect } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import type { Actions } from './$types';

export async function load({ locals }) {
	if (!locals.user) {
		throw error(500);
	}
}

export const actions = {
	default: async ({ locals }) => {
		if (!locals.user) {
			throw error(500);
		}

		await db
			.update(project)
			.set({
				deleted: true,
				updatedAt: new Date(Date.now())
			})
			.where(
				and(
					eq(project.id, queriedProject.id),
					eq(project.userId, locals.user.id),
					eq(project.deleted, false)
				)
			);

		return redirect(303, '/dashboard/projects');
	}
} satisfies Actions;
