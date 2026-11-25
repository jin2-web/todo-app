/**
 * Assigns todos created before GitHub login existed to one user.
 *
 *   npm run migrate:todo-owner -- --username <github-login> --dry-run   # count only
 *   npm run migrate:todo-owner -- --username <github-login>             # apply
 *
 * Reads MONGODB_URI from .env / .env.local like Next.js does.
 */
import { loadEnvConfig } from '@next/env';
import { disconnectFromDatabase } from '@/lib/db';
import { getErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { assignUnownedTodos } from '@/migrations/assignTodoOwner';

interface CliArgs {
  username: string | null;
  dryRun: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const usernameIndex = argv.indexOf('--username');
  return {
    username: usernameIndex >= 0 ? (argv[usernameIndex + 1] ?? null) : null,
    dryRun: argv.includes('--dry-run'),
  };
}

async function main(): Promise<number> {
  loadEnvConfig(process.cwd());
  const args = parseArgs(process.argv.slice(2));
  if (!args.username) {
    logger.error('Usage: npm run migrate:todo-owner -- --username <github-login> [--dry-run]');
    return 1;
  }
  try {
    const result = await assignUnownedTodos(args.username, { dryRun: args.dryRun });
    logger.info(args.dryRun ? 'Dry run: no changes written' : 'Migration applied', { ...result });
    return 0;
  } catch (error) {
    logger.error('Migration failed', { message: getErrorMessage(error) });
    return 1;
  } finally {
    await disconnectFromDatabase();
  }
}

main().then(function exit(code) {
  process.exit(code);
});
