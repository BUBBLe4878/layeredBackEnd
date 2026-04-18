<script lang="ts">
	import { enhance } from '$app/forms';
	import Devlog from '$lib/components/Devlog.svelte';
	import Head from '$lib/components/Head.svelte';
	import type { PageProps } from './$types';
	import { Trash } from '@lucide/svelte';

	let { data, params }: PageProps = $props();

	let formPending = $state(false);
</script>

<Head title="Delete journal log" />

<h1 class="mt-5 mb-3 font-hero text-2xl font-medium">Delete journal log</h1>
<Devlog devlog={data.devlog} showModifyButtons={false} projectId={params.id} />
<p class="mt-3">Are you sure you want to delete this journal log? You can't undo this action.</p>
<form
	method="POST"
	class="mt-2 flex flex-row gap-2"
	use:enhance={() => {
		formPending = true;
		return async ({ update }) => {
			await update();
			formPending = false;
		};
	}}
>
	<a href={`/dashboard/projects/${data.devlog.id}`} class="button sm primary"> Cancel </a>
	<button class="button sm red" disabled={formPending}>
		<Trash />
		Delete
	</button>
</form>
