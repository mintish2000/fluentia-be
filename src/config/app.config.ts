import { registerAs } from '@nestjs/config';
import { AppConfig } from './app-config.type';
import validateConfig from '.././utils/validate-config';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

const RAILWAY_PRODUCTION_URL = 'https://web-production-a2b41.up.railway.app';

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

class EnvironmentVariablesValidator {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV?: Environment;

  @IsInt()
  @Min(0)
  @Max(65535)
  @IsOptional()
  APP_PORT?: number;

  @IsUrl({ require_tld: false })
  @IsOptional()
  FRONTEND_DOMAIN?: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  BACKEND_DOMAIN?: string;

  @IsString()
  @IsOptional()
  API_PREFIX?: string;

  @IsString()
  @IsOptional()
  APP_FALLBACK_LANGUAGE?: string;

  @IsString()
  @IsOptional()
  APP_HEADER_LANGUAGE?: string;
}

export default registerAs<AppConfig>('app', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === Environment.Production;
  const productionBaseUrl = normalizeBaseUrl(RAILWAY_PRODUCTION_URL);
  const frontendDomain =
    process.env.FRONTEND_DOMAIN ??
    (isProduction ? productionBaseUrl : 'http://localhost:3000');
  const backendDomain =
    process.env.BACKEND_DOMAIN ??
    (isProduction ? productionBaseUrl : 'http://localhost');

  return {
    nodeEnv,
    name: process.env.APP_NAME || 'app',
    workingDirectory: process.env.PWD || process.cwd(),
    frontendDomain,
    backendDomain,
    port: process.env.PORT
      ? parseInt(process.env.PORT, 10)
      : process.env.APP_PORT
        ? parseInt(process.env.APP_PORT, 10)
        : 3000,
    apiPrefix: process.env.API_PREFIX || 'api',
    fallbackLanguage: process.env.APP_FALLBACK_LANGUAGE || 'en',
    headerLanguage: process.env.APP_HEADER_LANGUAGE || 'x-custom-lang',
  };
});
