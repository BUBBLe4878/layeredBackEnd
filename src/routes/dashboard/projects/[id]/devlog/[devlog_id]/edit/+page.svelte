<script lang="ts">
	import { enhance } from '$app/forms';
	import CharCountedTextarea from '$lib/components/CharCountedTextarea.svelte';
	import Devlog from '$lib/components/Devlog.svelte';
	import Head from '$lib/components/Head.svelte';
	import type { PageProps } from './$types';

	let { data, form, params }: PageProps = $props();

	let description = $state(form?.fields?.description ?? data.devlog.description);

	let formPending = $state(false);
</script>

<Head title="Edit journal log" />

<h1 class="mt-5 mb-3 font-hero text-2xl font-medium">Edit journal log</h1>
<Devlog
	devlog={{ ...data.devlog, description: description }}
	showModifyButtons={false}
	projectId={params.id}
/>
<p class="mt-3 text-sm">
	You can't update anything other than the description, if you want to change the time, image or 3D
	model then delete and recreate the journal entry.
</p>
<form
	method="POST"
	class="flex flex-col gap-3"
	use:enhance={() => {
		formPending = true;
		return async ({ update }) => {
			await update();
			formPending = false;
		};
	}}
>
	<div class="mt-1 flex flex-col gap-2">
		<label class="flex flex-col gap-1">
			Description
			<CharCountedTextarea
				name="description"
				placeholder="Describe what you changed"
				bind:value={description}
				min={data.validationConstraints.description.min}
				max={data.validationConstraints.description.max}
			/>
		</label>
		{#if form?.invalid_description}
			<p class="mt-1 text-sm">Invalid description, must be between 20 and 1000 characters</p>
		{/if}
	</div>
	<button type="submit" class="button md primary" disabled={formPending}
		>Update journal entry</button
	>
</form>
