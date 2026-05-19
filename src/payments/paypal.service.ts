import {
  Injectable,
  BadGatewayException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlanDetails, PLAN_CATALOGUE } from './plans.catalogue';

@Injectable()
export class PaypalService {
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.getOrThrow<string>('PAYPAL_CLIENT_ID');
    this.clientSecret = this.configService.getOrThrow<string>(
      'PAYPAL_CLIENT_SECRET',
    );
    const mode = this.configService.get<string>('PAYPAL_MODE', 'sandbox');
    this.baseUrl =
      mode === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';
  }

  private async getAccessToken(): Promise<string> {
    const credentials = Buffer.from(
      `${this.clientId}:${this.clientSecret}`,
    ).toString('base64');

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });
    } catch {
      throw new BadGatewayException('PayPal API unreachable');
    }

    if (!response.ok) {
      throw new BadGatewayException('PayPal authentication failed');
    }

    const data = (await response.json()) as { access_token: string };
    return data.access_token;
  }

  async createOrder(planId: string, plan: PlanDetails): Promise<string> {
    const accessToken = await this.getAccessToken();

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [
            {
              amount: {
                currency_code: plan.currency,
                value: plan.amount.toFixed(2),
              },
              description: plan.description,
              custom_id: planId,
            },
          ],
        }),
      });
    } catch {
      throw new BadGatewayException('PayPal API unreachable');
    }

    if (!response.ok) {
      throw new BadGatewayException('PayPal order creation failed');
    }

    const data = (await response.json()) as { id: string };
    return data.id;
  }

  async captureOrderById(orderId: string): Promise<{
    providerReference: string;
    amount: number;
    currency: string;
    planKey: string | null;
  }> {
    const accessToken = await this.getAccessToken();

    let response: Response;
    try {
      response = await fetch(
        `${this.baseUrl}/v2/checkout/orders/${orderId}/capture`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch {
      throw new BadGatewayException('PayPal API unreachable');
    }

    if (response.status === 422 || response.status === 400) {
      throw new BadRequestException(
        'PayPal order not found or already captured',
      );
    }

    if (!response.ok) {
      throw new BadGatewayException('PayPal capture failed');
    }

    const data = (await response.json()) as {
      purchase_units: Array<{
        custom_id?: string;
        payments: {
          captures: Array<{
            id: string;
            custom_id?: string;
            amount: { value: string; currency_code: string };
          }>;
        };
      }>;
    };

    const unit = data.purchase_units?.[0];
    const capture = unit?.payments?.captures?.[0];
    if (!capture) {
      throw new BadGatewayException('Unexpected PayPal capture response');
    }

    const capturedAmount = parseFloat(capture.amount.value);
    const capturedCurrency = capture.amount.currency_code;

    // custom_id is set at order creation on the purchase_unit level but PayPal
    // echoes it on the individual capture item in the capture response.
    const planId = capture.custom_id ?? unit.custom_id ?? null;
    if (planId) {
      const expectedPlan = PLAN_CATALOGUE[planId];
      if (expectedPlan) {
        if (
          Math.abs(capturedAmount - expectedPlan.amount) > 0.01 ||
          capturedCurrency.toUpperCase() !== expectedPlan.currency.toUpperCase()
        ) {
          throw new UnprocessableEntityException(
            'Captured amount does not match expected plan price',
          );
        }
      }
    }

    return {
      providerReference: capture.id,
      amount: capturedAmount,
      currency: capturedCurrency,
      planKey: planId ?? null,
    };
  }
}
