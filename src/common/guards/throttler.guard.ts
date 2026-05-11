import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req.user as Record<string, unknown> | undefined;
    if (user && typeof user.sub === 'string') {
      return user.sub;
    }
    return (req.ip as string) || 'unknown';
  }
}