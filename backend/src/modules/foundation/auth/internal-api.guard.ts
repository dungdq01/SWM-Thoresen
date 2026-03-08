import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class InternalApiGuard implements CanActivate {
  private readonly validApiKeys: string[];

  constructor() {
    const apiKey = process.env.INTERNAL_API_KEY;
    this.validApiKeys = apiKey ? [apiKey] : ['internal-service-key'];
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-internal-api-key'];

    if (!apiKey || !this.validApiKeys.includes(apiKey)) {
      throw new UnauthorizedException('Invalid or missing internal API key');
    }

    return true;
  }
}
