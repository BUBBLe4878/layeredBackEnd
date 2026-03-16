import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { S3 } from '$lib/server/s3';
import { env } from '$env/dynamic/private';
import { extname } from 'path';
import {
	ALLOWED_IMAGE_TYPES,
	ALLOWED_MODEL_TYPES,
	ALLOWED_MODEL_EXTS,
	MAX_UPLOAD_SIZE
} from '../../projects/[id]/config';

const ALLOWED_SHIP_MODEL_TYPES = [
	'model/3mf',
	'application/vnd.ms-package.3dmanufacturing-3dmodel+xml',
	'application/vnd.ms-3mfdocument',
	'application/octet-stream',
	'text/plain'
];

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		throw error(401);
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}

	if (!body || typeof body !== 'object') {
		throw error(400, 'Invalid request body');
	}

	const { uploadType, contentType, fileName, fileSize } = body as Record<string, unknown>;

	if (
		typeof uploadType !== 'string' ||
		typeof contentType !== 'string' ||
		typeof fileName !== 'string' ||
		typeof fileSize !== 'number'
	) {
		throw error(400, 'Invalid request parameters');
	}

	if (fileSize <= 0 || fileSize > MAX_UPLOAD_SIZE) {
		throw error(400, 'Invalid file size');
	}

	const ext = extname(fileName).toLowerCase();
	let keyPrefix: string;

	switch (uploadType) {
		case 'devlog_image':
			if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
				throw error(400, 'Invalid image type');
			}
			keyPrefix = 'images';
			break;

		case 'devlog_model':
			if (!ALLOWED_MODEL_TYPES.includes(contentType) || !ALLOWED_MODEL_EXTS.includes(ext)) {
				throw error(400, 'Invalid model type');
			}
			keyPrefix = 'models';
			break;

		case 'ship_model':
			if (!ALLOWED_SHIP_MODEL_TYPES.includes(contentType) || ext !== '.3mf') {
				throw error(400, 'Invalid ship model type');
			}
			keyPrefix = 'ships/models';
			break;

		case 'ship_editor':
			// Any file type is allowed for editor files
			keyPrefix = 'ships/editor-files';
			break;

		default:
			throw error(400, 'Invalid upload type');
	}

	const key = `${keyPrefix}/${crypto.randomUUID()}${ext}`;

	const command = new PutObjectCommand({
		Bucket: env.S3_BUCKET_NAME,
		Key: key,
		ContentType: contentType,
		ContentLength: fileSize
	});

	const presignedUrl = await getSignedUrl(S3, command, { expiresIn: 300 });

	return json({ presignedUrl, key });
};
