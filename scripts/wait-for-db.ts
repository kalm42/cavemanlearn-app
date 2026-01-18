#!/usr/bin/env tsx
/**
 * Waits for the PostgreSQL database container to be healthy.
 * Polls Docker Compose health status until the database is ready.
 */

import { execSync } from 'node:child_process';

const MAX_ATTEMPTS = 30;
const POLL_INTERVAL_MS = 1000;
const SERVICE_NAME = 'db';

function checkDatabaseHealth(): boolean {
	try {
		// Try to get container name from docker compose
		const psOutput = execSync(
			`docker compose ps ${SERVICE_NAME} --format json`,
			{ encoding: 'utf-8', stdio: 'pipe' },
		);
		
		const lines = psOutput.trim().split('\n').filter(Boolean);
		if (lines.length === 0) {
			return false;
		}

		// Parse JSON output (one JSON object per line)
		for (const line of lines) {
			const container = JSON.parse(line) as {
				Service?: string;
				Name?: string;
				Health?: string;
			};
			if (container.Service === SERVICE_NAME || container.Name?.includes(SERVICE_NAME)) {
				// Check if health status is healthy
				if (container.Health === 'healthy') {
					return true;
				}
				// If container exists but healthcheck hasn't started yet, check via docker inspect
				if (container.Name) {
					return checkContainerHealthDirectly(container.Name);
				}
			}
		}
		
		return false;
	} catch {
		// Fallback: try to check container health directly by container name
		try {
			return checkContainerHealthDirectly('cavemanlearn-db');
		} catch {
			return false;
		}
	}
}

function checkContainerHealthDirectly(containerName: string): boolean {
	try {
		const inspectOutput = execSync(
			`docker inspect ${containerName} --format '{{.State.Health.Status}}'`,
			{ encoding: 'utf-8', stdio: 'pipe' },
		);
		return inspectOutput.trim() === 'healthy';
	} catch {
		return false;
	}
}

async function waitForDatabase(): Promise<void> {
	console.log(`Waiting for database service "${SERVICE_NAME}" to be healthy...`);
	
	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
		if (checkDatabaseHealth()) {
			console.log(`Database is healthy!`);
			process.exit(0);
		}
		
		if (attempt < MAX_ATTEMPTS) {
			process.stdout.write(`Attempt ${String(attempt)}/${String(MAX_ATTEMPTS)}...\r`);
			// Sleep for POLL_INTERVAL_MS
			await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
		}
	}
	
	const timeoutSeconds = String((MAX_ATTEMPTS * POLL_INTERVAL_MS) / 1000);
	console.error(`\nError: Database did not become healthy within ${timeoutSeconds} seconds`);
	process.exit(1);
}

waitForDatabase().catch((error: unknown) => {
	console.error('Error waiting for database:', error);
	process.exit(1);
});
