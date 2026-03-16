import { db } from '$lib/server/db/index.js';
import { devlog, project, clubMembership, club } from '$lib/server/db/schema.js';
import { error, fail, redirect } from '@sveltejs/kit';
import { eq, and, or, sql } from 'drizzle-orm';
import type { Actions } from './$types';
import { sendSlackDM } from '$lib/server/slack.js';
import { isValidUrl } from '$lib/utils';
import { extname } from 'path';
import { env } from '$env/dynamic/private';
import { ship } from '$lib/server/db/schema.js';
import { sanitizeUrl } from '@braintree/sanitize-url';
import { verifyUpload } from '$lib/server/uploads';

const ALLOWED_SHIP_MODEL_TYPES = [
	'model/3mf',
	'application/vnd.ms-package.3dmanufacturing-3dmodel+xml',
	'application/vnd.ms-3mfdocument',
	'application/octet-stream',
	'text/plain'
];

export async function load({ params, locals }) {
	const id: number = parseInt(params.id);

	if (!locals.user) {
		throw error(500);
	}

	const [queriedProject] = await db
		.select({
			id: project.id,
			name: project.name,
			description: project.description,

			url: project.url,
			editorFileType: project.editorFileType,
			editorUrl: project.editorUrl,
			uploadedFileUrl: project.uploadedFileUrl,
			modelFile: project.modelFile,

			createdAt: project.createdAt,
			status: project.status,
			timeSpent: sql<number>`COALESCE(SUM(${devlog.timeSpent}), 0)`,
			devlogCount: sql<number>`COALESCE(COUNT(${devlog.id}), 0)`
		})
		.from(project)
		.leftJoin(devlog, and(eq(project.id, devlog.projectId), eq(devlog.deleted, false)))
		.where(
			and(
				eq(project.id, id),
				eq(project.userId, locals.user.id),
				eq(project.deleted, false),
				or(eq(project.status, 'building'), eq(project.status, 'rejected'))
			)
		)
		.groupBy(
			project.id,
			project.name,
			project.description,
			project.url,
			project.createdAt,
			project.status
		)
		.limit(1);

	if (!queriedProject) {
		throw error(404);
	}

	// Check if user has a club membership
	const membership = await db
		.select({
			clubId: clubMembership.clubId,
			clubName: club.name
		})
		.from(clubMembership)
		.innerJoin(club, eq(clubMembership.clubId, club.id))
		.where(eq(clubMembership.userId, locals.user.id))
		.limit(1);

	return {
		project: queriedProject,
		clubMembership: membership.length > 0 ? membership[0] : null
	};
}

export const actions = {
	default: async ({ locals, params, request }) => {
		if (!locals.user) {
			throw error(500);
		}

		const id: number = parseInt(params.id);

		const data = await request.formData();
		const printablesUrl = data.get('printables_url');
		const editorUrl = data.get('editor_url');
		const editorKey = data.get('editorKey')?.toString();
		const modelKey = data.get('modelKey')?.toString();
		const submitAsClub = data.get('submit_as_club') === 'true';

		const printablesUrlString =
			printablesUrl && printablesUrl.toString() ? sanitizeUrl(printablesUrl.toString()) : null;

		const printablesUrlValid =
			printablesUrlString &&
			printablesUrlString.trim().length < 8000 &&
			isValidUrl(printablesUrlString.trim()) &&
			printablesUrlString !== 'about:blank';

		if (!printablesUrlValid) {
			return fail(400, {
				invalid_printables_url: true
			});
		}

		const printablesUrlObj = new URL(printablesUrlString.trim());

		const pathMatch = printablesUrlObj.pathname.match(/\/model\/(\d+)/);
		const modelId = pathMatch ? pathMatch[1] : '';

		const allowedLicenseIds = (env.PRINTABLES_ALLOWED_LICENSES_ID ?? '7,1,2,9,12,10,11')
			.split(',')
			.map((s) => s.trim())
			.filter((s) => s.length > 0);
		if (allowedLicenseIds.length === 0) {
			return error(500, { message: 'license validation not configured' });
		}

		try {
			const graphqlResponse = await fetch('https://api.printables.com/graphql/', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					operationName: 'PrintDetail',
					query: `query PrintDetail($id: ID!) {
					print(id: $id) {
						id
						name
						license {
							id
							name
						}
					}
				}`,
					variables: { id: modelId }
				})
			});
			if (!graphqlResponse.ok) {
				return fail(400, {
					invalid_printables_url: true
				});
			}
			const graphqlData = await graphqlResponse.json();
			const license = graphqlData?.data?.print?.license;

			if (!license || !license.id) {
				return fail(400, {
					invalid_printables_url: true
				});
			}

			const licenseMatch = allowedLicenseIds.some((allowed) => allowed === license.id.toString());

			if (!licenseMatch) {
				return fail(400, {
					invalid_license: true
				});
			}
		} catch {
			return fail(400, {
				invalid_printables_url: true
			});
		}

		// Editor URL
		const editorUrlExists = editorUrl && editorUrl.toString();

		const editorUrlString = editorUrlExists ? sanitizeUrl(editorUrl.toString()) : null;

		const editorUrlValid =
			editorUrlString && editorUrlString.trim().length < 8000 && isValidUrl(editorUrlString.trim());

		if (editorUrlExists && (!editorUrlValid || editorUrlString === 'about:blank')) {
			return fail(400, {
				invalid_editor_url: true
			});
		}

		// Editor file key
		const editorKeyExists = !!editorKey;

		if (!editorUrlExists && !editorKeyExists) {
			return error(400, { message: "editor file or url doesn't exist" });
		}

		if (editorUrlExists && editorKeyExists) {
			return error(400, { message: 'editor file or url both exist' });
		}

		if (editorKeyExists) {
			if (!editorKey.startsWith('ships/editor-files/')) {
				return fail(400, { invalid_editor_file: true });
			}
			const editorVerified = await verifyUpload(editorKey, []);
			if (!editorVerified) {
				return fail(400, { invalid_editor_file: true });
			}
		}

		// Model file key
		if (!modelKey || !modelKey.startsWith('ships/models/')) {
			return fail(400, { invalid_model_file: true });
		}

		const ext = extname(modelKey).toLowerCase();
		if (ext !== '.3mf') {
			return fail(400, { invalid_model_file: true });
		}

		const modelVerified = await verifyUpload(modelKey, ALLOWED_SHIP_MODEL_TYPES);
		if (!modelVerified) {
			return fail(400, { invalid_model_file: true });
		}

		const [queriedProject] = await db
			.select({
				id: project.id,
				name: project.name,
				description: project.description,
				url: project.url,
				timeSpent: sql<number>`COALESCE(SUM(${devlog.timeSpent}), 0)`,
				devlogCount: sql<number>`COALESCE(COUNT(${devlog.id}), 0)`
			})
			.from(project)
			.leftJoin(devlog, and(eq(project.id, devlog.projectId), eq(devlog.deleted, false)))
			.where(
				and(
					eq(project.id, id),
					eq(project.userId, locals.user.id),
					eq(project.deleted, false),
					or(eq(project.status, 'building'), eq(project.status, 'rejected'))
				)
			)
			.groupBy(project.id, project.name, project.description, project.url)
			.limit(1);

		if (!queriedProject) {
			return error(404, { message: 'project not found' });
		}

		// Make sure it has at least 2h
		if (queriedProject.timeSpent < 120) {
			return error(400, { message: 'minimum 2h needed to ship' });
		}

		// Make sure it has at least 2 devlogs
		if (queriedProject.devlogCount < 2) {
			return error(400, { message: 'minimum 2 journal logs required to ship' });
		}

		if (queriedProject.description == '') {
			return error(400, { message: 'project must have a description' });
		}

		await db
			.update(project)
			.set({
				status: 'submitted',
				url: printablesUrlString,
				editorFileType: editorUrlExists ? 'url' : 'upload',
				editorUrl: editorUrlExists ? editorUrlString : undefined,
				uploadedFileUrl: editorKeyExists ? editorKey : undefined,

				modelFile: modelKey
			})
			.where(
				and(
					eq(project.id, queriedProject.id),
					eq(project.userId, locals.user.id),
					eq(project.deleted, false)
				)
			);

		// Get club ID if submitting as club
		let clubIdForShip: number | null = null;
		if (submitAsClub) {
			const [membership] = await db
				.select({ clubId: clubMembership.clubId })
				.from(clubMembership)
				.where(eq(clubMembership.userId, locals.user.id))
				.limit(1);
			if (membership) {
				clubIdForShip = membership.clubId;
			}
		}

		await db.insert(ship).values({
			userId: locals.user.id,
			projectId: queriedProject.id,
			url: printablesUrlString,

			editorFileType: editorUrlExists ? 'url' : 'upload',
			editorUrl: editorUrlExists ? editorUrlString : undefined,
			uploadedFileUrl: editorKeyExists ? editorKey : undefined,

			modelFile: modelKey,
			clubId: clubIdForShip
		});

		await sendSlackDM(
			locals.user.slackId,
			`Hii :hyper-dino-wave:\n Your project <https://construct.hackclub.com/dashboard/projects/${queriedProject.id}|${queriedProject.name}> has been shipped and is now under review, we'll take a look and get back to you soon! :woooo:`
		);

		return redirect(303, '/dashboard/projects');
	}
} satisfies Actions;
