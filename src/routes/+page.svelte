<script lang="ts">
	import OrpheusFlag from '../lib/components/OrpheusFlag.svelte';

	import Button from '$lib/components/Button.svelte';
	import Accordion from '$lib/components/Accordion.svelte';
	import Rules from './Rules.svelte';
	import Footer from './Footer.svelte';

	import keyringModel from '$lib/assets/keyring.3mf?url';
	import sticker1Image from '$lib/assets/sticker1.png';
	import sticker2Image from '$lib/assets/sticker2.png';

	let { data } = $props();

	import { onMount } from 'svelte';
	import Head from '$lib/components/Head.svelte';
	import Spinny3DPreview from '$lib/components/Spinny3DPreview.svelte';

	let showStickersSection = $state(false);

	onMount(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const ref = urlParams.get('ref');

		if (ref) {
			document.cookie = 'ref=' + ref + '; path=/';
		}
	});
</script>

<Head title="" />

{#if !showStickersSection}
	<button
		class="button md primary absolute top-4 right-4 z-50 animate-[bounce_2s_infinite]"
		onclick={() => {
			showStickersSection = !showStickersSection;
		}}
	>
		Free stickers + keyring!
	</button>
{/if}

{#if showStickersSection}
	<div
		class="fixed inset-0 z-1000 flex items-center justify-center bg-black/70 p-4"
		role="dialog"
		aria-modal="true"
		tabindex="0"
		onclick={(e) => {
			if (e.target === e.currentTarget) {
				showStickersSection = false;
			}
		}}
		onkeydown={(e) => e.key === 'Escape' && (showStickersSection = false)}
	>
		<div
			class="relative max-h-[95vh] w-full max-w-5xl overflow-y-auto rounded-lg border-3 border-primary-900 bg-primary-950 p-8 shadow-2xl"
			role="document"
			tabindex="-1"
		>
			<button
				class="button md primary absolute top-4 right-4 z-10"
				onclick={() => (showStickersSection = false)}
				aria-label="Close dialog"
			>
				Close
			</button>

			<div class="mx-auto max-w-4xl">
				<div class="mb-8 text-center">
					<h2 class="mb-2 text-2xl font-bold sm:text-3xl">Free swag with your first submission</h2>
					<p class="text-lg font-medium text-primary-300">
						Ship a project, get exclusive Layered goodies
					</p>
				</div>

				<div class="grid gap-6 sm:grid-cols-2">
					<div class="themed-box p-6">
						<div
							class="mb-4 flex h-56 items-center justify-center gap-3 overflow-hidden rounded-lg border-2 border-primary-900 bg-primary-900"
						>
							<img
								src={sticker1Image}
								alt="Layered sticker 1"
								class="h-40 w-40 animate-[spin_20s_linear_infinite] object-contain"
								style="animation-direction: normal;"
							/>
							<img
								src={sticker2Image}
								alt="Layered sticker 2"
								class="h-40 w-40 animate-[spin_20s_linear_infinite] object-contain"
								style="animation-direction: reverse;"
							/>
						</div>
						<div class="text-center">
							<h3 class="mb-2 text-xl font-bold">Sticker Pack</h3>
							<p class="text-sm text-primary-300">yay stickers!!!</p>
						</div>
					</div>

					<div class="themed-box p-6">
						<div
							class="mb-4 flex h-56 items-center justify-center overflow-hidden rounded-lg border-2 border-primary-900 bg-primary-900"
						>
							<Spinny3DPreview
								identifier="keyring"
								modelUrl={keyringModel}
								sizeCutoff={8 * 1024 * 1024}
								respectLocalStorage={false}
							/>
						</div>
						<div class="text-center">
							<h3 class="mb-2 text-xl font-bold">Layered Keyring</h3>
							<p class="text-sm text-primary-300">
								even more yay keyring
								<img
									src="https://emoji.slack-edge.com/T09V59WQY1E/yayayayayay/203666b7424ee7a7.gif"
									alt="yay"
									class="inline h-6"
								/>
							</p>
						</div>
					</div>
				</div>

				<div class="themed-box mt-6 p-6 text-center">
					<p class="font-medium">Ship your first project and we'll mail these to you!</p>
				</div>
			</div>
		</div>
	</div>
{/if}

<OrpheusFlag />

<div class="flex w-full flex-col items-center justify-center px-10 lg:flex-row">
	<div class="mt-30">
		<div class="relative z-1 flex flex-row">
			<a
				class="mb-1 flex h-7 shrink flex-row items-center gap-2 pr-2 transition-opacity hover:opacity-50"
				href="https://hackclub.com"
			>
				<img src="https://assets.hackclub.com/icon-rounded.svg" alt="Hack Club logo" class="h-7" />
				<p class="text-lg font-semibold">
					<span class="font-bold text-hc-red-500">Hack Club</span> presents...
				</p>
			</a>
		</div>
		<div class="mb-6 hidden sm:block">
			<div
				class="themed-box-solid-prominent flex h-36 w-full items-center justify-center rounded-2xl px-6 text-center text-4xl font-black uppercase tracking-wider md:h-40 md:text-5xl"
			>
				Layered Logo Here
			</div>
		</div>
		<div
			class="themed-box-solid-prominent mt-3 mb-6 flex h-26 items-center justify-center rounded-2xl text-center text-3xl font-black uppercase tracking-wide sm:hidden"
		>
			Layered Logo Here
		</div>
		<div class="relative z-1 w-full text-center">
			<p class="my-3 text-xl font-medium">Spend 40 hours doing CAD projects, get a 3D printer!</p>
			{#if data.loggedIn}
				<Button text="Go to dashboard" href="/dashboard" />
			{:else}
				<Button text="Login with Hack Club" href="/auth/idv" />
			{/if}
			<p class="text-md my-3">Ages 13-18, ending April 19th!</p>
		</div>
	</div>
</div>

<div class="mt-24 flex flex-col items-center justify-center px-10">
	<h1 class="mb-3 text-center text-3xl font-bold sm:text-4xl">What is this?</h1>
	<div class="w-full max-w-2xl">
		<p class="mt-3 max-w-2xl">
			<strong>Want a 3D printer?</strong> Spend 40 hours doing CAD projects, get a free 3D printer of
			your choice!
		</p>
	</div>
</div>

<!-- <Shop /> -->

<Rules idvDomain={data.idvDomain} />

<div class="mt-20 flex flex-col items-center justify-center px-10">
	<h1 class="mb-3 text-center text-2xl font-bold sm:text-4xl">Frequently asked questions</h1>
	<div class="w-full max-w-2xl">
		<Accordion text="Is this free?">
			<p>
				Yes! This program is entirely funded by <a href="https://hackclub.com" class="underline">
					Hack Club
				</a>, a US-based 501(c)(3) charity helping teens learn how to design and code, with sponsors
				such as <a href="https://github.com" class="underline">GitHub</a>.
			</p>
		</Accordion>
		<Accordion text="What can I make?">
			<p>
				Any reasonable CAD project is fine, get creative! However, you must use one of the <a
					href="/approved-editors"
					class="underline">approved editors</a
				>.
			</p>
		</Accordion>
		<Accordion text="What are the requirements to get a 3D printer?">
			<p>You must ship at least 40 hours' worth of projects by the end of the event.</p>
		</Accordion>
		<Accordion text="What are the requirements to participate?">
			<p>
				You must be between the ages 13-18 and have verified your identity on our <a
					href={`https://${data.idvDomain}`}
					class="underline"
				>
					identity platform
				</a>.
			</p>
		</Accordion>
	</div>
</div>

<div class="mt-15 mb-30 flex flex-col items-center justify-center gap-5 px-10">
	<h1 class="text-center text-3xl font-bold sm:text-4xl">Ready?</h1>
	<div class="w-full max-w-2xl text-center">
		{#if data.loggedIn}
			<Button text="Go to dashboard" href="/dashboard" />
		{:else}
			<Button text="Login with Hack Club" href="/auth/idv" />
		{/if}
	</div>
</div>

<Footer />
