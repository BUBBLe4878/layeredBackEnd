<script lang="ts">
	import CharCountedTextarea from '$lib/components/CharCountedTextarea.svelte';

	import { SquarePen, ExternalLink, Trash, Ship, Lock, Download, Link } from '@lucide/svelte';
	import relativeDate from 'tiny-relative-date';
	import type { PageProps } from './$types';
	import Devlog from '$lib/components/Devlog.svelte';
	import { ALLOWED_IMAGE_TYPES, ALLOWED_MODEL_EXTS, MAX_UPLOAD_SIZE } from './config';
	import { projectStatuses } from '$lib/utils';
	import { applyAction, deserialize } from '$app/forms';
	import Head from '$lib/components/Head.svelte';
	import ProjectLinks from '$lib/components/ProjectLinks.svelte';
	import Spinny3DPreview from '$lib/components/Spinny3DPreview.svelte';

	const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

	let { data, form }: PageProps = $props();
	let sortDropdownValue = $state('descending');
	let sortDevlogsAscending = $derived.by(() => sortDropdownValue == 'ascending');

	let editable = $derived(data.project.status == 'building' || data.project.status == 'rejected');

	let description = $state(form?.fields?.description ?? '');

	let timeSpent = $state(
		form?.fields?.timeSpent?.toString()
			? (parseInt(form?.fields?.timeSpent?.toString()) ?? data.validationConstraints.timeSpent.min)
			: data.validationConstraints.timeSpent.min
	);

	function onchange() {
		timeSpent = clamp(
			timeSpent,
			data.validationConstraints.timeSpent.min,
			data.validationConstraints.timeSpent.currentMax
		);
	}

	let formPending = $state(false);
	let uploadError = $state<string | null>(null);
	let imageInput: HTMLInputElement | undefined = $state();
	let modelInput: HTMLInputElement | undefined = $state();
	let imagePreviewUrl = $state<string | null>(null);
	let formElement: HTMLFormElement | undefined = $state();

	// Cleanup preview URL on component unmount
	$effect(() => {
		return () => {
			if (imagePreviewUrl) {
				URL.revokeObjectURL(imagePreviewUrl);
			}
		};
	});

	function updateImagePreview() {
		if (imagePreviewUrl) {
			URL.revokeObjectURL(imagePreviewUrl);
			imagePreviewUrl = null;
		}

		if (imageInput?.files && imageInput.files.length > 0) {
			const file = imageInput.files[0];
			imagePreviewUrl = URL.createObjectURL(file);
		}
	}

	function handlePaste(e: ClipboardEvent) {
		if (!imageInput) return;

		const items = e.clipboardData?.items;
		if (!items) return;

		for (let index = 0; index < items.length; index++) {
			const item = items[index];
			if (item.type.startsWith('image/')) {
				const blob = item.getAsFile();
				if (blob && ALLOWED_IMAGE_TYPES.includes(blob.type)) {
					const dataTransfer = new DataTransfer();
					dataTransfer.items.add(blob);
					imageInput.files = dataTransfer.files;
					updateImagePreview();
					e.preventDefault();
					break;
				}
			}
		}
	}

	// Strip EXIF metadata from an image using the Canvas API
	function stripExif(file: File): Promise<File> {
		return new Promise((resolve, reject) => {
			const objectUrl = URL.createObjectURL(file);
			const img = new Image();
			img.onload = () => {
				const canvas = document.createElement('canvas');
				canvas.width = img.naturalWidth;
				canvas.height = img.naturalHeight;
				const ctx = canvas.getContext('2d');
				if (!ctx) {
					URL.revokeObjectURL(objectUrl);
					reject(new Error('Could not get canvas context'));
					return;
				}
				ctx.drawImage(img, 0, 0);
				canvas.toBlob(
					(blob) => {
						URL.revokeObjectURL(objectUrl);
						if (blob) {
							resolve(new File([blob], file.name, { type: file.type }));
						} else {
							reject(new Error('Canvas toBlob failed'));
						}
					},
					file.type,
					0.95
				);
			};
			img.onerror = () => {
				URL.revokeObjectURL(objectUrl);
				reject(new Error('Image load failed'));
			};
			img.src = objectUrl;
		});
	}

	async function getPresignedUrl(
		uploadType: string,
		contentType: string,
		fileName: string,
		fileSize: number
	): Promise<{ presignedUrl: string; key: string }> {
		const response = await fetch('/dashboard/upload/presign', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ uploadType, contentType, fileName, fileSize })
		});
		if (!response.ok) {
			throw new Error(`Failed to get presigned URL: ${response.statusText}`);
		}
		return response.json();
	}

	async function uploadToS3(presignedUrl: string, file: File): Promise<void> {
		const response = await fetch(presignedUrl, {
			method: 'PUT',
			headers: { 'Content-Type': file.type },
			body: file
		});
		if (!response.ok) {
			throw new Error(`Upload failed: ${response.statusText}`);
		}
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		if (!formElement) return;

		const imageFile = imageInput?.files?.[0];
		const modelFile = modelInput?.files?.[0];

		if (!imageFile || !modelFile) {
			uploadError = 'Please select both an image and a 3D model file.';
			return;
		}

		formPending = true;
		uploadError = null;

		try {
			// Strip EXIF from image before upload (privacy protection)
			const cleanImage = await stripExif(imageFile);

			// Get presigned URLs and upload both files in parallel
			const [
				{ presignedUrl: imagePresignedUrl, key: imageKey },
				{ presignedUrl: modelPresignedUrl, key: modelKey }
			] = await Promise.all([
				getPresignedUrl('devlog_image', cleanImage.type, cleanImage.name, cleanImage.size),
				getPresignedUrl('devlog_model', modelFile.type, modelFile.name, modelFile.size)
			]);

			await Promise.all([
				uploadToS3(imagePresignedUrl, cleanImage),
				uploadToS3(modelPresignedUrl, modelFile)
			]);

			// Submit form with keys instead of file content
			const submitData = new FormData();
			submitData.set('description', description?.toString() ?? '');
			submitData.set('timeSpent', String(timeSpent));
			submitData.set('imageKey', imageKey);
			submitData.set('modelKey', modelKey);

			const response = await fetch(formElement.action, {
				method: 'POST',
				body: submitData
			});

			const result = deserialize(await response.text());
			await applyAction(result);
		} catch (e) {
			uploadError = e instanceof Error ? e.message : 'Upload failed. Please try again.';
		} finally {
			formPending = false;
		}
	}
</script>

<Head title={data.project.name} />

<h1 class="mt-5 mb-2 font-hero text-3xl font-medium">{data.project.name}</h1>

<div class="flex flex-col gap-3 xl:flex-row">
	<div class="mb-6 grow">
		<p class="text-sm">
			{#if data.projectUser}
				<a href={`/dashboard/users/${data.project.userId}`} class="truncate underline"
					>{data.projectUser.name}</a
				> ∙
			{/if}
			Created
			<abbr title={`${data.project.createdAt.toUTCString()}`}>
				{relativeDate(data.project.createdAt)}
			</abbr>
			∙ Updated
			<abbr title={`${new Date(data.project.updatedAt).toUTCString()}`}>
				{relativeDate(data.project.updatedAt)}
			</abbr>
			∙ {Math.floor(data.project.timeSpent / 60)}h {data.project.timeSpent % 60}min
		</p>
		<p class="mt-0.5">Status: {projectStatuses[data.project.status]}</p>

		<div class="my-2">
			<ProjectLinks
				url={data.project.url}
				editorFileType={data.project.editorFileType}
				editorUrl={data.project.editorUrl}
				uploadedFileUrl={data.project.uploadedFileUrl}
			/>
		</div>

		<p class="mt-2">
			{#each data.project.description?.split('\n') as descriptionSection}
				{descriptionSection}
				<br />
			{/each}
		</p>

		{#if data.project.userId === data.user.id}
			<div class="mt-3 flex gap-2">
				<a
					href={editable ? `/dashboard/projects/${data.project.id}/edit` : null}
					class={`button sm primary ${editable ? '' : 'disabled'}`}
					title={editable ? null : 'Currently locked as the project has been shipped'}
				>
					<SquarePen />
					Edit
				</a>
				<a
					href={editable ? `/dashboard/projects/${data.project.id}/ship` : null}
					class={`button sm orange ${editable ? '' : 'disabled'}`}
					title={editable ? null : 'Currently locked as the project has been shipped'}
				>
					<Ship />
					Ship
				</a>
				<a
					href={editable ? `/dashboard/projects/${data.project.id}/delete` : null}
					class={`button sm dark-red ${editable ? '' : 'disabled'}`}
					title={editable ? null : 'Currently locked as the project has been shipped'}
				>
					<Trash />
					Delete
				</a>
			</div>
		{/if}
	</div>

	{#if data.project.modelFile}
		<div class="max-h-120 min-h-full w-full xl:w-[60%]">
			<Spinny3DPreview
				identifier="project-model"
				modelUrl={data.s3PublicUrl + '/' + data.project.modelFile}
				sizeCutoff={8 * 1024 * 1024}
			/>
		</div>
	{/if}
</div>

{#if data.project.userId === data.user.id}
	<h3 class="mt-1 mb-1 text-xl font-semibold">Add entry</h3>
	{#if !editable}
		<div class="flex gap-1">
			<Lock size={20} />
			<p>Journaling is locked as the project has been shipped</p>
		</div>
	{:else if data.validationConstraints.timeSpent.currentMax >= data.validationConstraints.timeSpent.min}
		<form
			method="POST"
			class="flex flex-col gap-3"
			onpaste={handlePaste}
			bind:this={formElement}
			onsubmit={handleSubmit}
		>
			<div class="flex flex-col gap-2">
				<label class="flex flex-col gap-1">
					Time spent (minutes)
					<div class="flex gap-5">
						<div>
							<input
								name="timeSpent"
								type="number"
								bind:value={timeSpent}
								step="1"
								min={data.validationConstraints.timeSpent.min}
								max={data.validationConstraints.timeSpent.currentMax}
								{onchange}
								class="themed-box w-25 ring-primary-900 placeholder:text-primary-900 active:ring-3"
							/>
						</div>
						<input
							name="timeSpent"
							type="range"
							class="grow accent-primary-500"
							bind:value={timeSpent}
							step="1"
							min="0"
							{onchange}
							max={data.validationConstraints.timeSpent.max}
						/>
					</div>
					<p class="text-sm opacity-50">
						The minimum journal time is {data.validationConstraints.timeSpent.min} minutes, the maximum
						is
						{data.validationConstraints.timeSpent.max ==
						data.validationConstraints.timeSpent.currentMax
							? ''
							: 'currently'}
						{data.validationConstraints.timeSpent.currentMax}
					</p>
				</label>
				<label class="flex flex-col gap-1">
					Description
					<CharCountedTextarea
						name="description"
						placeholder="Describe what you changed"
						bind:value={description}
						min={data.validationConstraints.description.min}
						max={data.validationConstraints.description.max}
					/>
					{#if form?.invalid_description}
						<p class="mt-1 text-sm">
							Invalid description, must be between {data.validationConstraints.description.min} and {data
								.validationConstraints.description.max} characters
						</p>
					{/if}
				</label>
				<div class="mt-1 flex flex-row gap-2">
					<label class="flex grow flex-col gap-1">
						Image
						<div
							class="themed-box flex flex-col items-center p-1 outline-primary-900 focus-within:outline-1"
						>
							<input
								bind:this={imageInput}
								type="file"
								name="image"
								accept={ALLOWED_IMAGE_TYPES.join(', ')}
								class="w-full outline-0"
								onchange={updateImagePreview}
							/>
							{#if imagePreviewUrl}
								<img
									src={imagePreviewUrl}
									alt="Preview"
									class="mt-2 max-h-32 max-w-full rounded object-contain"
								/>
							{/if}
						</div>
						{#if form?.invalid_image_file}
							<p class="mt-1 text-sm">
								Invalid file, must be a PNG or JPEG file under {MAX_UPLOAD_SIZE / 1024 / 1024} MiB
							</p>
						{:else}
							<p class="mt-1 text-sm opacity-50">
								Must be a PNG or JPEG file under {MAX_UPLOAD_SIZE / 1024 / 1024} MiB
							</p>
						{/if}
					</label>
					<label class="flex grow flex-col gap-1">
						3D model
						<input
							bind:this={modelInput}
							type="file"
							name="model"
							accept={ALLOWED_MODEL_EXTS.join(', ')}
							class="themed-box p-1 outline-primary-900 focus:outline-1"
						/>
						{#if form?.invalid_model_file}
							<p class="mt-1 text-sm">
								Invalid file, must be a STL, 3MF or OBJ file under {MAX_UPLOAD_SIZE / 1024 / 1024} MiB
							</p>
						{:else}
							<p class="mt-1 text-sm opacity-50">
								Must be a STL, 3MF (recommended) or OBJ file under {MAX_UPLOAD_SIZE / 1024 / 1024} MiB
							</p>
						{/if}
					</label>
				</div>
			</div>
			{#if uploadError}
				<p class="text-sm text-red-500">{uploadError}</p>
			{/if}
			{#if formPending}
				<p class="text-sm opacity-70">Uploading files, please wait…</p>
			{/if}
			<button type="submit" class="button md primary" disabled={formPending}
				>Add journal entry!</button
			>
		</form>
	{:else}
		<p>
			You must work for at least {data.validationConstraints.timeSpent.min -
				data.validationConstraints.timeSpent.currentMax} more minutes to journal! [insert orpheus drawing]
		</p>
	{/if}
{/if}

<div class="mt-6 mb-5 flex flex-col gap-3">
	<div>
		<h2 class="text-2xl font-semibold">Journal entries</h2>
		{#if data.devlogs.length > 0}
			<div class="mt-1.5 flex">
				<select
					bind:value={sortDropdownValue}
					class="themed-box fill-primary-50 text-sm ring-primary-900 placeholder:text-primary-900 active:ring-3"
				>
					<option value="descending">New to old</option>
					<option value="ascending">Old to new</option>
				</select>
			</div>
		{/if}
	</div>

	{#if data.devlogs.length == 0}
		<div>
			No journal entries yet <img
				src="https://emoji.slack-edge.com/T0266FRGM/heavysob/55bf09f6c9d93d08.png"
				alt="heavysob"
				class="inline h-5.5"
			/>
		</div>
	{:else}
		{#each sortDevlogsAscending ? [...data.devlogs].reverse() : data.devlogs as devlog}
			<Devlog
				{devlog}
				projectId={data.project.id}
				showModifyButtons={data.project.userId == data.user.id}
				allowDelete={editable}
			/>
		{/each}
	{/if}
</div>
