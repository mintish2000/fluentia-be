import { registerAs } from '@nestjs/config';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { PaypalConfig } from './paypal-config.type';

enum PaypalMode {
  Sandbox = 'sandbox',
  Live = 'live',
}

class EnvironmentVariablesValidator {
  @IsString()
  @IsOptional()
  PAYPAL_CLIENT_ID?: string;

  @IsString()
  @IsOptional()
  PAYPAL_CLIENT_SECRET?: string;

  @IsEnum(PaypalMode)
  @IsOptional()
  PAYPAL_MODE?: PaypalMode;
}

export default registerAs<PaypalConfig>('paypal', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    clientId: process.env.PAYPAL_CLIENT_ID,
    clientSecret: process.env.PAYPAL_CLIENT_SECRET,
    mode: (process.env.PAYPAL_MODE as PaypalConfig['mode']) || 'sandbox',
  };
});
