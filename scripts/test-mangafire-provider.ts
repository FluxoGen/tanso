/**
 * Test MangaFire Provider
 * Run with: npx tsx scripts/test-mangafire-provider.ts
 */

import { mangafire } from '../src/providers/mangafire';

async function runTests() {
	console.log('🧪 MangaFire Provider Tests\n');
	console.log('='.repeat(60));

	const results: Record<string, { success: boolean; message: string; data?: unknown }> = {};

	// Test 1: Health Check
	console.log('\n📡 Test 1: Health Check');
	try {
		const health = await mangafire.healthCheck();
		results.healthCheck = {
			success: health.healthy,
			message: health.message ?? `Healthy, latency: ${health.latency}ms`,
			data: health,
		};
		console.log(`   ${health.healthy ? '✅' : '❌'} ${results.healthCheck.message}`);
	} catch (e) {
		results.healthCheck = { success: false, message: (e as Error).message };
		console.log(`   ❌ ${results.healthCheck.message}`);
	}

	// Test 2: Browse (Popular Manga)
	console.log('\n📡 Test 2: Browse Popular Manga');
	try {
		const browse = await mangafire.browse({ sort: 'popular', page: 1 });
		results.browse = {
			success: browse.data.length > 0,
			message: `Found ${browse.data.length} manga (page ${browse.page}/${browse.totalPages})`,
			data: browse.data.slice(0, 3).map((m) => ({ title: m.title, id: m.id })),
		};
		console.log(`   ✅ ${results.browse.message}`);
		console.log(`   Sample: ${browse.data.slice(0, 3).map((m) => m.title).join(', ')}`);
	} catch (e) {
		results.browse = { success: false, message: (e as Error).message };
		console.log(`   ❌ ${results.browse.message}`);
	}

	// Test 3: Get Chapters (One Piece)
	console.log('\n📡 Test 3: Get Chapters for One Piece');
	try {
		const chapters = await mangafire.getChapters('one-piecee.dkw');
		results.chapters = {
			success: chapters.length > 0,
			message: `Found ${chapters.length} chapters`,
			data: chapters.slice(0, 3).map((c) => ({ number: c.number, title: c.title })),
		};
		console.log(`   ✅ ${results.chapters.message}`);
		console.log(`   Latest: Chapter ${chapters[0]?.number}: ${chapters[0]?.title ?? 'No title'}`);
	} catch (e) {
		results.chapters = { success: false, message: (e as Error).message };
		console.log(`   ❌ ${results.chapters.message}`);
	}

	// Test 4: Search (filter with keyword)
	console.log('\n📡 Test 4: Search for "naruto"');
	try {
		const search = await mangafire.search({ query: 'naruto' });
		results.search = {
			success: search.data.length > 0,
			message: `Found ${search.data.length} results`,
			data: search.data.slice(0, 3).map((m) => ({ title: m.title, id: m.id })),
		};
		console.log(`   ✅ ${results.search.message}`);
		console.log(`   Results: ${search.data.slice(0, 3).map((m) => m.title).join(', ')}`);
	} catch (e) {
		const error = e as { code?: string; message: string };
		results.search = {
			success: false,
			message: error.code === 'VRF_REQUIRED' ? 'VRF required (expected)' : error.message,
		};
		console.log(`   ⚠️ ${results.search.message}`);
	}

	// Test 5: Get Manga Details
	console.log('\n📡 Test 5: Get Manga Details (One Piece)');
	try {
		const details = await mangafire.getMangaDetails('one-piecee.dkw');
		results.details = {
			success: !!details.title,
			message: `Got details for "${details.title}"`,
			data: {
				title: details.title,
				status: details.status,
				author: details.author,
				genres: details.genres?.slice(0, 5),
			},
		};
		console.log(`   ✅ ${results.details.message}`);
		console.log(`   Status: ${details.status}, Author: ${details.author}`);
	} catch (e) {
		results.details = { success: false, message: (e as Error).message };
		console.log(`   ❌ ${results.details.message}`);
	}

	// Test 6: Get Chapter Pages (expect VRF error)
	console.log('\n📡 Test 6: Get Chapter Pages');
	try {
		const pages = await mangafire.getChapterPages('one-piecee.dkw:1175');
		results.pages = {
			success: pages.pages.length > 0,
			message: `Got ${pages.pages.length} pages`,
			data: pages.pages.slice(0, 3),
		};
		console.log(`   ✅ ${results.pages.message}`);
	} catch (e) {
		const error = e as { code?: string; message: string };
		results.pages = {
			success: false,
			message: error.code === 'VRF_REQUIRED' ? 'VRF required (expected - needs Playwright)' : error.message,
		};
		console.log(`   ⚠️ ${results.pages.message}`);
	}

	// Summary
	console.log('\n' + '='.repeat(60));
	console.log('📊 TEST SUMMARY');
	console.log('='.repeat(60));

	const passed = Object.values(results).filter((r) => r.success).length;
	const vrfRequired = Object.values(results).filter(
		(r) => !r.success && r.message.includes('VRF')
	).length;
	const failed = Object.values(results).filter(
		(r) => !r.success && !r.message.includes('VRF')
	).length;

	console.log(`\n✅ Passed: ${passed}`);
	console.log(`⚠️  VRF Required (expected): ${vrfRequired}`);
	console.log(`❌ Failed: ${failed}`);

	console.log('\n📋 Detailed Results:');
	for (const [test, result] of Object.entries(results)) {
		const icon = result.success ? '✅' : result.message.includes('VRF') ? '⚠️' : '❌';
		console.log(`   ${icon} ${test}: ${result.message}`);
	}

	console.log('\n💡 CONCLUSION:');
	if (passed >= 3 && failed === 0) {
		console.log('   ✅ MangaFire provider is working!');
		console.log('   → Browse, chapter lists, and details work without VRF');
		console.log('   → Search with keyword and chapter pages need Playwright (VRF protected)');
	} else {
		console.log('   ⚠️ Some issues detected. Check the failed tests above.');
	}
}

runTests().catch(console.error);
