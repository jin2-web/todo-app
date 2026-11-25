import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/current';
import { handleRouteError } from '@/lib/http';
import { getDashboard } from '@/services/dashboardService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  try {
    await requireApiUser(request);
    return NextResponse.json(await getDashboard());
  } catch (error) {
    return handleRouteError(error);
  }
}
