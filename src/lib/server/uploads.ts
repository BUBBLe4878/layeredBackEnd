import { HeadObjectCommand } from '@aws-sdk/client-s3';
import { env } from '$env/dynamic/private';
import { S3 } from './s3';
import { MAX_UPLOAD_SIZE } from '../../routes/dashboard/projects/[id]/config';

/**
 * Verifies that a file was successfully uploaded to R2 and meets the given constraints.
 * @param key - The R2 object key
 * @param allowedContentTypes - Allowed MIME types. Pass an empty array to skip content-type validation.
 */
export async function verifyUpload(key: string, allowedContentTypes: string[]): Promise<boolean> {
	try {
		const head = await S3.send(
			new HeadObjectCommand({
				Bucket: env.S3_BUCKET_NAME,
				Key: key
			})
		);

		if ((head.ContentLength ?? 0) > MAX_UPLOAD_SIZE) {
			return false;
		}

		if (allowedContentTypes.length > 0 && !allowedContentTypes.includes(head.ContentType ?? '')) {
			return false;
		}

		return true;
	} catch {
		return false;
	}
}
