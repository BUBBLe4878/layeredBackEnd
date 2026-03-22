const LAPSE_ENDPOINT = 'https://api.lapse.hackclub.com/api';

export function getIdFromLapseUrl(url: string) {
	return url.match(/^https:\/\/lapse\.hackclub\.com\/timelapse\/([^\s/?#]+)$/)?.[1] ?? null;
}

export type Lapse =
	| { ok: false; error: string; message: string }
	| {
			ok: true;
			timelapse: {
				name: string;
				description: string;
				createdAt: Date;
				playbackUrl: string;
				thumbnailUrl: string;
				duration: number;
				durationMins: number;
			};
	  };

export async function getLapse(id: string): Promise<Lapse> {
	const res = await fetch(`${LAPSE_ENDPOINT}/timelapse/query?id=${encodeURIComponent(id)}`);

	const resJson = await res.json();

	if (resJson.ok) {
		const timelapse = resJson.data!.timelapse!;

		return {
			ok: true,
			timelapse: {
				name: timelapse.name!,
				description: timelapse.description!,
				createdAt: new Date(timelapse.createdAt!),
				playbackUrl: timelapse.playbackUrl!,
				thumbnailUrl: timelapse.thumbnailUrl!,
				duration: timelapse.duration!,
				durationMins: Math.round(timelapse.duration! / 60.0)
			}
		};
	} else {
		return {
			ok: false,
			error: resJson.error!,
			message: resJson.message!
		};
	}
}
